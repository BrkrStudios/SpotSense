"use client";

import StatCard from "./StatCard";
import { useTemperature } from "@/hooks/useTemperature";

/**
 * Three aggregate HVAC tiles for the dashboard:
 *   - Avg Temp      (cool blue < 65°F, neutral 65–78, warm red > 78)
 *   - Climate Mode  (majority heating/cooling across devices, split in subtitle)
 *   - Avg Power     (violet, watts)
 *
 * Values come from `useTemperature()` which polls /api/temperature every 30 s.
 * Devices are expected to report across a small HVAC fleet — per-spot temps
 * would be far too noisy for ~283 parking sensors.
 */
export default function ClimateTiles() {
  const stats = useTemperature();

  const tempColor =
    stats.avgTemp == null
      ? "var(--text-secondary)"
      : stats.avgTemp < 65
        ? "#3B82F6" // cool blue
        : stats.avgTemp > 78
          ? "#D92626" // warm red
          : "#33BF4D"; // neutral green

  const modeIsHeating = stats.dominantMode === "heating";
  const modeColor =
    stats.dominantMode == null
      ? "var(--text-secondary)"
      : modeIsHeating
        ? "#F97316"
        : "#3B82F6";

  const avgPowerColor = "#8B5CF6";

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
        subtitle={
          stats.deviceCount > 0
            ? `Across ${stats.deviceCount} HVAC sensors`
            : "No HVAC readings yet"
        }
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
        color={avgPowerColor}
        subtitle={
          stats.deviceCount > 0
            ? `Per sensor, ${stats.deviceCount} devices`
            : undefined
        }
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={avgPowerColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
      />
    </div>
  );
}
