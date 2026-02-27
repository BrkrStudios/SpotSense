"use client";

import { OccupancyDataPoint } from "@/lib/types";

interface OccupancyChartProps {
  data: OccupancyDataPoint[];
}

export default function OccupancyChart({ data }: OccupancyChartProps) {
  if (data.length === 0) return null;

  const maxVal = 220;
  const width = 800;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - (d.occupiedCount / maxVal) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  // Y axis labels
  const yLabels = [0, 55, 110, 165, 220];
  // X axis labels (every 4 hours)
  const xLabels = ["12am", "4am", "8am", "12pm", "4pm", "8pm"];

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <h3
        className="text-sm font-medium mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        Occupancy — Today
      </h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Grid lines */}
        {yLabels.map((val) => {
          const y = padding.top + chartH - (val / maxVal) * chartH;
          return (
            <g key={val}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="0.5"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-secondary)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {xLabels.map((label, i) => {
          const x = padding.left + (i / (xLabels.length - 1)) * chartW;
          return (
            <text
              key={label}
              x={x}
              y={height - 5}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-secondary)"
            >
              {label}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="#D92626" opacity="0.15" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#D92626" strokeWidth="2" />
      </svg>
    </div>
  );
}
