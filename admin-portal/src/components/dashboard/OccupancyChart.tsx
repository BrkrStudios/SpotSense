"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { OccupancyDataPoint } from "@/lib/types";

interface OccupancyChartProps {
  data: OccupancyDataPoint[];
  serverTime: Date | null;
}

interface HoverInfo {
  x: number;
  y: number;
  svgX: number;
  svgY: number;
  time: string;
  occupied: number;
  available: number;
}

export default function OccupancyChart({ data, serverTime }: OccupancyChartProps) {
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => setMounted(true), []);

  const maxVal = 283;
  const width = 800;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || data.length === 0 || !serverTime) return;

      const rect = svgRef.current.getBoundingClientRect();
      // Convert mouse position to SVG coordinate space
      const mouseXRatio = (e.clientX - rect.left) / rect.width;
      const svgX = mouseXRatio * width;

      // Only show tooltip within the chart area
      if (svgX < padding.left || svgX > width - padding.right) {
        setHover(null);
        return;
      }

      const startOfDay = new Date(
        serverTime.getFullYear(),
        serverTime.getMonth(),
        serverTime.getDate()
      );
      const msInDay = 24 * 60 * 60 * 1000;

      // Find the closest data point to the mouse X
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < data.length; i++) {
        const msFromMidnight =
          new Date(data[i].timestamp).getTime() - startOfDay.getTime();
        const xRatio = msFromMidnight / msInDay;
        const pointX = padding.left + xRatio * chartW;
        const dist = Math.abs(pointX - svgX);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      const d = data[closestIdx];
      const msFromMidnight =
        new Date(d.timestamp).getTime() - startOfDay.getTime();
      const xRatio = msFromMidnight / msInDay;
      const pointX = padding.left + xRatio * chartW;
      const pointY =
        padding.top + chartH - (d.occupiedCount / maxVal) * chartH;

      // Format time
      const date = new Date(d.timestamp);
      const h = date.getHours();
      const m = date.getMinutes();
      const timeStr = `${h % 12 || 12}:${String(m).padStart(2, "0")}${
        h < 12 ? "am" : "pm"
      }`;

      setHover({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        svgX: pointX,
        svgY: pointY,
        time: timeStr,
        occupied: d.occupiedCount,
        available: d.availableCount,
      });
    },
    [data, serverTime, chartW, chartH]
  );

  const handleMouseLeave = useCallback(() => setHover(null), []);

  if (!mounted || data.length === 0 || !serverTime) {
    return (
      <div
        className="rounded-xl p-5 border h-[280px]"
        style={{
          backgroundColor: "var(--sidebar)",
          borderColor: "var(--border)",
        }}
      >
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Occupancy — Today
        </h3>
      </div>
    );
  }

  const startOfDay = new Date(
    serverTime.getFullYear(),
    serverTime.getMonth(),
    serverTime.getDate()
  );
  const msInDay = 24 * 60 * 60 * 1000;

  const points = data.map((d) => {
    const msFromMidnight =
      new Date(d.timestamp).getTime() - startOfDay.getTime();
    const xRatio = msFromMidnight / msInDay;
    return {
      x: padding.left + xRatio * chartW,
      y: padding.top + chartH - (d.occupiedCount / maxVal) * chartH,
    };
  });

  if (points.length < 2) return null;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    padding.top + chartH
  } L ${points[0].x} ${padding.top + chartH} Z`;

  const yLabels = [0, 70, 140, 210, 283];

  const xLabels: { label: string; hour: number }[] = [];
  for (let h = 0; h <= 24; h += 4) {
    const label =
      h === 0
        ? "12am"
        : h < 12
        ? `${h}am`
        : h === 12
        ? "12pm"
        : h < 24
        ? `${h - 12}pm`
        : "12am";
    xLabels.push({ label, hour: h });
  }

  const nowMs = serverTime.getTime() - startOfDay.getTime();
  const nowX = padding.left + (nowMs / msInDay) * chartW;
  const nowHour = serverTime.getHours();
  const nowMin = serverTime.getMinutes();
  const nowLabel = `${nowHour % 12 || 12}:${String(nowMin).padStart(2, "0")}${
    nowHour < 12 ? "am" : "pm"
  }`;

  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        backgroundColor: "var(--sidebar)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Occupancy — Today
        </h3>
        <span
          className="text-xs tabular-nums"
          style={{ color: "var(--text-secondary)" }}
        >
          Live · {nowLabel}
        </span>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: "crosshair" }}
        >
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
          {xLabels.map(({ label, hour }) => {
            const x = padding.left + (hour / 24) * chartW;
            return (
              <text
                key={hour}
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

          {/* "Now" vertical marker */}
          <line
            x1={nowX}
            x2={nowX}
            y1={padding.top}
            y2={padding.top + chartH}
            stroke="#3366E6"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text
            x={nowX}
            y={padding.top - 2}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="#3366E6"
          >
            NOW
          </text>

          {/* Hover vertical line + dot */}
          {hover && (
            <>
              <line
                x1={hover.svgX}
                x2={hover.svgX}
                y1={padding.top}
                y2={padding.top + chartH}
                stroke="var(--text-secondary)"
                strokeWidth="0.5"
                strokeDasharray="3 3"
                pointerEvents="none"
              />
              <circle
                cx={hover.svgX}
                cy={hover.svgY}
                r="4"
                fill="#D92626"
                stroke="white"
                strokeWidth="2"
                pointerEvents="none"
              />
            </>
          )}
        </svg>

        {/* Tooltip (HTML overlay for crisp text) */}
        {hover && (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: hover.x,
              top: hover.y,
              transform: `translate(${
                hover.x > 500 ? "calc(-100% - 12px)" : "12px"
              }, -50%)`,
            }}
          >
            <div
              className="px-3 py-2 rounded-lg shadow-xl text-xs"
              style={{
                backgroundColor: "#1A1A1F",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {hover.time}
              </p>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "#D92626" }}
                />
                <span style={{ color: "var(--text-secondary)" }}>
                  Occupied:
                </span>
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: "#D92626" }}
                >
                  {hover.occupied}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "#33BF4D" }}
                />
                <span style={{ color: "var(--text-secondary)" }}>
                  Available:
                </span>
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: "#33BF4D" }}
                >
                  {hover.available}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
