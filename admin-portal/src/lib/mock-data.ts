import {
  SpotStatus,
  ParkingSpot,
  ParkingLotData,
  SensorReading,
  ParkingStats,
  Alert,
  OccupancyDataPoint,
  SystemConfiguration,
  DailyOccupancyProfile,
  WeeklyStats,
} from "./types";
import { DAY_PROFILES, interpolateProfile } from "./occupancy-profiles";
import {
  SPOTS_PER_ROW,
  TOTAL_ROWS,
  PARKING_ROW_INDICES,
  DRIVING_LANE_INDICES,
  HANDICAP_POSITIONS,
  NOT_A_SPOT_POSITIONS,
  GRASS_POSITIONS,
  TOTAL_NUMBERED_SPOTS,
} from "./constants";
import { spotNumberForPosition, seededRandom } from "./utils";
import { REAL_SPOTS } from "./sensor-config";

const UNUSABLE_COUNT = NOT_A_SPOT_POSITIONS.length + GRASS_POSITIONS.length;

/** Returns a realistic occupancy fraction based on current day/time.
 *  Simplified version of the full day profiles used in the context. */
function getRealisticFillRate(): number {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;

  // Peak occupancy fraction by day: Mon/Wed ~93-96%, Tue/Thu ~83%, Fri ~84%, Sat ~22%, Sun ~12%
  const peakByDay = [0.12, 0.93, 0.83, 0.96, 0.83, 0.84, 0.22];
  const peak = peakByDay[day];

  // Time-of-day curve (fraction of peak): ramps 7-10, peaks 10-13, drops 13-18
  let timeFactor: number;
  if (hour < 6) timeFactor = 0.03;
  else if (hour < 7) timeFactor = 0.05;
  else if (hour < 8) timeFactor = 0.25;
  else if (hour < 9) timeFactor = 0.55;
  else if (hour < 10) timeFactor = 0.80;
  else if (hour < 13) timeFactor = 1.0;
  else if (hour < 14) timeFactor = 0.90;
  else if (hour < 15) timeFactor = 0.75;
  else if (hour < 16) timeFactor = 0.55;
  else if (hour < 17) timeFactor = 0.35;
  else if (hour < 18) timeFactor = 0.20;
  else if (hour < 20) timeFactor = 0.10;
  else timeFactor = 0.05;

  return peak * timeFactor;
}

const todaySeed = Math.floor(Date.now() / 86400000);
const rand = seededRandom(todaySeed);

function buildGrid(): ParkingSpot[][] {
  const grid: ParkingSpot[][] = [];

  for (let row = 0; row < TOTAL_ROWS; row++) {
    const rowData: ParkingSpot[] = [];
    for (let col = 0; col < SPOTS_PER_ROW; col++) {
      if (DRIVING_LANE_INDICES.includes(row)) {
        rowData.push({ status: SpotStatus.NotASpot, isHandicap: false });
      } else if (GRASS_POSITIONS.some(([r, c]) => r === row && c === col)) {
        rowData.push({ status: SpotStatus.NotASpot, isHandicap: false });
      } else if (NOT_A_SPOT_POSITIONS.some(([r, c]) => r === row && c === col)) {
        rowData.push({ status: SpotStatus.NotASpot, isHandicap: false });
      } else {
        const isHC = HANDICAP_POSITIONS.some(
          ([r, c]) => r === row && c === col
        );
        if (isHC) {
          rowData.push({ status: SpotStatus.Handicap, isHandicap: true });
        } else {
          rowData.push({ status: SpotStatus.Available, isHandicap: false });
        }
      }
    }
    grid.push(rowData);
  }

  // Occupy spots based on realistic day-of-week / time-of-day profile
  // Bias: top-left spots fill first (closest to building entrance)
  const fillRate = getRealisticFillRate();
  const totalParkingRows = PARKING_ROW_INDICES.length;
  for (let ri = 0; ri < totalParkingRows; ri++) {
    const row = PARKING_ROW_INDICES[ri];
    for (let col = 0; col < SPOTS_PER_ROW; col++) {
      if (grid[row][col].status === SpotStatus.NotASpot) continue;

      // Proximity bias: top-left is most desirable, bottom-right least
      const rowFactor = ri / (totalParkingRows - 1);
      const colFactor = col / (SPOTS_PER_ROW - 1);
      // Combined distance from "entrance" (top-left), row weighted slightly more
      const distance = rowFactor * 0.6 + colFactor * 0.4;
      // Boost probability for close spots, reduce for far ones
      const spotProb = fillRate * (1 + (1 - distance) * 1.4 - distance * 0.7);
      const clampedProb = Math.max(0, Math.min(1, spotProb));

      if (rand() < clampedProb) {
        grid[row][col] = {
          status: SpotStatus.Occupied,
          isHandicap: grid[row][col].isHandicap,
        };
      }
    }
  }

  return grid;
}

function buildSensors(
  grid: ParkingSpot[][]
): Record<number, SensorReading> {
  const sensors: Record<number, SensorReading> = {};
  const now = Date.now();

  // Pick 1-4 random spots to be offline (realistic — most sensors work fine)
  const allUsableSpots: number[] = [];
  for (const row of PARKING_ROW_INDICES) {
    for (let col = 0; col < SPOTS_PER_ROW; col++) {
      const spot = grid[row][col];
      if (spot.status === SpotStatus.NotASpot) continue;
      const spotId = spotNumberForPosition(row, col);
      if (spotId) allUsableSpots.push(spotId);
    }
  }
  const numOffline = 1 + Math.floor(rand() * 4); // 1-4 offline
  const offlineSet = new Set<number>();
  while (offlineSet.size < numOffline) {
    const idx = Math.floor(rand() * allUsableSpots.length);
    offlineSet.add(allUsableSpots[idx]);
  }
  // Never mark real hardware spots as offline
  for (const config of REAL_SPOTS) {
    offlineSet.delete(config.spotNumber);
  }

  for (const row of PARKING_ROW_INDICES) {
    for (let col = 0; col < SPOTS_PER_ROW; col++) {
      const spotId = spotNumberForPosition(row, col);
      if (!spotId) continue;

      const spot = grid[row][col];
      if (spot.status === SpotStatus.NotASpot) continue;
      const isOffline = offlineSet.has(spotId);
      const isOccupied = spot.status === SpotStatus.Occupied;
      const lastUpdatedOffset = isOffline
        ? Math.floor(600000 + rand() * 3600000) // offline: 10min-1hr stale
        : Math.floor(rand() * 300000); // online: 0-5 min ago

      sensors[spotId] = {
        spotId,
        row,
        col,
        distanceMm: isOccupied
          ? Math.floor(50 + rand() * 350) // 50-400mm when car present
          : Math.floor(1200 + rand() * 800), // 1200-2000mm when empty
        objectDetected: isOccupied,
        cameraSnapshotUrl: null,
        lastUpdated: new Date(now - lastUpdatedOffset).toISOString(),
        batteryPercent: Math.floor(70 + rand() * 30),
        sensorOnline: !isOffline,
        consecutiveDetections: isOccupied
          ? Math.floor(3 + rand() * 7)
          : 0,
      };
    }
  }

  return sensors;
}

function buildAlerts(): Alert[] {
  const now = Date.now();
  const alerts: Alert[] = [
    {
      id: "a1",
      timestamp: new Date(now - 120000).toISOString(),
      severity: "critical",
      message: "Sensor offline — Spot 47",
      spotId: 47,
      type: "sensor_offline",
    },
    {
      id: "a2",
      timestamp: new Date(now - 300000).toISOString(),
      severity: "warning",
      message: "Battery low (72%) — Spot 128",
      spotId: 128,
      type: "battery_low",
    },
    {
      id: "a3",
      timestamp: new Date(now - 600000).toISOString(),
      severity: "info",
      message: "Occupancy above 80% threshold",
      type: "occupancy_threshold",
    },
    {
      id: "a4",
      timestamp: new Date(now - 900000).toISOString(),
      severity: "warning",
      message: "Sensor offline — Spot 195",
      spotId: 195,
      type: "sensor_offline",
    },
    {
      id: "a5",
      timestamp: new Date(now - 1800000).toISOString(),
      severity: "info",
      message: "Backend API restarted successfully",
      type: "system",
    },
    {
      id: "a6",
      timestamp: new Date(now - 3600000).toISOString(),
      severity: "critical",
      message: "Pi 0 connection lost for 30s",
      type: "connection_lost",
    },
    {
      id: "a7",
      timestamp: new Date(now - 5400000).toISOString(),
      severity: "info",
      message: "Configuration updated — polling interval changed",
      type: "system",
    },
    {
      id: "a8",
      timestamp: new Date(now - 7200000).toISOString(),
      severity: "warning",
      message: "Battery low (75%) — Spot 89",
      spotId: 89,
      type: "battery_low",
    },
  ];
  return alerts;
}

function buildOccupancyHistory(): OccupancyDataPoint[] {
  const points: OccupancyDataPoint[] = [];
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  for (let i = 0; i < 96; i++) {
    // every 15 min for 24h
    const time = new Date(startOfDay.getTime() + i * 15 * 60 * 1000);
    if (time > now) break;

    // Bell curve peaking around 12:00-13:00
    const hour = i / 4;
    const peak = 12.5;
    const sigma = 3.5;
    const curve = Math.exp(-Math.pow(hour - peak, 2) / (2 * sigma * sigma));
    const usableSpots = TOTAL_NUMBERED_SPOTS - UNUSABLE_COUNT;
    const baseOccupancy = Math.floor(curve * 195 + 20 + (rand() - 0.5) * 20);
    const occupied = Math.min(usableSpots, Math.max(0, baseOccupancy));

    points.push({
      timestamp: time.toISOString(),
      occupiedCount: occupied,
      availableCount: usableSpots - occupied,
    });
  }

  return points;
}

// Cached data so it stays consistent within a session
let cachedData: ParkingLotData | null = null;

export function getMockParkingData(): ParkingLotData {
  if (cachedData) return cachedData;

  const grid = buildGrid();
  const sensors = buildSensors(grid);

  cachedData = {
    grid,
    sensors,
    lastSync: new Date().toISOString(),
    piZeroStatus: "online",
    backendStatus: "online",
  };

  return cachedData;
}

export function getMockStats(): ParkingStats {
  const data = getMockParkingData();
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
    totalSpots: TOTAL_NUMBERED_SPOTS - UNUSABLE_COUNT,
    available,
    occupied,
    handicapTotal: HANDICAP_POSITIONS.length,
    handicapAvailable,
    sensorsOnline,
    sensorsOffline,
  };
}

export function getMockAlerts(): Alert[] {
  return buildAlerts();
}

export function getMockOccupancyHistory(): OccupancyDataPoint[] {
  return buildOccupancyHistory();
}

/** Generate historical daily occupancy profiles for the past N days */
export function generateHistoricalData(numDays: number = 14): DailyOccupancyProfile[] {
  const today = new Date();
  const usableSpots = TOTAL_NUMBERED_SPOTS - UNUSABLE_COUNT;
  const results: DailyOccupancyProfile[] = [];

  for (let d = numDays - 1; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dayOfWeek = date.getDay();
    const profile = DAY_PROFILES[dayOfWeek];
    const dateStr = date.toISOString().split("T")[0];

    // Seeded random for consistent data per date
    let seed = (date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()) % 2147483647;
    const seededRand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const points: OccupancyDataPoint[] = [];
    let peakOccupied = 0;
    let peakHour = 0;
    let totalOccupancy = 0;
    let totalArrivals = 0;
    let prevOccupied = 0;

    for (let i = 0; i < 96; i++) {
      const hour = i / 4;
      const time = new Date(date);
      time.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

      // For today, stop at current time
      if (d === 0 && time > today) break;

      const fraction = interpolateProfile(profile, hour);
      const noise = (seededRand() - 0.5) * 0.06 * usableSpots;
      const occupied = Math.min(usableSpots, Math.max(0, Math.round(fraction * usableSpots + noise)));

      points.push({
        timestamp: time.toISOString(),
        occupiedCount: occupied,
        availableCount: usableSpots - occupied,
      });

      if (occupied > peakOccupied) {
        peakOccupied = occupied;
        peakHour = hour;
      }
      totalOccupancy += occupied / usableSpots;

      // Estimate arrivals from deltas
      if (i > 0 && occupied > prevOccupied) {
        totalArrivals += occupied - prevOccupied;
      }
      prevOccupied = occupied;
    }

    const numPoints = points.length || 1;
    results.push({
      date: dateStr,
      dayOfWeek,
      points,
      peakOccupied,
      peakHour,
      avgOccupancy: totalOccupancy / numPoints,
      turnoverRate: Math.round((totalArrivals / usableSpots) * 10) / 10,
    });
  }

  return results;
}

/** Compute weekly aggregate stats from daily profiles */
export function computeWeeklyStats(data: DailyOccupancyProfile[]): WeeklyStats {
  const byDay: number[][] = [[], [], [], [], [], [], []];
  const peakByDay: number[][] = [[], [], [], [], [], [], []];
  let totalTurnover = 0;
  let count = 0;

  for (const day of data) {
    byDay[day.dayOfWeek].push(day.avgOccupancy);
    peakByDay[day.dayOfWeek].push(day.peakHour);
    totalTurnover += day.turnoverRate;
    count++;
  }

  const avgOccupancyByDay = byDay.map((arr) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  );
  const peakHourByDay = peakByDay.map((arr) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
  );

  let busiestDay = 0;
  let maxOcc = 0;
  for (let i = 0; i < 7; i++) {
    if (avgOccupancyByDay[i] > maxOcc) {
      maxOcc = avgOccupancyByDay[i];
      busiestDay = i;
    }
  }

  return {
    avgOccupancyByDay,
    peakHourByDay,
    busiestDay,
    avgTurnoverRate: count > 0 ? Math.round((totalTurnover / count) * 10) / 10 : 0,
  };
}

export function getMockConfig(): SystemConfiguration {
  return {
    pollingIntervalMs: 1000,
    cameraThreshold: 3,
    spotDesignations: HANDICAP_POSITIONS.map(([r, c]) => ({
      spotId: spotNumberForPosition(r, c)!,
      designation: "handicap" as const,
    })),
  };
}
