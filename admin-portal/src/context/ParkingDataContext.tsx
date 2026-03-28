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
import {
  REAL_SPOT_ID,
  REAL_SPOT_ROW,
  REAL_SPOT_COL,
} from "@/lib/sensor";
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

  // Toggle a few random spots every 3-5 seconds.
  // Biases toward the day profile's target occupancy so the lot fills/empties realistically.
  // Skips offline sensors — they don't update.
  useEffect(() => {
    const usableSpots = TOTAL_NUMBERED_SPOTS - NOT_A_SPOT_POSITIONS.length - GRASS_POSITIONS.length;

    const interval = setInterval(() => {
      setData((prev) => {
        const newEvents: ActivityEvent[] = [];
        const newGrid = prev.grid.map((row) => row.map((spot) => ({ ...spot })));
        const newSensors = { ...prev.sensors };

        // Calculate current occupancy and target from day profile
        const now = new Date();
        const hour = now.getHours() + now.getMinutes() / 60;
        const dayOfWeek = now.getDay();
        const profile = DAY_PROFILES[dayOfWeek];
        const targetFraction = interpolateProfile(profile, hour);
        const targetOccupied = Math.round(targetFraction * usableSpots);

        // Count current occupied
        let currentOccupied = 0;
        for (const rowIdx of PARKING_ROW_INDICES) {
          for (let col = 0; col < SPOTS_PER_ROW; col++) {
            if (newGrid[rowIdx][col].status === SpotStatus.Occupied) currentOccupied++;
          }
        }

        // Bias: if below target, prefer filling; if above, prefer emptying
        const needMore = currentOccupied < targetOccupied;
        const diff = Math.abs(currentOccupied - targetOccupied);
        // More changes when further from target
        const numChanges = diff > 20 ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numChanges; i++) {
          const rowIdx =
            PARKING_ROW_INDICES[
              Math.floor(Math.random() * PARKING_ROW_INDICES.length)
            ];
          const col = Math.floor(Math.random() * SPOTS_PER_ROW);

          if (rowIdx === REAL_SPOT_ROW && col === REAL_SPOT_COL) continue;

          // Skip offline sensors — they can't report changes
          const spotId = spotNumberForPosition(rowIdx, col);
          if (spotId && newSensors[spotId] && !newSensors[spotId].sensorOnline) continue;

          const spot = newGrid[rowIdx][col];
          if (spot.status === SpotStatus.NotASpot) continue;
          const oldStatus = spot.status;

          if (spot.status === SpotStatus.Occupied && (!needMore || Math.random() < 0.2)) {
            newGrid[rowIdx][col] = {
              status: spot.isHandicap ? SpotStatus.Handicap : SpotStatus.Available,
              isHandicap: spot.isHandicap,
            };
          } else if (
            (spot.status === SpotStatus.Available || spot.status === SpotStatus.Handicap) &&
            (needMore || Math.random() < 0.2)
          ) {
            newGrid[rowIdx][col] = {
              status: SpotStatus.Occupied,
              isHandicap: spot.isHandicap,
            };
          }

          // Capture activity event if status changed
          if (spotId && newGrid[rowIdx][col].status !== oldStatus) {
            newEvents.push({
              id: `${Date.now()}-${spotId}`,
              timestamp: new Date().toISOString(),
              spotId,
              oldStatus,
              newStatus: newGrid[rowIdx][col].status,
              isHandicap: newGrid[rowIdx][col].isHandicap,
            });
          }
        }

        // Update heatmap accumulator
        const acc = heatmapAccRef.current;
        for (const rowIdx of PARKING_ROW_INDICES) {
          for (let col = 0; col < SPOTS_PER_ROW; col++) {
            const sid = spotNumberForPosition(rowIdx, col);
            if (!sid) continue;
            if (newGrid[rowIdx][col].status === SpotStatus.NotASpot) continue;
            if (!acc[sid]) acc[sid] = { occupied: 0, total: 0 };
            acc[sid].total++;
            if (newGrid[rowIdx][col].status === SpotStatus.Occupied) acc[sid].occupied++;
          }
        }

        // Sync sensor readings — only for online sensors
        for (const rowIdx of PARKING_ROW_INDICES) {
          for (let col = 0; col < SPOTS_PER_ROW; col++) {
            if (rowIdx === REAL_SPOT_ROW && col === REAL_SPOT_COL) continue;
            const sid = spotNumberForPosition(rowIdx, col);
            if (!sid || !newSensors[sid]) continue;
            // Don't update offline sensors
            if (!newSensors[sid].sensorOnline) continue;
            const spot = newGrid[rowIdx][col];
            const isOccupied = spot.status === SpotStatus.Occupied;
            newSensors[sid] = {
              ...newSensors[sid],
              distanceMm: isOccupied
                ? Math.floor(50 + Math.random() * 350)
                : Math.floor(1200 + Math.random() * 800),
              objectDetected: isOccupied,
              consecutiveDetections: isOccupied
                ? Math.floor(3 + Math.random() * 7)
                : 0,
              lastUpdated: new Date().toISOString(),
            };
          }
        }

        // Update activity feed from within the updater so events are captured synchronously
        if (newEvents.length > 0) {
          setActivityFeed((prevFeed) => [...newEvents, ...prevFeed].slice(0, 30));
        }

        return {
          ...prev,
          grid: newGrid,
          sensors: newSensors,
          lastSync: new Date().toISOString(),
        };
      });

      // Update heatmap data from accumulator
      const acc = heatmapAccRef.current;
      const hm: Record<number, number> = {};
      for (const [sid, counts] of Object.entries(acc)) {
        hm[Number(sid)] = counts.total > 0 ? counts.occupied / counts.total : 0;
      }
      setHeatmapData(hm);

      // Generate dynamic alerts from sensor states
      setData((currentData) => {
        const newAlerts: Alert[] = [];
        const keys = generatedAlertKeysRef.current;
        const now = new Date().toISOString();

        for (const sensor of Object.values(currentData.sensors)) {
          // Offline sensor alert
          if (!sensor.sensorOnline) {
            const key = `sensor_offline_${sensor.spotId}`;
            if (!keys.has(key)) {
              keys.add(key);
              newAlerts.push({
                id: key,
                timestamp: now,
                severity: "warning",
                message: `Sensor at Spot ${sensor.spotId} is offline — not responding`,
                spotId: sensor.spotId,
                type: "sensor_offline",
              });
            }
          }
          // Low battery alert
          if (sensor.batteryPercent !== null && sensor.batteryPercent < 20) {
            const key = `battery_low_${sensor.spotId}`;
            if (!keys.has(key)) {
              keys.add(key);
              newAlerts.push({
                id: key,
                timestamp: now,
                severity: "warning",
                message: `Spot ${sensor.spotId} battery at ${sensor.batteryPercent}% — replace soon`,
                spotId: sensor.spotId,
                type: "battery_low",
              });
            }
          }
        }

        // High occupancy alert
        const statsNow = computeStats(currentData);
        const occPct = Math.round((statsNow.occupied / statsNow.totalSpots) * 100);
        if (occPct > 85) {
          const key = `occupancy_high`;
          if (!keys.has(key)) {
            keys.add(key);
            newAlerts.push({
              id: key,
              timestamp: now,
              severity: "critical",
              message: `Lot at ${occPct}% capacity — nearing full`,
              type: "occupancy_threshold",
            });
          }
        } else {
          // Reset so it can fire again if occupancy drops and rises
          generatedAlertKeysRef.current.delete("occupancy_high");
        }

        if (newAlerts.length > 0) {
          setAlerts((prev) => [...newAlerts, ...prev].slice(0, 100));
        }

        return currentData; // no change to data
      });

      setTickCount((t) => t + 1);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // Poll real sensor data every 3 seconds
  useEffect(() => {
    const fetchRealSpot = async () => {
      try {
        const res = await fetch(`/api/parking/spot/${REAL_SPOT_ID}`);
        if (!res.ok) return;
        const sensor = await res.json();
        setData((prev) => {
          const newGrid = prev.grid.map((row) => row.map((s) => ({ ...s })));
          newGrid[REAL_SPOT_ROW][REAL_SPOT_COL] = {
            status: sensor.objectDetected ? SpotStatus.Occupied : SpotStatus.Available,
            isHandicap: false,
          };
          const newSensors = { ...prev.sensors, [REAL_SPOT_ID]: sensor };
          return { ...prev, grid: newGrid, sensors: newSensors };
        });
      } catch {
        // Will retry next interval
      }
    };

    fetchRealSpot();
    const interval = setInterval(fetchRealSpot, 3000);
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
