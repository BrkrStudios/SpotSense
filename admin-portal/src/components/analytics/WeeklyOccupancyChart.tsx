"use client";

import { DailyOccupancyProfile } from "@/lib/types";
import { DAY_SHORT } from "@/lib/occupancy-profiles";
import { useState, useRef, useCallback } from "react";

interface WeeklyOccupancyChartProps {
  data: DailyOccupancyProfile[];
}

const DAY_COLORS = [
  "#94A3B8", // Sun - gray
  "#3B82F6", // Mon - blue
  "#14B8A6", // Tue - teal
  "#DC2626", // Wed - red
  "#A855F7", // Thu - purple
  "#F97316", // Fri - orange
  "#64748B", // Sat - slate
];

interface HoverInfo {
  x: number;
  y: number;
  hour: number;
  values: { day: string; color: string; occupied: number }[];
}

export default function WeeklyOccupancyChart({ data }: WeeklyOccupancyChartProps) {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const maxVal = 283;
  const width = 800;
  const height = 220;
  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Group data by day of week — take the most recent occurrence of each day
  const byDay: Record<number, DailyOccupancyProfile> = {};
  for (const d of data) {
    byDay[d.dayOfWeek] = d; // last one wins (most recent)
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseXRatio = (e.clientX - rect.left) / rect.width;
      const svgX = mouseXRatio * width;
      if (svgX < padding.left || svgX > width - padding.right) {
        setHover(null);
        return;
      }
      const hour = ((svgX - padding.left) / chartW) * 24;
      const closestQuarter = Math.round(hour * 4) / 4;

      const values: HoverInfo["values"] = [];
      for (let day = 0; day < 7; day++) {
        const profile = byDay[day];
        if (!profile) continue;
        const pt = profile.points.reduce((best, p) => {
          const ph = new Date(p.timestamp).getHours() + new Date(p.timestamp).getMinutes() / 60;
          const bd = Math.abs(ph - closestQuarter);
          const bb = Math.abs(new Date(best.timestamp).getHours() + new Date(best.timestamp).getMinutes() / 60 - closestQuarter);
          return bd < bb ? p : best;
        }, profile.points[0]);
        if (pt) {
          values.push({ day: DAY_SHORT[day], color: DAY_COLORS[day], occupied: pt.occupiedCount });
        }
      }

      setHover({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        hour: closestQuarter,
        values: values.sort((a, b) => b.occupied - a.occupied),
      });
    },
    [byDay, chartW]
  );

  const yLabels = [0, 70, 140, 210, 283];
  const xLabels: { label: string; hour: number }[] = [];
  for (let h = 0; h <= 24; h += 4) {
    const label = h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : h < 24 ? `${h - 12}pm` : "12am";
    xLabels.push({ label, hour: h });
  }

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Weekly Occupancy Overlay
        </h3>
        {/* Legend */}
        <div className="flex gap-3 flex-wrap">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <div key={d} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DAY_COLORS[d] }} />
              <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{DAY_SHORT[d]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "crosshair" }}
        >
          {/* Grid */}
          {yLabels.map((val) => {
            const y = padding.top + chartH - (val / maxVal) * chartH;
            return (
              <g key={val}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                <text x={padding.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="var(--text-secondary)">{val}</text>
              </g>
            );
          })}
          {xLabels.map(({ label, hour }) => (
            <text key={hour} x={padding.left + (hour / 24) * chartW} y={height - 5} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">{label}</text>
          ))}

          {/* Lines for each day */}
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const profile = byDay[day];
            if (!profile || profile.points.length < 2) return null;

            const pts = profile.points.map((p) => {
              const d = new Date(p.timestamp);
              const h = d.getHours() + d.getMinutes() / 60;
              return {
                x: padding.left + (h / 24) * chartW,
                y: padding.top + chartH - (p.occupiedCount / maxVal) * chartH,
              };
            });

            const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
            return (
              <path
                key={day}
                d={path}
                fill="none"
                stroke={DAY_COLORS[day]}
                strokeWidth={day === 3 ? "2.5" : "1.5"} // Wednesday thicker
                opacity={day === 0 || day === 6 ? 0.5 : 0.85}
              />
            );
          })}

          {/* Hover line */}
          {hover && (
            <line
              x1={padding.left + (hover.hour / 24) * chartW}
              x2={padding.left + (hover.hour / 24) * chartW}
              y1={padding.top}
              y2={padding.top + chartH}
              stroke="var(--text-secondary)"
              strokeWidth="0.5"
              strokeDasharray="3 3"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: hover.x,
              top: hover.y,
              transform: `translate(${hover.x > 500 ? "calc(-100% - 12px)" : "12px"}, -50%)`,
            }}
          >
            <div
              className="px-3 py-2 rounded-lg shadow-xl text-xs"
              style={{ backgroundColor: "#1A1A1F", border: "1px solid var(--border)" }}
            >
              <p className="font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
                {Math.floor(hover.hour) % 12 || 12}:{String(Math.round((hover.hour % 1) * 60)).padStart(2, "0")}
                {hover.hour < 12 ? "am" : "pm"}
              </p>
              {hover.values.slice(0, 5).map((v) => (
                <div key={v.day} className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
                  <span style={{ color: "var(--text-secondary)" }}>{v.day}:</span>
                  <span className="font-semibold tabular-nums" style={{ color: v.color }}>{v.occupied}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
