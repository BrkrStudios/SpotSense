"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Header from "@/components/layout/Header";
import ParkingLotGrid from "@/components/parking-map/ParkingLotGrid";
import SpotDetailPanel from "@/components/parking-map/SpotDetailPanel";
import MapControls from "@/components/parking-map/MapControls";
import { useServerTime } from "@/hooks/useServerTime";
import { useLiveParkingData } from "@/hooks/useLiveParkingData";
import { positionForSpotNumber } from "@/lib/utils";
import { SPOT_WIDTH, SPOT_HEIGHT, LANE_HEIGHT, SPOTS_PER_ROW, COLORS, AISLES, ROAD_WIDTH } from "@/lib/constants";

export default function ParkingMapPage() {
  const serverTime = useServerTime();
  const { data, stats } = useLiveParkingData(serverTime);
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const mapWidth = ROAD_WIDTH + SPOTS_PER_ROW * SPOT_WIDTH + ROAD_WIDTH;
  // Calculate map height from aisle structure + top grass lane
  const mapHeight = LANE_HEIGHT + AISLES.reduce((h, aisle) => {
    h += SPOT_HEIGHT; // top row
    if (aisle.bottom !== null) h += SPOT_HEIGHT; // bottom row
    if (aisle.lane !== null) h += LANE_HEIGHT; // driving lane
    return h;
  }, 0);

  const handleZoomIn = () => setScale((s) => Math.min(s * 1.3, 5));
  const handleZoomOut = () => setScale((s) => Math.max(s / 1.3, 0.5));
  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleSearchSpot = (spotId: number) => {
    setSelectedSpotId(spotId);
    const pos = positionForSpotNumber(spotId);
    if (!pos || !containerRef.current) return;

    // Calculate spot center in map coordinates (offset by left road column)
    const spotCenterX = ROAD_WIDTH + pos.col * SPOT_WIDTH + SPOT_WIDTH / 2;
    // Calculate Y position through aisles (offset by top grass lane)
    let spotCenterY = LANE_HEIGHT;
    let found = false;
    for (const aisle of AISLES) {
      if (pos.row === aisle.top) {
        spotCenterY += SPOT_HEIGHT / 2;
        found = true;
        break;
      }
      spotCenterY += SPOT_HEIGHT;
      if (aisle.bottom !== null) {
        if (pos.row === aisle.bottom) {
          spotCenterY += SPOT_HEIGHT / 2;
          found = true;
          break;
        }
        spotCenterY += SPOT_HEIGHT;
      }
      if (aisle.lane !== null) spotCenterY += LANE_HEIGHT;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const targetScale = 2.5;
    setScale(targetScale);
    setOffset({
      x: containerRect.width / 2 - spotCenterX * targetScale,
      y: containerRect.height / 2 - spotCenterY * targetScale,
    });
  };

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((s) => Math.min(Math.max(s * delta, 0.5), 5));
    },
    []
  );

  // Pan via mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };
  const handleMouseUp = () => setIsDragging(false);

  const selectedSpot = selectedSpotId
    ? (() => {
        const pos = positionForSpotNumber(selectedSpotId);
        if (!pos) return null;
        return data.grid[pos.row][pos.col];
      })()
    : null;

  return (
    <div className="h-screen flex flex-col">
      <Header title="Parking Map" subtitle="Parking Lot 3 — Live View" />

      <div className="flex-1 flex overflow-hidden">
        {/* Map area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Stat circles overlay */}
          <div className="absolute top-4 left-4 flex gap-3 z-10">
            <StatCircle
              value={stats.available}
              color={COLORS.available}
              label="Available"
            />
            <StatCircle
              value={stats.occupied}
              color={COLORS.occupied}
              label="Occupied"
            />
            <StatCircle
              value={stats.handicapAvailable}
              color={COLORS.handicap}
              label="Handicap"
            />
          </div>

          <MapControls
            scale={scale}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
            onSearchSpot={handleSearchSpot}
          />

          {/* Legend */}
          <div
            className="absolute bottom-4 left-4 flex gap-4 px-4 py-2 rounded-lg z-10"
            style={{ backgroundColor: "var(--sidebar)" }}
          >
            <LegendItem color={COLORS.available} label="Available" />
            <LegendItem color={COLORS.occupied} label="Occupied" />
            <LegendItem color={COLORS.handicap} label="Handicap" />
          </div>

          {/* Zoomable/pannable container */}
          <div
            ref={containerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: COLORS.asphalt }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="transition-transform duration-100"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "0 0",
                width: mapWidth,
                height: mapHeight,
              }}
            >
              <ParkingLotGrid
                grid={data.grid}
                selectedSpotId={selectedSpotId}
                onSpotClick={setSelectedSpotId}
              />
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selectedSpotId && selectedSpot && (
          <SpotDetailPanel
            spotId={selectedSpotId}
            spot={selectedSpot}
            sensor={data.sensors[selectedSpotId] ?? null}
            onClose={() => setSelectedSpotId(null)}
          />
        )}
      </div>
    </div>
  );
}

function StatCircle({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg"
        style={{ backgroundColor: color, opacity: 0.85 }}
      >
        <span className="text-xl font-bold text-white tabular-nums">
          {value}
        </span>
      </div>
      <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-3 h-3 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
    </div>
  );
}
