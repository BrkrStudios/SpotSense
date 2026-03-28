"use client";

import { ParkingSpot as ParkingSpotType, SensorReading } from "@/lib/types";
import { AISLES, COLORS, LANE_TYPES, ROAD_WIDTH, SPOTS_PER_ROW, SPOT_WIDTH, LANE_HEIGHT, TOP_GRASS_LANE } from "@/lib/constants";
import ParkingAisle from "./ParkingAisle";
import DrivingLane from "./DrivingLane";
import { useMemo } from "react";

interface ParkingLotGridProps {
  grid: ParkingSpotType[][];
  sensors: Record<number, SensorReading>;
  heatmapOn?: boolean;
  heatmapData?: Record<number, number>;
  selectedSpotId: number | null;
  onSpotClick: (spotId: number) => void;
}

export default function ParkingLotGrid({
  grid,
  sensors,
  heatmapOn,
  heatmapData,
  selectedSpotId,
  onSpotClick,
}: ParkingLotGridProps) {
  const offlineSpotIds = useMemo(() => {
    const set = new Set<number>();
    for (const [id, sensor] of Object.entries(sensors)) {
      if (!sensor.sensorOnline) set.add(Number(id));
    }
    return set;
  }, [sensors]);
  const totalWidth = SPOTS_PER_ROW * SPOT_WIDTH;

  return (
    <div className="inline-flex flex-row" style={{ backgroundColor: COLORS.asphalt }}>
      {/* Left road column */}
      <div
        className="relative"
        style={{
          width: ROAD_WIDTH,
          backgroundColor: COLORS.road,
          flexShrink: 0,
        }}
      >
        <svg className="absolute inset-0 w-full h-full">
          <line
            x1={ROAD_WIDTH / 2}
            y1="0"
            x2={ROAD_WIDTH / 2}
            y2="100%"
            stroke={COLORS.line}
            strokeOpacity="0.3"
            strokeWidth="1"
            strokeDasharray="8 8"
          />
        </svg>
      </div>

      {/* Main parking area */}
      <div className="inline-flex flex-col" style={{ backgroundColor: COLORS.asphalt }}>
        {/* Top grass lane */}
        <DrivingLane laneType="grass" />

        {AISLES.map((aisle, i) => (
          <ParkingAisle
            key={i}
            topRowIndex={aisle.top}
            bottomRowIndex={aisle.bottom ?? null}
            hasLane={aisle.lane !== null}
            laneType={aisle.lane !== null ? (LANE_TYPES[aisle.lane] ?? "lane") : "lane"}
            grid={grid}
            offlineSpotIds={offlineSpotIds}
            heatmapOn={heatmapOn}
            heatmapData={heatmapData}
            selectedSpotId={selectedSpotId}
            onSpotClick={onSpotClick}
          />
        ))}
      </div>

      {/* Right road column */}
      <div
        className="relative"
        style={{
          width: ROAD_WIDTH,
          backgroundColor: COLORS.road,
          flexShrink: 0,
        }}
      >
        <svg className="absolute inset-0 w-full h-full">
          <line
            x1={ROAD_WIDTH / 2}
            y1="0"
            x2={ROAD_WIDTH / 2}
            y2="100%"
            stroke={COLORS.line}
            strokeOpacity="0.3"
            strokeWidth="1"
            strokeDasharray="8 8"
          />
        </svg>
      </div>
    </div>
  );
}
