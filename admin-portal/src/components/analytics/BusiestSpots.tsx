"use client";

import Link from "next/link";
import { useMemo } from "react";

interface BusiestSpotsProps {
  heatmapData: Record<number, number>;
  tickCount: number;
}

export default function BusiestSpots({ heatmapData, tickCount }: BusiestSpotsProps) {
  const ranked = useMemo(() => {
    return Object.entries(heatmapData)
      .map(([id, v]) => ({ id: Number(id), occ: v }))
      .sort((a, b) => b.occ - a.occ)
      .slice(0, 10);
  }, [heatmapData]);

  const colorFor = (v: number) => {
    if (v >= 0.8) return "#D92626";
    if (v >= 0.55) return "#F97316";
    if (v >= 0.3) return "#E6A833";
    return "#33BF4D";
  };

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Most In-Demand Spots
          </h3>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            Ranked by occupancy rate over this session
          </p>
        </div>
        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
          {tickCount} ticks sampled
        </span>
      </div>

      {ranked.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Gathering data…
        </p>
      ) : (
        <div className="space-y-2">
          {ranked.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3">
              <span
                className="w-5 text-[11px] font-bold tabular-nums"
                style={{ color: "var(--text-secondary)" }}
              >
                #{i + 1}
              </span>
              <Link
                href={`/sensors/${r.id}`}
                className="text-xs hover:underline w-14 tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                Spot {r.id}
              </Link>
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(4, r.occ * 100)}%`,
                    backgroundColor: colorFor(r.occ),
                  }}
                />
              </div>
              <span
                className="w-10 text-right text-[11px] tabular-nums font-semibold"
                style={{ color: colorFor(r.occ) }}
              >
                {Math.round(r.occ * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
