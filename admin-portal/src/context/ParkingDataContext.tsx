"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import {
  ParkingLotData,
  ParkingStats,
  SpotStatus,
  Alert,
  OccupancyDataPoint,
  ActivityEvent,
} from "@/lib/types";
import {
  PARKING_ROW_INDICES,
  SPOTS_PER_ROW,
  HANDICAP_POSITIONS,
  TOTAL_NUMBERED_SPOTS,
  NOT_A_SPOT_POSITIONS,
  GRASS_POSITIONS,
} from "@/lib/constants";
import { getMockParkingData, getMockAlerts } from "@/lib/mock-data";
import { spotNumberForPosition } from "@/lib/utils";
import { useServerTime } from "@/hooks/useServerTime";
import { DAY_PROFILES, interpolateProfile } from "@/lib/occupancy-profiles";

interface ParkingDataContextValue {
  data: ParkingLotData;
  stats: ParkingStats;
  occupancyHistory: OccupancyDataPoint[];
  alerts: Alert[];
  resolveAlert: (alertId: string) => void;
  activityFeed: ActivityEvent[];
  heatmapData: Record<number, number>;
  tickCount: number;
  serverTime: Date | null;
  occupancyPercent: number;
  avgTimeParked: string;
}

const ParkingDataContext = createContext<ParkingDataContextValue | null>(null);

export function ParkingDataProvider({ children }: { children: ReactNode }) {
  const serverTime = useServerTime();
  const [data, setData] = useState<ParkingLotData>(() => getMockParkingData());
  const [tickCount, setTickCount] = useState(0);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>(() => getMockAlerts());

  // Heatmap: track per-spot occupancy over ticks
  const heatmapAccRef = useRef<Record<number, { occupied: number; total: number }>>({});
  const [heatmapData, setHeatmapData] = useState<Record<number, number>>({});

  // Track which alerts we've already generated to avoid duplicates
  const generatedAlertKeysRef = useRef<Set<string>>(new Set());

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a
      )
    );
  }, []);

  // Poll the server-side simulation every 3 seconds.
  // The simulation runs on the server (parking-simulation.ts), so both the admin portal
  // and iOS app see identical state from the same /api/parking endpoint.
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch("/api/parking");
        if (!res.ok) return;
        const state = await res.json();

        setData({
          grid: state.grid,
          sensors: state.sensors,
          lastSync: state.lastSync,
          piZeroStatus: state.piZeroStatus,
          backendStatus: state.backendStatus,
        });

        if (state.activityFeed) {
          setActivityFeed(state.activityFeed);
        }

        setTickCount(state.tickCount ?? 0);

        // Update heatmap accumulator from polled grid
        const acc = heatmapAccRef.current;
        for (const rowIdx of PARKING_ROW_INDICES) {
          for (let col = 0; col < SPOTS_PER_ROW; col++) {
            const sid = spotNumberForPosition(rowIdx, col);
            if (!sid) continue;
            if (state.grid[rowIdx][col].status === SpotStatus.NotASpot) continue;
            if (!acc[sid]) acc[sid] = { occupied: 0, total: 0 };
            acc[sid].total++;
            if (state.grid[rowIdx][col].status === SpotStatus.Occupied) acc[sid].occupied++;
          }
        }
        const hm: Record<number, number> = {};
        for (const [sid, counts] of Object.entries(acc)) {
          const c = counts as { occupied: number; total: number };
          hm[Number(sid)] = c.total > 0 ? c.occupied / c.total : 0;
        }
        setHeatmapData(hm);

        // Generate alerts from sensor states
        const keys = generatedAlertKeysRef.current;
        const now = new Date().toISOString();
        const newAlerts: Alert[] = [];

        for (const sensor of Object.values(state.sensors)) {
          const s = sensor as { spotId: number; sensorOnline: boolean; batteryPercent: number | null };
          if (!s.sensorOnline) {
            const key = `sensor_offline_${s.spotId}`;
            if (!keys.has(key)) {
              keys.add(key);
              newAlerts.push({
                id: key, timestamp: now, severity: "warning",
                message: `Sensor at Spot ${s.spotId} is offline — not responding`,
                spotId: s.spotId, type: "sensor_offline",
              });
            }
          }
          if (s.batteryPercent !== null && s.batteryPercent < 20) {
            const key = `battery_low_${s.spotId}`;
            if (!keys.has(key)) {
              keys.add(key);
              newAlerts.push({
                id: key, timestamp: now, severity: "warning",
                message: `Spot ${s.spotId} battery at ${s.batteryPercent}% — replace soon`,
                spotId: s.spotId, type: "battery_low",
              });
            }
          }
        }

        const statsNow = computeStats({ grid: state.grid, sensors: state.sensors, lastSync: state.lastSync, piZeroStatus: state.piZeroStatus, backendStatus: state.backendStatus });
        const occPct = Math.round((statsNow.occupied / statsNow.totalSpots) * 100);
        if (occPct > 85) {
          const key = `occupancy_high`;
          if (!keys.has(key)) {
            keys.add(key);
            newAlerts.push({ id: key, timestamp: now, severity: "critical", message: `Lot at ${occPct}% capacity — nearing full`, type: "occupancy_threshold" });
          }
        } else {
          keys.delete("occupancy_high");
        }

        if (newAlerts.length > 0) {
          setAlerts((prev) => [...newAlerts, ...prev].slice(0, 100));
        }
      } catch {
        // Will retry next interval
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  const stats = computeStats(data);
  const occupancyHistory = buildLiveHistory(serverTime, stats.occupied);
  const occupancyPercent = stats.totalSpots > 0 ? Math.round((stats.occupied / stats.totalSpots) * 100) : 0;
  const avgTimeParked = computeAvgTimeParked(serverTime);

  return (
    <ParkingDataContext.Provider
      value={{
        data,
        stats,
        occupancyHistory,
        alerts,
        resolveAlert,
        activityFeed,
        heatmapData,
        tickCount,
        serverTime,
        occupancyPercent,
        avgTimeParked,
      }}
    >
      {children}
    </ParkingDataContext.Provider>
  );
}

export function useParkingData(): ParkingDataContextValue {
  const ctx = useContext(ParkingDataContext);
  if (!ctx) throw new Error("useParkingData must be used within ParkingDataProvider");
  return ctx;
}

function computeStats(data: ParkingLotData): ParkingStats {
  let available = 0;
  let occupied = 0;
  let handicapAvailable = 0;
  let sensorsOnline = 0;
  let sensorsOffline = 0;

  for (const row of PARKING_ROW_INDICES) {
    for (let col = 0; col < SPOTS_PER_ROW; col++) {
      const spot = data.grid[row][col];
      if (spot.status === SpotStatus.NotASpot) continue;
      if (spot.status === SpotStatus.Occupied) {
        occupied++;
      } else {
        available++;
        if (spot.isHandicap) handicapAvailable++;
      }
    }
  }

  for (const sensor of Object.values(data.sensors)) {
    if (sensor.sensorOnline) sensorsOnline++;
    else sensorsOffline++;
  }

  return {
    totalSpots: TOTAL_NUMBERED_SPOTS - NOT_A_SPOT_POSITIONS.length - GRASS_POSITIONS.length,
    available,
    occupied,
    handicapTotal: HANDICAP_POSITIONS.length,
    handicapAvailable,
    sensorsOnline,
    sensorsOffline,
  };
}

function buildLiveHistory(
  serverTime: Date | null,
  currentOccupied: number
): OccupancyDataPoint[] {
  if (!serverTime) return [];

  const points: OccupancyDataPoint[] = [];
  const startOfDay = new Date(
    serverTime.getFullYear(),
    serverTime.getMonth(),
    serverTime.getDate()
  );

  const dayOfWeek = serverTime.getDay(); // 0=Sun, 1=Mon, ...
  const profile = DAY_PROFILES[dayOfWeek];
  const usableSpots = TOTAL_NUMBERED_SPOTS - NOT_A_SPOT_POSITIONS.length - GRASS_POSITIONS.length;

  let seed = startOfDay.getTime() % 2147483647;
  const seededRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 96; i++) {
    const time = new Date(startOfDay.getTime() + i * 15 * 60 * 1000);
    if (time > serverTime) break;

    const hour = i / 4;
    const fraction = interpolateProfile(profile, hour);
    // Add small noise for realism (±3% of usable spots)
    const noise = (seededRand() - 0.5) * 0.06 * usableSpots;
    const occupied = Math.min(usableSpots, Math.max(0, Math.round(fraction * usableSpots + noise)));

    points.push({
      timestamp: time.toISOString(),
      occupiedCount: occupied,
      availableCount: usableSpots - occupied,
    });
  }

  // Append current live value
  points.push({
    timestamp: serverTime.toISOString(),
    occupiedCount: currentOccupied,
    availableCount: usableSpots - currentOccupied,
  });

  return points;
}

/** Compute a realistic average parking duration based on time of day and day of week.
 *  College students typically park 1-4 hours depending on class schedule.
 *  Early arrivals park longer (full day), midday arrivals shorter (1-2 classes). */
function computeAvgTimeParked(serverTime: Date | null): string {
  if (!serverTime) return "--";

  const hour = serverTime.getHours() + serverTime.getMinutes() / 60;
  const day = serverTime.getDay();

  // Base avg minutes by time of day (increases as the day goes on since
  // cars that have been there longer pull the average up)
  let avgMin: number;
  if (hour < 7) {
    avgMin = 0; // lot basically empty
  } else if (hour < 9) {
    avgMin = 25 + (hour - 7) * 15; // 25-55 min, early arrivals just got there
  } else if (hour < 11) {
    avgMin = 55 + (hour - 9) * 25; // 55-105 min, mix of early + new
  } else if (hour < 14) {
    avgMin = 105 + (hour - 11) * 20; // 105-165 min, many have been there a while
  } else if (hour < 17) {
    avgMin = 165 + (hour - 14) * 25; // 165-240 min, remaining cars parked long
  } else if (hour < 20) {
    avgMin = 120 + (hour - 17) * (-15); // evening classes, shorter stays
  } else {
    avgMin = 75;
  }

  // Weekend adjustment — shorter avg stays
  if (day === 0 || day === 6) avgMin = Math.round(avgMin * 0.6);

  // Add a small deterministic jitter so it's not perfectly round
  const jitter = ((serverTime.getMinutes() * 7) % 11) - 5;
  avgMin = Math.max(0, Math.round(avgMin + jitter));

  if (avgMin === 0) return "--";
  const h = Math.floor(avgMin / 60);
  const m = avgMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
