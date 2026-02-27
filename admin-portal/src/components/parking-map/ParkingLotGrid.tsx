"use client";

import { ParkingSpot as ParkingSpotType } from "@/lib/types";
import { AISLES, COLORS } from "@/lib/constants";
import ParkingAisle from "./ParkingAisle";

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
  return (
    <div
      className="inline-flex flex-col"
      style={{ backgroundColor: COLORS.asphalt }}
    >
      {AISLES.map((aisle, i) => (
        <ParkingAisle
          key={i}
          topRowIndex={aisle.top}
          bottomRowIndex={aisle.bottom}
          hasLane={aisle.lane !== null}
          grid={grid}
          selectedSpotId={selectedSpotId}
          onSpotClick={onSpotClick}
        />
      ))}
    </div>
  );
}
