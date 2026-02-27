import {
  SpotStatus,
  ParkingSpot,
  ParkingLotData,
  SensorReading,
  ParkingStats,
  Alert,
  OccupancyDataPoint,
  SystemConfiguration,
} from "./types";
import {
  SPOTS_PER_ROW,
  TOTAL_ROWS,
  PARKING_ROW_INDICES,
  DRIVING_LANE_INDICES,
  HANDICAP_POSITIONS,
  TOTAL_NUMBERED_SPOTS,
} from "./constants";
import { spotNumberForPosition, seededRandom } from "./utils";

const todaySeed = Math.floor(Date.now() / 86400000);
const rand = seededRandom(todaySeed);

function buildGrid(): ParkingSpot[][] {
  const grid: ParkingSpot[][] = [];

  for (let row = 0; row < TOTAL_ROWS; row++) {
    const rowData: ParkingSpot[] = [];
    for (let col = 0; col < SPOTS_PER_ROW; col++) {
      if (DRIVING_LANE_INDICES.includes(row)) {
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

  // Randomly occupy ~45% of spots
  for (const row of PARKING_ROW_INDICES) {
    for (let col = 0; col < SPOTS_PER_ROW; col++) {
      if (grid[row][col].status === SpotStatus.NotASpot) continue;
      if (rand() < 0.45) {
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

  for (const row of PARKING_ROW_INDICES) {
    for (let col = 0; col < SPOTS_PER_ROW; col++) {
      const spotId = spotNumberForPosition(row, col);
      if (!spotId) continue;

      const spot = grid[row][col];
      const isOccupied = spot.status === SpotStatus.Occupied;
      const isOnline = rand() > 0.05; // 95% online rate
      const lastUpdatedOffset = Math.floor(rand() * 300000); // 0-5 min ago

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
        sensorOnline: isOnline,
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
      message: "Pi 5 restarted successfully",
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
    const baseOccupancy = Math.floor(curve * 170 + 20 + (rand() - 0.5) * 20);
    const occupied = Math.min(220, Math.max(0, baseOccupancy));

    points.push({
      timestamp: time.toISOString(),
      occupiedCount: occupied,
      availableCount: 220 - occupied,
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
    piFiveStatus: "online",
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
    totalSpots: TOTAL_NUMBERED_SPOTS,
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
