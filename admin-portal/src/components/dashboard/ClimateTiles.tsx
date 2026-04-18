"use client";

import StatCard from "./StatCard";
import { useTemperature } from "@/hooks/useTemperature";

/**
 * Two aggregate HVAC tiles for the dashboard:
 *   - Avg Temp   (cool blue < 65°F, accent in 65–78 neutral band, warm red > 78)
 *   - Avg Power  (follows the user's accent color)
 *
 * Values come from `useTemperature()` which polls /api/temperature every 30 s.
 *
 * Threshold colors on Avg Temp are kept because "too cold" and "too hot"
 * are genuine warnings. The neutral band and Avg Power follow var(--accent)
 * so picking a pink / violet / orange theme propagates here without
 * touching the parking map's semantic greens/reds/blues.
 */
export default function ClimateTiles() {
  const stats = useTemperature();

  const tempColor =
    stats.avgTemp == null
      ? "var(--text-secondary)"
      : stats.avgTemp < 65
        ? "#3B82F6" // too cold — blue warning
        : stats.avgTemp > 78
          ? "#D92626" // too hot — red warning
          : "var(--accent)"; // in-range → user's accent

  const powerColor = "var(--accent)";

  const tempDisplay =
    stats.avgTemp == null ? "—" : `${stats.avgTemp.toFixed(1)}°F`;
  const powerDisplay =
    stats.avgPower == null ? "—" : `${stats.avgPower.toFixed(1)} W`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      <StatCard
        label="Avg Temp"
        value={tempDisplay}
        color={tempColor}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tempColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
          </svg>
        }
      />
      <StatCard
        label="Avg Power"
        value={powerDisplay}
        color={powerColor}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={powerColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
      />
    </div>
  );
}
