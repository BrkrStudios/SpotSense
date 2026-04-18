/**
 * Server-side access to the `temperature_readings` Firestore collection.
 *
 * Firmware doc shape (what the Pi actually writes):
 *   { deviceId: string,
 *     temperature: number  (Celsius),
 *     mode: "HEATING" | "COOLING"  (uppercase),
 *     power: number (W),
 *     timestamp: string (ISO, e.g. "2026-04-18T17:13:45.788914+00:00") }
 *
 * Our internal TemperatureReading is normalized:
 *   - temperature → Fahrenheit (converted at the boundary here)
 *   - mode       → lowercase "heating" | "cooling"
 *
 * This keeps the UI agnostic of firmware quirks — if a future firmware
 * version starts emitting Fahrenheit or lowercase modes, only this file
 * needs to change.
 *
 * Mirrors the approach in firebase.ts::fetchLatestReadings: equality-only
 * query, client-side dedup-by-deviceId picking the latest timestamp,
 * defensive validation, and a deterministic mock fallback when the
 * collection is empty (demo / Firebase unreachable).
 */

import { getDb } from "./firebase";

export type ClimateMode = "heating" | "cooling";

export interface TemperatureReading {
  deviceId: string;
  temperature: number; // °F (converted from firmware Celsius)
  mode: ClimateMode;
  power: number; // W
  timestamp: string; // ISO
}

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function coerceReading(raw: Record<string, unknown>): TemperatureReading | null {
  const deviceId = raw.deviceId;
  const temperatureC = raw.temperature;
  const modeRaw = raw.mode;
  const power = raw.power;
  const timestamp = raw.timestamp;

  if (typeof deviceId !== "string" || !deviceId) return null;
  if (typeof temperatureC !== "number" || !Number.isFinite(temperatureC)) return null;
  if (typeof modeRaw !== "string") return null;
  const modeLower = modeRaw.trim().toLowerCase();
  if (modeLower !== "heating" && modeLower !== "cooling") return null;
  if (typeof power !== "number" || !Number.isFinite(power)) return null;
  if (typeof timestamp !== "string" || !timestamp) return null;

  return {
    deviceId,
    temperature: celsiusToFahrenheit(temperatureC),
    mode: modeLower as ClimateMode,
    power,
    timestamp,
  };
}

/**
 * Pull the latest reading per device from `temperature_readings`.
 *
 * Strategy: ask Firestore for the most recent RECENT_DOC_LIMIT docs sorted
 * by timestamp descending, then keep the first reading we see per deviceId
 * (which is guaranteed to be the newest for that device because of the
 * server-side sort). This is both:
 *
 *   - Correct: we never accidentally surface a stale reading if a later
 *     one exists for the same device.
 *   - Cheap: a single indexed query with a hard ceiling, instead of a
 *     full collection scan that grows with history.
 *
 * Falls through to the mock dataset on error or when nothing comes back
 * so the dashboard stays useful in demo mode.
 */
const RECENT_DOC_LIMIT = 500;

export async function fetchTemperatureReadings(): Promise<TemperatureReading[]> {
  try {
    const firestore = getDb();
    const snap = await firestore
      .collection("temperature_readings")
      .orderBy("timestamp", "desc")
      .limit(RECENT_DOC_LIMIT)
      .get();

    if (snap.empty) return getMockTemperatureReadings();

    // Server already sorted newest-first; first hit per deviceId wins.
    const latestByDevice = new Map<string, TemperatureReading>();
    for (const doc of snap.docs) {
      const reading = coerceReading(doc.data());
      if (!reading) continue;
      if (!latestByDevice.has(reading.deviceId)) {
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
