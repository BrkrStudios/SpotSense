"use client";

import { useEffect, useState } from "react";
import type { TemperatureReading, ClimateMode } from "@/lib/temperature";

export interface ClimateStats {
  avgTemp: number | null;
  dominantMode: ClimateMode | null;
  heatingCount: number;
  coolingCount: number;
  avgPower: number | null;
  deviceCount: number;
  loading: boolean;
}

const POLL_INTERVAL_MS = 30_000; // HVAC drifts slowly, 30 s is plenty

const INITIAL: ClimateStats = {
  avgTemp: null,
  dominantMode: null,
  heatingCount: 0,
  coolingCount: 0,
  avgPower: null,
  deviceCount: 0,
  loading: true,
};

function computeStats(readings: TemperatureReading[]): Omit<ClimateStats, "loading"> {
  if (readings.length === 0) {
    return {
      avgTemp: null,
      dominantMode: null,
      heatingCount: 0,
      coolingCount: 0,
      avgPower: null,
      deviceCount: 0,
    };
  }

  let tempSum = 0;
  let powerSum = 0;
  let heatingCount = 0;
  let coolingCount = 0;

  for (const r of readings) {
    tempSum += r.temperature;
    powerSum += r.power;
    if (r.mode === "heating") heatingCount++;
    else coolingCount++;
  }

  return {
    avgTemp: tempSum / readings.length,
    dominantMode: heatingCount >= coolingCount ? "heating" : "cooling",
    heatingCount,
    coolingCount,
    avgPower: powerSum / readings.length,
    deviceCount: readings.length,
  };
}

/**
 * Polls /api/temperature on a 30 s cadence. Keeps last-good stats on
 * transient errors (including the 401 you'd see right after a logout)
 * so the dashboard doesn't flash blanks.
 */
export function useTemperature(): ClimateStats {
  const [stats, setStats] = useState<ClimateStats>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/temperature", { cache: "no-store" });
        if (!res.ok) return;
        const data: { readings?: TemperatureReading[] } = await res.json();
        if (cancelled) return;
        const next = computeStats(data.readings ?? []);
        setStats({ ...next, loading: false });
      } catch {
        // Swallow — keep previous stats so the UI doesn't thrash.
      } finally {
        if (!cancelled) setStats((s) => ({ ...s, loading: false }));
      }
    };

    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return stats;
}
