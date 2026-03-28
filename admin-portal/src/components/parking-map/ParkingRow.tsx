"use client";

import { ParkingSpot as ParkingSpotType } from "@/lib/types";
import { SPOTS_PER_ROW } from "@/lib/constants";
import { spotNumberForPosition } from "@/lib/utils";
import ParkingSpot from "./ParkingSpot";

interface ParkingRowProps {
  spots: ParkingSpotType[];
  rowIndex: number;
  facingUp: boolean;
  offlineSpotIds: Set<number>;
  heatmapOn?: boolean;
  heatmapData?: Record<number, number>;
  selectedSpotId: number | null;
  onSpotClick: (spotId: number) => void;
}

export default function ParkingRow({
  spots,
  rowIndex,
  facingUp,
  offlineSpotIds,
  heatmapOn,
  heatmapData,
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
            isSensorOffline={offlineSpotIds.has(spotNum)}
            heatmapOn={heatmapOn}
            heatValue={heatmapData?.[spotNum]}
            isSelected={selectedSpotId === spotNum}
            onClick={() => onSpotClick(spotNum)}
          />
        );
      })}
    </div>
  );
}
