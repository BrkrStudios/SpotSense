"use client";

import { WeeklyStats } from "@/lib/types";
import { DAY_SHORT } from "@/lib/occupancy-profiles";

interface PeakHoursChartProps {
  stats: WeeklyStats;
}

const BAR_COLORS = [
  "#94A3B8", // Sun
  "#3B82F6", // Mon
  "#14B8A6", // Tue
  "#DC2626", // Wed
  "#A855F7", // Thu
  "#F97316", // Fri
  "#64748B", // Sat
];

export default function PeakHoursChart({ stats }: PeakHoursChartProps) {
  const width = 800;
  const height = 180;
  const padding = { top: 10, right: 10, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxOcc = Math.max(...stats.avgOccupancyByDay, 0.01);
  const barWidth = chartW / 7;
  const barInner = barWidth * 0.6;

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Avg Occupancy by Day of Week
      </h3>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Y-axis grid */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
          const y = padding.top + chartH - (frac / maxOcc) * chartH * maxOcc;
          const pct = Math.round(frac * 100);
          return (
            <g key={frac}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={padding.top + chartH - frac * chartH}
                y2={padding.top + chartH - frac * chartH}
                stroke="var(--border)"
                strokeWidth="0.5"
              />
              <text
                x={padding.left - 8}
                y={padding.top + chartH - frac * chartH + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-secondary)"
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {stats.avgOccupancyByDay.map((occ, day) => {
          const x = padding.left + day * barWidth + (barWidth - barInner) / 2;
          const barH = (occ / 1) * chartH; // max is 1.0 = 100%
          const y = padding.top + chartH - barH;

          return (
            <g key={day}>
              <rect
                x={x}
                y={y}
                width={barInner}
                height={barH}
                rx="4"
                fill={BAR_COLORS[day]}
                opacity={day === stats.busiestDay ? 1 : 0.7}
              />
              {/* Percentage label on top */}
              <text
                x={x + barInner / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill={BAR_COLORS[day]}
              >
                {Math.round(occ * 100)}%
              </text>
              {/* Day label */}
              <text
                x={padding.left + day * barWidth + barWidth / 2}
                y={height - 5}
                textAnchor="middle"
                fontSize="10"
                fontWeight={day === stats.busiestDay ? "700" : "400"}
                fill="var(--text-secondary)"
              >
                {DAY_SHORT[day]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
