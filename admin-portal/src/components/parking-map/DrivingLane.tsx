"use client";

import { SPOTS_PER_ROW, SPOT_WIDTH, LANE_HEIGHT, COLORS } from "@/lib/constants";

export default function DrivingLane() {
  const totalWidth = SPOTS_PER_ROW * SPOT_WIDTH;

  return (
    <div
      className="relative"
      style={{
        width: totalWidth,
        height: LANE_HEIGHT,
        backgroundColor: COLORS.lane,
      }}
    >
      {/* Dashed center line */}
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
    </div>
  );
}
