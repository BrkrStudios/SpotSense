"use client";

import StatCard from "./StatCard";
import { useTemperature } from "@/hooks/useTemperature";

/**
 * Three aggregate HVAC tiles for the dashboard:
 *   - Avg Temp      (cool blue < 65°F, accent in 65–78 neutral band, warm red > 78)
 *   - Climate Mode  (majority heating/cooling; subtitle shows the split)
 *   - Avg Power     (follows the user's accent color)
 *
 * Values come from `useTemperature()` which polls /api/temperature every 30 s.
 *
 * Color rules:
 *   - Neutral Avg Temp and Avg Power follow var(--accent).
 *   - Threshold/semantic colors (too-cold blue, too-hot red, heating orange,
 *     cooling blue) are kept fixed because they carry meaning a random
 *     accent swap would erase.
 *   - Parking map colors are driven by --map-* tokens and live hex values
 *     in COLORS, not --accent, so the map is untouched by accent changes.
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

  const modeIsHeating = stats.dominantMode === "heating";
  const modeColor =
    stats.dominantMode == null
      ? "var(--text-secondary)"
      : modeIsHeating
        ? "#F97316" // flame orange
        : "#3B82F6"; // cool blue

  const powerColor = "var(--accent)";

  const tempDisplay =
    stats.avgTemp == null ? "—" : `${stats.avgTemp.toFixed(1)}°F`;
  const modeDisplay =
    stats.dominantMode == null
      ? "—"
      : modeIsHeating
        ? "Heating"
        : "Cooling";
  const modeSubtitle =
    stats.deviceCount > 0
      ? `${stats.heatingCount} heating · ${stats.coolingCount} cooling`
      : undefined;
  const powerDisplay =
    stats.avgPower == null ? "—" : `${stats.avgPower.toFixed(1)} W`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
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
        label="Climate Mode"
        value={modeDisplay}
        color={modeColor}
        subtitle={modeSubtitle}
        icon={
          modeIsHeating ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={modeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 2-4 1 2 2 2 2-4z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={modeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
              <line x1="19.1" y1="4.9" x2="4.9" y2="19.1" />
            </svg>
          )
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
