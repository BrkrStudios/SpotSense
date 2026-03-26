"use client";

import { ParkingSpot as ParkingSpotType } from "@/lib/types";
import ParkingRow from "./ParkingRow";
import DrivingLane from "./DrivingLane";

interface ParkingAisleProps {
  topRowIndex: number;
  bottomRowIndex: number | null;
  hasLane: boolean;
  laneType?: "lane" | "road" | "grass";
  grid: ParkingSpotType[][];
  selectedSpotId: number | null;
  onSpotClick: (spotId: number) => void;
}

export default function ParkingAisle({
  topRowIndex,
  bottomRowIndex,
  hasLane,
  laneType = "lane",
  grid,
  selectedSpotId,
  onSpotClick,
}: ParkingAisleProps) {
  return (
    <div style={{ flexShrink: 0 }}>
      <ParkingRow
        spots={grid[topRowIndex]}
        rowIndex={topRowIndex}
        facingUp={true}
        selectedSpotId={selectedSpotId}
        onSpotClick={onSpotClick}
      />
      {bottomRowIndex !== null && (
        <ParkingRow
          spots={grid[bottomRowIndex]}
          rowIndex={bottomRowIndex}
          facingUp={false}
          selectedSpotId={selectedSpotId}
          onSpotClick={onSpotClick}
        />
      )}
      {hasLane && <DrivingLane laneType={laneType} />}
    </div>
  );
}
