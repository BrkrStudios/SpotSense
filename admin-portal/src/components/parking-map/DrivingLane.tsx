"use client";

import { SPOTS_PER_ROW, SPOT_WIDTH, LANE_HEIGHT, COLORS } from "@/lib/constants";

interface DrivingLaneProps {
  laneType?: "lane" | "road" | "grass";
}

export default function DrivingLane({ laneType = "lane" }: DrivingLaneProps) {
  const totalWidth = SPOTS_PER_ROW * SPOT_WIDTH;

  const bgColor =
    laneType === "grass" ? COLORS.grass : COLORS.lane;

  return (
    <div
      className="relative"
      style={{
        width: totalWidth,
        height: LANE_HEIGHT,
        backgroundColor: bgColor,
      }}
    >
      {/* Dashed center line (not on grass) */}
      {laneType !== "grass" && (
        <svg
          className="absolute inset-0"
          width={totalWidth}
          height={LANE_HEIGHT}
        >
          <line
            x1="0"
            y1={LANE_HEIGHT / 2}
            x2={totalWidth}
            y2={LANE_HEIGHT / 2}
            stroke={COLORS.line}
            strokeOpacity="0.3"
            strokeWidth="1"
            strokeDasharray="8 8"
          />
        </svg>
      )}
    </div>
  );
}
