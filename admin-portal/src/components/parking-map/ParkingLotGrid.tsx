"use client";

import { ParkingSpot as ParkingSpotType } from "@/lib/types";
import { AISLES, COLORS, LANE_TYPES, ROAD_WIDTH, SPOTS_PER_ROW, SPOT_WIDTH, LANE_HEIGHT, TOP_GRASS_LANE } from "@/lib/constants";
import ParkingAisle from "./ParkingAisle";
import DrivingLane from "./DrivingLane";

interface ParkingLotGridProps {
  grid: ParkingSpotType[][];
  selectedSpotId: number | null;
  onSpotClick: (spotId: number) => void;
}

export default function ParkingLotGrid({
  grid,
  selectedSpotId,
  onSpotClick,
}: ParkingLotGridProps) {
  const totalWidth = SPOTS_PER_ROW * SPOT_WIDTH;

  return (
    <div className="inline-flex flex-row" style={{ backgroundColor: COLORS.asphalt }}>
      {/* Left road column */}
      <div
        style={{
          width: ROAD_WIDTH,
          backgroundColor: COLORS.road,
          flexShrink: 0,
        }}
      />

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
            selectedSpotId={selectedSpotId}
            onSpotClick={onSpotClick}
          />
        ))}
      </div>

      {/* Right road column */}
      <div
        style={{
          width: ROAD_WIDTH,
          backgroundColor: COLORS.road,
          flexShrink: 0,
        }}
      />
    </div>
  );
}
