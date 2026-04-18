/**
 * Server-side access to the `temperature_readings` Firestore collection.
 *
 * Each doc shape (as pushed by the Pi devices):
 *   { deviceId: string, temperature: number (°F), mode: "heating"|"cooling",
 *     power: number (W), timestamp: string }
 *
 * This module mirrors the approach in firebase.ts::fetchLatestReadings:
 * equality-only query (no composite index), client-side sort to pick the
 * latest reading per device, defensive validation, and a deterministic
 * mock fallback when the collection is empty or unreachable.
 */

import { getDb } from "./firebase";

export type ClimateMode = "heating" | "cooling";

export interface TemperatureReading {
  deviceId: string;
  temperature: number; // °F
  mode: ClimateMode;
  power: number; // W
  timestamp: string; // ISO
}

function isClimateMode(v: unknown): v is ClimateMode {
  return v === "heating" || v === "cooling";
}

function coerceReading(raw: Record<string, unknown>): TemperatureReading | null {
  const deviceId = raw.deviceId;
  const temperature = raw.temperature;
  const mode = raw.mode;
  const power = raw.power;
  const timestamp = raw.timestamp;

  if (typeof deviceId !== "string" || !deviceId) return null;
  if (typeof temperature !== "number" || !Number.isFinite(temperature)) return null;
  if (!isClimateMode(mode)) return null;
  if (typeof power !== "number" || !Number.isFinite(power)) return null;
  if (typeof timestamp !== "string" || !timestamp) return null;

  return { deviceId, temperature, mode, power, timestamp };
}

/**
 * Pull the latest reading per device from `temperature_readings`.
 * Falls through to the mock dataset on error or when nothing comes back —
 * keeps the dashboard useful in demo mode where the collection may be empty.
 */
export async function fetchTemperatureReadings(): Promise<TemperatureReading[]> {
  try {
    const firestore = getDb();
    const snap = await firestore.collection("temperature_readings").get();
    if (snap.empty) return getMockTemperatureReadings();

    // Keep the freshest reading per deviceId.
    const latestByDevice = new Map<string, TemperatureReading>();
    for (const doc of snap.docs) {
      const reading = coerceReading(doc.data());
      if (!reading) continue;
      const prev = latestByDevice.get(reading.deviceId);
      if (!prev || reading.timestamp > prev.timestamp) {
        latestByDevice.set(reading.deviceId, reading);
      }
    }

    const readings = Array.from(latestByDevice.values());
    return readings.length > 0 ? readings : getMockTemperatureReadings();
  } catch (err) {
    console.error("[temperature] Firestore fetch failed, using mock:", err);
    return getMockTemperatureReadings();
  }
}

/**
 * Deterministic mock: 12 plausible HVAC readings for a small campus lot.
 * Seeded by day so the number doesn't jitter every refresh but does drift
 * slowly between days.
 */
export function getMockTemperatureReadings(): TemperatureReading[] {
  const now = new Date();
  const dayStamp =
    now.getFullYear() * 10000 +
    (now.getMonth() + 1) * 100 +
    now.getDate();
  let seed = dayStamp % 2147483647;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Outdoor-driven HVAC target: heat when "cold" morning, cool when "warm" afternoon.
  const hour = now.getHours() + now.getMinutes() / 60;
  const heatingBias = hour < 10 ? 0.75 : hour < 16 ? 0.2 : 0.55;

  const readings: TemperatureReading[] = [];
  for (let i = 1; i <= 12; i++) {
    const mode: ClimateMode = rand() < heatingBias ? "heating" : "cooling";
    const baseTemp = mode === "heating" ? 69 : 73;
    const temperature = Math.round((baseTemp + (rand() - 0.5) * 4) * 10) / 10;
    const basePower = mode === "heating" ? 3.4 : 2.9;
    const power = Math.round((basePower + (rand() - 0.5) * 1.2) * 10) / 10;
    readings.push({
      deviceId: `pi-${String(i).padStart(2, "0")}`,
      temperature,
      mode,
      power,
      timestamp: now.toISOString(),
    });
  }
  return readings;
}
