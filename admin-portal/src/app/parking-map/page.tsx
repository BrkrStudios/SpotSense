"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Header from "@/components/layout/Header";
import ParkingLotGrid from "@/components/parking-map/ParkingLotGrid";
import SpotDetailPanel from "@/components/parking-map/SpotDetailPanel";
import MapControls from "@/components/parking-map/MapControls";
import { useParkingData } from "@/context/ParkingDataContext";
import { positionForSpotNumber } from "@/lib/utils";
import { SPOT_WIDTH, SPOT_HEIGHT, LANE_HEIGHT, SPOTS_PER_ROW, COLORS, AISLES, ROAD_WIDTH } from "@/lib/constants";

export default function ParkingMapPage() {
  const { data, stats, heatmapData } = useParkingData();
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Pan/zoom fast path.
   *
   * The 283-spot grid (SVG + hundreds of divs) is expensive to re-render.
   * If we `setOffset()` on every mousemove, we pay a full React reconciliation
   * at ~60 Hz and the map visibly stutters — especially when the 3 s parking
   * data poll arrives mid-drag.
   *
   * Instead we write the transform directly to the DOM via `transformRef`
   * while dragging, and only sync the final offset back to React state on
   * mouseup. rAF-throttled so we never queue more than one update per frame.
   */
  const transformRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const scaleRef = useRef(1);

  // Keep the transform DOM-synced whenever committed state changes
  // (zoom buttons, fly-to-spot, reset). Also mirror scale to a ref so the
  // imperative drag path always uses the latest zoom level.
  useEffect(() => {
    scaleRef.current = scale;
    if (transformRef.current) {
      transformRef.current.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${scale})`;
    }
  }, [offset, scale]);

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

  // --- Pan via mouse drag (imperative fast path) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    // Capture the start anchor in a ref so rAF callbacks see the latest value
    // without paying for a React state update.
    dragStartRef.current = { x: e.clientX - dragOffsetRef.current.x, y: e.clientY - dragOffsetRef.current.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    pendingPosRef.current = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    };
    // Coalesce to one DOM write per animation frame — higher than 60 Hz
    // mousemove events collapse into a single transform update.
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const pos = pendingPosRef.current;
        if (!pos || !transformRef.current) return;
        dragOffsetRef.current = pos;
        transformRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${scaleRef.current})`;
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    // Commit the final drag offset back into React state so subsequent
    // zoom / reset / fly-to-spot actions read from a consistent source.
    setOffset(dragOffsetRef.current);
  };

  // Sync the drag ref whenever committed offset changes from outside (zoom
  // buttons, reset, fly-to-spot) so the next drag starts from the correct
  // anchor and we don't "jump" on mousedown.
  useEffect(() => {
    dragOffsetRef.current = offset;
  }, [offset]);

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

          {/* Legend + Heatmap toggle */}
          <div
            className="absolute bottom-4 left-4 flex items-center gap-3 px-4 py-2 rounded-lg z-10"
            style={{ backgroundColor: "var(--sidebar)" }}
          >
            {heatmapOn ? (
              <>
                <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>Low</span>
                <div
                  className="h-3 w-24 rounded-full"
                  style={{
                    background: "linear-gradient(to right, #3B82F6, #22C55E, #EAB308, #DC2626)",
                  }}
                />
                <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>High</span>
                <LegendItem color="#E67E22" label="Offline" />
              </>
            ) : (
              <>
                <LegendItem color={COLORS.available} label="Available" />
                <LegendItem color={COLORS.occupied} label="Occupied" />
                <LegendItem color={COLORS.handicap} label="Handicap" />
                <LegendItem color="#E67E22" label="Offline" />
              </>
            )}
            <button
              onClick={() => setHeatmapOn((v) => !v)}
              className="ml-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: heatmapOn ? "#DC2626" : "var(--surface)",
                color: heatmapOn ? "#fff" : "var(--text-secondary)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 23c-4.97 0-8-3.03-8-7 0-3.53 3.793-8.538 6.088-11.334a2.5 2.5 0 013.824 0C16.207 7.462 20 12.47 20 16c0 3.97-3.03 7-8 7zm0-18.5C9.5 7.5 6 12.5 6 16c0 3.31 2.69 5 6 5s6-1.69 6-5c0-3.5-3.5-8.5-6-12.5z" />
              </svg>
              Heatmap
            </button>
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
              ref={transformRef}
              // No CSS transition during drag — each pan step would otherwise
              // kick off a 100 ms ease animation that fights the next step
              // ~16 ms later and the whole thing stutters. Button-driven
              // zooms still feel snappy because they're a single write.
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: "0 0",
                width: mapWidth,
                height: mapHeight,
                willChange: isDragging ? "transform" : undefined,
              }}
            >
              <ParkingLotGrid
                grid={data.grid}
                sensors={data.sensors}
                heatmapOn={heatmapOn}
                heatmapData={heatmapData}
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
