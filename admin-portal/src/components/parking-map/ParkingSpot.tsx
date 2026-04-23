"use client";

import { ParkingSpot as ParkingSpotType, SpotStatus } from "@/lib/types";
import { SPOT_WIDTH, SPOT_HEIGHT, LINE_WIDTH, COLORS, SPOTS_PER_ROW, NOT_A_SPOT_POSITIONS, GRASS_POSITIONS } from "@/lib/constants";
import { spotColor, heatColor } from "@/lib/utils";

const OFFLINE_COLOR = "#E67E22"; // orange for offline sensors

interface ParkingSpotProps {
  spot: ParkingSpotType;
  row: number;
  col: number;
  facingUp: boolean;
  spotNumber: number;
  isSensorOffline?: boolean;
  heatmapOn?: boolean;
  heatValue?: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function ParkingSpot({
  spot,
  row,
  col,
  facingUp,
  spotNumber,
  isSensorOffline,
  heatmapOn,
  heatValue,
  isSelected,
  onClick,
}: ParkingSpotProps) {
  const isLastColumn = col === SPOTS_PER_ROW - 1;
  const color = isSensorOffline
    ? OFFLINE_COLOR
    : heatmapOn
    ? heatColor(heatValue ?? 0)
    : spotColor(spot);
  const isUnusable = NOT_A_SPOT_POSITIONS.some(([r, c]) => r === row && c === col);
  const isGrass = GRASS_POSITIONS.some(([r, c]) => r === row && c === col);

  return (
    <div
      className="relative shrink-0 cursor-pointer"
      style={{
        width: SPOT_WIDTH,
        height: SPOT_HEIGHT,
        backgroundColor: COLORS.asphalt,
      }}
      onClick={isUnusable || isGrass ? undefined : onClick}
    >
      {/* Grass spots get solid green fill, no lines */}
      {isGrass ? (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: COLORS.grass }}
        />
      ) : (
        <>
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
        </>
      )}

      {isGrass ? null : isUnusable ? (
        /* Yellow diagonal hatching for unusable spots */
        <svg
          className="absolute"
          style={{ left: 3, right: 3, top: 4, bottom: 4, width: SPOT_WIDTH - 6, height: SPOT_HEIGHT - 8 }}
          viewBox={`0 0 ${SPOT_WIDTH - 6} ${SPOT_HEIGHT - 8}`}
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id={`hatch-${row}-${col}`}
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="#D4A017" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect
            width={SPOT_WIDTH - 6}
            height={SPOT_HEIGHT - 8}
            rx="4"
            fill={`url(#hatch-${row}-${col})`}
          />
        </svg>
      ) : (
        <>
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

          {/* Handicap icon — Material Symbol "accessible" (the universal
              accessibility pictogram: head + outstretched arms). Chosen
              over a detailed wheelchair because it reads at 12–14px
              where fine details on a wheelchair turn to mush. */}
          {spot.isHandicap && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="white"
              >
                {/* head */}
                <circle cx="12" cy="4.5" r="2" />
                {/* body with outstretched arms + legs */}
                <path d="M21 9h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
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
        </>
      )}
    </div>
  );
}
