export enum SpotStatus {
  Occupied = 1,
  Available = 2,
  NotASpot = 3,
  Handicap = 4,
}

export interface ParkingSpot {
  status: SpotStatus;
  isHandicap: boolean;
}

export interface SensorReading {
  spotId: number;
  row: number;
  col: number;
  distanceMm: number;
  objectDetected: boolean;
  cameraSnapshotUrl: string | null;
  lastUpdated: string;
  batteryPercent: number | null;
  sensorOnline: boolean;
  consecutiveDetections: number;
}

export interface ParkingLotData {
  grid: ParkingSpot[][];
  sensors: Record<number, SensorReading>;
  lastSync: string;
  piZeroStatus: "online" | "offline" | "degraded";
  backendStatus: "online" | "offline" | "degraded";
}

export interface ParkingStats {
  totalSpots: number;
  available: number;
  occupied: number;
  handicapTotal: number;
  handicapAvailable: number;
  sensorsOnline: number;
  sensorsOffline: number;
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: "info" | "warning" | "critical";
  message: string;
  spotId?: number;
  type:
    | "sensor_offline"
    | "battery_low"
    | "connection_lost"
    | "occupancy_threshold"
    | "system";
  resolved?: boolean;
  resolvedAt?: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  spotId: number;
  oldStatus: SpotStatus;
  newStatus: SpotStatus;
  isHandicap: boolean;
}

export interface DailyOccupancyProfile {
  date: string;
  dayOfWeek: number;
  points: OccupancyDataPoint[];
  peakOccupied: number;
  peakHour: number;
  avgOccupancy: number;
  turnoverRate: number;
}

export interface WeeklyStats {
  avgOccupancyByDay: number[];
  peakHourByDay: number[];
  busiestDay: number;
  avgTurnoverRate: number;
}

export interface OccupancyDataPoint {
  timestamp: string;
  occupiedCount: number;
  availableCount: number;
}
