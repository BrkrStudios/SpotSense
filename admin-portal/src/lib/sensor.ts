/**
 * Server-only sensor data fetching.
 * This file imports firebase-admin and CANNOT be used in "use client" components.
 * For client-safe config, import from "./sensor-config" instead.
 */

import { SensorReading, SpotStatus } from "./types";
import { fetchLatestReadings } from "./firebase";
import { REAL_SPOTS } from "./sensor-config";

// Re-export everything from sensor-config for server-side consumers
export {
  REAL_SPOTS,
  REAL_SPOT_IDS,
  isRealSpot,
  isRealSpotPosition,
  getRealSpotByNumber,
} from "./sensor-config";
export type { RealSpotConfig } from "./sensor-config";

/* ------------------------------------------------------------------ */
/*  Embedded fallback data (used when Firebase is unreachable)         */
/* ------------------------------------------------------------------ */

interface RawSensorEntry {
  spotId: string;
  deviceId: string;
  occupied: boolean;
  distanceMm: number;
  timestamp: string;
}

const EMBEDDED_SENSOR_DATA: RawSensorEntry[] = [
  // A12 readings (spotsense-zero-001)
  { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 113, timestamp: "2026-03-24T23:48:23.371761+00:00" },
  { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 234, timestamp: "2026-03-24T23:48:27.149311+00:00" },
  { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 169, timestamp: "2026-03-24T23:48:24.436282+00:00" },
  { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 232, timestamp: "2026-03-24T23:48:26.051175+00:00" },
  { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 261, timestamp: "2026-03-24T23:48:30.982808+00:00" },
  { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 217, timestamp: "2026-03-24T23:48:27.699422+00:00" },
  // B1 readings (spotsense-zero-002)
  { spotId: "B1",  deviceId: "spotsense-zero-002", occupied: false, distanceMm: 1500, timestamp: "2026-03-28T16:34:38.498363+00:00" },
  { spotId: "B1",  deviceId: "spotsense-zero-002", occupied: true,  distanceMm: 40,   timestamp: "2026-03-28T02:44:07.538000+00:00" },
];

/* ------------------------------------------------------------------ */
/*  Data fetching                                                       */
/* ------------------------------------------------------------------ */

/**
 * Fetch real sensor data for ALL real spots.
 * Tries Firebase first, falls back to embedded data if Firestore is unreachable.
 * Returns a Record keyed by spot number.
 */
export async function getRealSpotsData(): Promise<
  Record<number, { status: SpotStatus; sensor: SensorReading }>
> {
  const result: Record<number, { status: SpotStatus; sensor: SensorReading }> = {};
  const firebaseSpotIds = REAL_SPOTS.map((s) => s.firebaseSpotId);

  let readings: Record<string, { occupied: boolean; distanceMm: number; timestamp: string; imagePath?: string; deviceId?: string }>;

  try {
    const firebaseData = await fetchLatestReadings(firebaseSpotIds);
    readings = {};
    for (const [spotId, data] of Object.entries(firebaseData)) {
      readings[spotId] = {
        occupied: data.occupied,
        distanceMm: data.distanceMm,
        timestamp: data.timestamp,
        imagePath: data.imagePath || undefined,
        deviceId: data.deviceId || undefined,
      };
    }
  } catch (err) {
    console.error("[sensor] Firebase fetch failed, using embedded fallback:", err);
    // Build readings from embedded data — pick latest per spotId
    readings = {};
    for (const entry of EMBEDDED_SENSOR_DATA) {
      const existing = readings[entry.spotId];
      if (!existing || new Date(entry.timestamp) > new Date(existing.timestamp)) {
        readings[entry.spotId] = {
          occupied: entry.occupied,
          distanceMm: entry.distanceMm,
          timestamp: entry.timestamp,
        };
      }
    }
  }

  // Map Firebase readings to our real spot configs
  for (const config of REAL_SPOTS) {
    const reading = readings[config.firebaseSpotId];
    if (!reading) continue;

    const isOccupied = reading.occupied;

    // Only use the image if it came from the correct Pi for this spot
    let snapshotUrl: string | null = null;
    if (reading.imagePath && reading.deviceId === config.deviceId) {
      snapshotUrl = reading.imagePath;
    }

    result[config.spotNumber] = {
      status: isOccupied ? SpotStatus.Occupied : SpotStatus.Available,
      sensor: {
        spotId: config.spotNumber,
        row: config.row,
        col: config.col,
        distanceMm: reading.distanceMm ?? 0,
        objectDetected: isOccupied,
        cameraSnapshotUrl: snapshotUrl,
        lastUpdated: reading.timestamp,
        batteryPercent: null,
        sensorOnline: true,
        consecutiveDetections: isOccupied ? 5 : 0,
      },
    };
  }

  return result;
}
