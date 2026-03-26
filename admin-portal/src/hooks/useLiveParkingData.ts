"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ParkingLotData,
  ParkingStats,
  ParkingSpot,
  SpotStatus,
  Alert,
  OccupancyDataPoint,
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

/**
 * Provides live-updating parking data.
 * Every few seconds, 1-3 spots randomly toggle between occupied/available
 * to simulate cars arriving and leaving.
 */
export function useLiveParkingData(serverTime: Date | null) {
  const [data, setData] = useState<ParkingLotData>(() => getMockParkingData());
  const [tickCount, setTickCount] = useState(0);

  // Toggle a few random spots every 3-5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        // Deep-clone the grid
        const newGrid = prev.grid.map((row) => row.map((spot) => ({ ...spot })));

        // Toggle 1-3 random spots (skip real spot #220)
        const numChanges = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numChanges; i++) {
          const rowIdx =
            PARKING_ROW_INDICES[
              Math.floor(Math.random() * PARKING_ROW_INDICES.length)
            ];
          const col = Math.floor(Math.random() * SPOTS_PER_ROW);

          // Never toggle the real sensor spot
          if (rowIdx === REAL_SPOT_ROW && col === REAL_SPOT_COL) continue;

          const spot = newGrid[rowIdx][col];

          if (spot.status === SpotStatus.Occupied) {
            // Car leaves
            newGrid[rowIdx][col] = {
              status: spot.isHandicap ? SpotStatus.Handicap : SpotStatus.Available,
              isHandicap: spot.isHandicap,
            };
          } else if (
            spot.status === SpotStatus.Available ||
            spot.status === SpotStatus.Handicap
          ) {
            // Car arrives
            newGrid[rowIdx][col] = {
              status: SpotStatus.Occupied,
              isHandicap: spot.isHandicap,
            };
          }
        }

        // Update sensor readings for changed spots (skip real spot #220)
        const newSensors = { ...prev.sensors };
        for (const rowIdx of PARKING_ROW_INDICES) {
          for (let col = 0; col < SPOTS_PER_ROW; col++) {
            if (rowIdx === REAL_SPOT_ROW && col === REAL_SPOT_COL) continue;
            const spotId = spotNumberForPosition(rowIdx, col);
            if (!spotId || !newSensors[spotId]) continue;
            const spot = newGrid[rowIdx][col];
            const isOccupied = spot.status === SpotStatus.Occupied;
            newSensors[spotId] = {
              ...newSensors[spotId],
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

        return {
          ...prev,
          grid: newGrid,
          sensors: newSensors,
          lastSync: new Date().toISOString(),
        };
      });
      setTickCount((t) => t + 1);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // Poll real sensor data for spot #220 every 3 seconds
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
        // Silently ignore fetch errors — will retry next interval
      }
    };

    fetchRealSpot();
    const interval = setInterval(fetchRealSpot, 3000);
    return () => clearInterval(interval);
  }, []);

  // Compute stats from current grid
  const stats: ParkingStats = computeStats(data);

  // Build occupancy history up to current server time
  const occupancyHistory = buildLiveHistory(serverTime, stats.occupied);

  // Alerts stay static (they're historical)
  const alerts = getMockAlerts();

  return { data, stats, occupancyHistory, alerts, tickCount };
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

/**
 * Generate occupancy history from midnight up to serverTime.
 * Uses a bell curve peaking at 12:30pm, plus we append the current
 * live occupied count as the last data point.
 */
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

  // Seeded random for consistent historical curve
  let seed = startOfDay.getTime() % 2147483647;
  const seededRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 96; i++) {
    const time = new Date(startOfDay.getTime() + i * 15 * 60 * 1000);
    if (time > serverTime) break;

    const hour = i / 4;
    const peak = 12.5;
    const sigma = 3.5;
    const curve = Math.exp(-Math.pow(hour - peak, 2) / (2 * sigma * sigma));
    const usableSpots = TOTAL_NUMBERED_SPOTS - NOT_A_SPOT_POSITIONS.length - GRASS_POSITIONS.length;
    const baseOccupancy = Math.floor(
      curve * 195 + 20 + (seededRand() - 0.5) * 20
    );
    const occupied = Math.min(usableSpots, Math.max(0, baseOccupancy));

    points.push({
      timestamp: time.toISOString(),
      occupiedCount: occupied,
      availableCount: usableSpots - occupied,
    });
  }

  // Append the current live count as the latest data point
  const usableSpots = TOTAL_NUMBERED_SPOTS - NOT_A_SPOT_POSITIONS.length;
  points.push({
    timestamp: serverTime.toISOString(),
    occupiedCount: currentOccupied,
    availableCount: usableSpots - currentOccupied,
  });

  return points;
}
