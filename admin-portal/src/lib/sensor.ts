import { SensorReading, SpotStatus } from "./types";

/**
 * Embedded sensor data from Pi Zero (spotsense-zero-001).
 * This is the real data for spot #308 (row 22, col 21).
 * When SENSOR_API_URL is set, this will be replaced by a live fetch.
 */
const EMBEDDED_SENSOR_DATA = {
  spots: [
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 113, timestamp: "2026-03-24T23:48:23.371761+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 234, timestamp: "2026-03-24T23:48:27.149311+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 169, timestamp: "2026-03-24T23:48:24.436282+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 232, timestamp: "2026-03-24T23:48:26.051175+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: false, distanceMm: 66,  timestamp: "2026-03-24T23:48:11.305685+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 239, timestamp: "2026-03-24T23:48:26.612888+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: false, distanceMm: 179, timestamp: "2026-03-24T23:48:13.400455+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 226, timestamp: "2026-03-24T23:48:25.507511+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 59,  timestamp: "2026-03-24T23:48:22.783591+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 261, timestamp: "2026-03-24T23:48:30.982808+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 270, timestamp: "2026-03-24T23:48:30.434196+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 263, timestamp: "2026-03-24T23:48:29.906438+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 301, timestamp: "2026-03-24T23:48:29.374754+00:00" },
    { spotId: "A12", deviceId: "spotsense-zero-001", occupied: true,  distanceMm: 271, timestamp: "2026-03-24T23:48:28.820108+00:00" },
    { spotId: null,  deviceId: null,                  occupied: true,  distanceMm: null, timestamp: 1773360992 },
  ],
};

interface RawSensorEntry {
  spotId: string | null;
  deviceId: string | null;
  occupied: boolean;
  distanceMm: number | null;
  timestamp: string | number;
}

/** The spot number in our grid that maps to the real sensor */
export const REAL_SPOT_ID = 308;
export const REAL_SPOT_ROW = 21;
export const REAL_SPOT_COL = 21;

/**
 * Get the latest valid reading from the sensor data.
 * Filters out entries with null spotId, then picks the most recent by timestamp.
 */
function getLatestReading(entries: RawSensorEntry[]): RawSensorEntry | null {
  const valid = entries.filter(
    (e) => e.spotId !== null && e.deviceId !== null && typeof e.timestamp === "string"
  );
  if (valid.length === 0) return null;

  valid.sort((a, b) => {
    const ta = new Date(a.timestamp as string).getTime();
    const tb = new Date(b.timestamp as string).getTime();
    return tb - ta;
  });

  return valid[0];
}

/**
 * Fetch real sensor data for spot #308.
 * If SENSOR_API_URL is set, fetches live from the Railway FastAPI endpoint.
 * Otherwise uses embedded data as fallback.
 */
export async function getRealSpotData(): Promise<{
  status: SpotStatus;
  sensor: SensorReading;
} | null> {
  let entries: RawSensorEntry[];

  const sensorUrl = process.env.SENSOR_API_URL;
  if (sensorUrl) {
    try {
      const res = await fetch(sensorUrl, { next: { revalidate: 0 } });
      const data = await res.json();
      entries = data.spots;
    } catch {
      // Fall back to embedded data if fetch fails
      entries = EMBEDDED_SENSOR_DATA.spots;
    }
  } else {
    entries = EMBEDDED_SENSOR_DATA.spots;
  }

  const latest = getLatestReading(entries);
  if (!latest) return null;

  const isOccupied = latest.occupied;

  return {
    status: isOccupied ? SpotStatus.Occupied : SpotStatus.Available,
    sensor: {
      spotId: REAL_SPOT_ID,
      row: REAL_SPOT_ROW,
      col: REAL_SPOT_COL,
      distanceMm: latest.distanceMm ?? 0,
      objectDetected: isOccupied,
      cameraSnapshotUrl: null,
      lastUpdated: latest.timestamp as string,
      batteryPercent: null,
      sensorOnline: true,
      consecutiveDetections: isOccupied ? 5 : 0,
    },
  };
}
