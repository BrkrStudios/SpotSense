"use client";

import { ParkingSpot as ParkingSpotType, SpotStatus } from "@/lib/types";
import { SPOT_WIDTH, SPOT_HEIGHT, LINE_WIDTH, COLORS, SPOTS_PER_ROW } from "@/lib/constants";
import { spotColor } from "@/lib/utils";

interface ParkingSpotProps {
  spot: ParkingSpotType;
  row: number;
  col: number;
  facingUp: boolean;
  spotNumber: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function ParkingSpot({
  spot,
  row,
  col,
  facingUp,
  spotNumber,
  isSelected,
  onClick,
}: ParkingSpotProps) {
  const isLastColumn = col === SPOTS_PER_ROW - 1;
  const color = spotColor(spot);

  return (
    <div
      className="relative shrink-0 cursor-pointer"
      style={{
        width: SPOT_WIDTH,
        height: SPOT_HEIGHT,
        backgroundColor: COLORS.asphalt,
      }}
      onClick={onClick}
    >
      {/* Left edge line (always) */}
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: LINE_WIDTH, backgroundColor: COLORS.line }}
      />

      {/* Right edge line (only on last column) */}
      {isLastColumn && (
        <div
          className="absolute right-0 top-0 bottom-0"
          style={{ width: LINE_WIDTH, backgroundColor: COLORS.line }}
        />
      )}

      {/* Back edge line — facingUp: bottom border, facingDown: top border */}
      {facingUp ? (
        <div
          className="absolute left-0 right-0 bottom-0"
          style={{ height: LINE_WIDTH, backgroundColor: COLORS.line }}
        />
      ) : (
        <div
          className="absolute left-0 right-0 top-0"
          style={{ height: LINE_WIDTH, backgroundColor: COLORS.line }}
        />
      )}

      {/* Status indicator */}
      <div
        className="absolute rounded-[4px]"
        style={{
          left: 3,
          right: 3,
          top: 4,
          bottom: 4,
          backgroundColor: color,
          boxShadow: isSelected ? "0 0 0 2px #fff" : "none",
        }}
      />

      {/* Handicap icon */}
      {spot.isHandicap && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            width="10"
            height="10"
            fill="white"
            className="opacity-90"
          >
            <path d="M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-1 8a4 4 0 0 0-4 4v1h2v-1a2 2 0 0 1 2-2h1v5h-3l-1 3h8l-1-3h-1V10h-3z" />
          </svg>
        </div>
      )}

      {/* Spot number */}
      <div
        className="absolute left-0 right-0 text-center"
        style={{
          fontSize: 7,
          fontWeight: 600,
          color: "rgba(255,255,255,0.85)",
          ...(facingUp ? { top: 2 } : { bottom: 2 }),
        }}
      >
        {spotNumber}
      </div>
    </div>
  );
}
