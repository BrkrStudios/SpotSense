"use client";

import { DailyOccupancyProfile } from "@/lib/types";
import { DAY_SHORT } from "@/lib/occupancy-profiles";
import { useMemo, useState } from "react";

interface OccupancyHeatmapProps {
  data: DailyOccupancyProfile[];
}

/** 7 × 24 heatmap averaged over all occurrences of each weekday in the provided range. */
export default function OccupancyHeatmap({ data }: OccupancyHeatmapProps) {
  const [hover, setHover] = useState<{ day: number; hour: number; v: number } | null>(null);

  const matrix = useMemo(() => {
    // 7 days × 24 hours accumulators
    const sum: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const cnt: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const day of data) {
      for (const p of day.points) {
        const dt = new Date(p.timestamp);
        const h = dt.getHours();
        const total = p.occupiedCount + p.availableCount || 1;
        const frac = p.occupiedCount / total;
        sum[day.dayOfWeek][h] += frac;
        cnt[day.dayOfWeek][h] += 1;
      }
    }
    const out: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        out[d][h] = cnt[d][h] > 0 ? sum[d][h] / cnt[d][h] : 0;
      }
    }
    return out;
  }, [data]);

  const colorFor = (v: number) => {
    if (v <= 0) return "var(--surface)";
    // 0 -> green, 0.5 -> orange, 1 -> red
    const stops: [number, [number, number, number]][] = [
      [0, [51, 191, 77]],
      [0.5, [249, 115, 22]],
      [1, [217, 38, 38]],
    ];
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (v >= stops[i][0] && v <= stops[i + 1][0]) {
        lo = stops[i];
        hi = stops[i + 1];
        break;
      }
    }
    const t = (v - lo[0]) / (hi[0] - lo[0] || 1);
    const r = Math.round(lo[1][0] + (hi[1][0] - lo[1][0]) * t);
    const g = Math.round(lo[1][1] + (hi[1][1] - lo[1][1]) * t);
    const b = Math.round(lo[1][2] + (hi[1][2] - lo[1][2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const hourLabels = [0, 4, 8, 12, 16, 20];
  const formatHour = (h: number) =>
    h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`;

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Occupancy Heatmap
        </h3>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-secondary)" }}>
          <span>0%</span>
          <div
            className="w-24 h-2 rounded-full"
            style={{
              background:
                "linear-gradient(to right, rgb(51,191,77), rgb(249,115,22), rgb(217,38,38))",
            }}
          />
          <span>100%</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour axis */}
          <div className="flex items-center pl-10 mb-1">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="flex-1 text-[9px] text-center"
                style={{ color: "var(--text-secondary)" }}
              >
                {hourLabels.includes(h) ? formatHour(h) : ""}
              </div>
            ))}
          </div>

          {/* Grid */}
          {Array.from({ length: 7 }, (_, d) => (
            <div key={d} className="flex items-center mb-0.5">
              <div
                className="w-10 text-[10px] font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {DAY_SHORT[d]}
              </div>
              <div className="flex flex-1 gap-0.5">
                {Array.from({ length: 24 }, (_, h) => {
                  const v = matrix[d][h];
                  return (
                    <div
                      key={h}
                      className="flex-1 h-5 rounded-[2px] transition-transform"
                      style={{
                        backgroundColor: colorFor(v),
                        transform:
                          hover?.day === d && hover.hour === h ? "scale(1.2)" : "scale(1)",
                      }}
                      onMouseEnter={() => setHover({ day: d, hour: h, v })}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip readout */}
      <div className="mt-3 text-xs h-4" style={{ color: "var(--text-secondary)" }}>
        {hover ? (
          <>
            <span style={{ color: "var(--text-primary)" }}>
              {DAY_SHORT[hover.day]} {formatHour(hover.hour)}
            </span>
            {" — avg "}
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {Math.round(hover.v * 100)}%
            </span>
            {" occupancy"}
          </>
        ) : (
          <span>Hover a cell to see hourly averages</span>
        )}
      </div>
    </div>
  );
}
