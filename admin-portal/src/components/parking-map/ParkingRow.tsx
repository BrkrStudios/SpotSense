"use client";

import { ParkingSpot as ParkingSpotType } from "@/lib/types";
import { SPOTS_PER_ROW } from "@/lib/constants";
import { spotNumberForPosition } from "@/lib/utils";
import ParkingSpot from "./ParkingSpot";

interface ParkingRowProps {
  spots: ParkingSpotType[];
  rowIndex: number;
  facingUp: boolean;
  selectedSpotId: number | null;
  onSpotClick: (spotId: number) => void;
}

export default function ParkingRow({
  spots,
  rowIndex,
  facingUp,
  selectedSpotId,
  onSpotClick,
}: ParkingRowProps) {
  return (
    <div className="flex" style={{ flexShrink: 0 }}>
      {spots.map((spot, col) => {
        const spotNum = spotNumberForPosition(rowIndex, col) ?? 0;
        return (
          <ParkingSpot
            key={col}
            spot={spot}
            row={rowIndex}
            col={col}
            facingUp={facingUp}
            spotNumber={spotNum}
            isSelected={selectedSpotId === spotNum}
            onClick={() => onSpotClick(spotNum)}
          />
        );
      })}
    </div>
  );
}
