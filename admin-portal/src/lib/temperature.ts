/**
 * Read helpers for the `temperature_readings` Firestore collection.
 *
 * Firmware doc shape:
 *   {
 *     deviceId:    string,
 *     temperature: number (°C),
 *     mode:        "HEATING" | "COOLING",
 *     power:       number (deciwatts),
 *     timestamp:   ISO 8601 string,
 *   }
 *
 * Internal TemperatureReading is normalized — °C converted to °F,
 * modes lowercased, power scaled to watts. The rest of the app never
 * touches the raw firmware values.
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
    // Firmware reports power in deciwatts (e.g. "55" = 5.5 W). Scale to
    // watts at the boundary so the rest of the app deals in W.
    power: power / 10,
    timestamp,
  };
}

/**
 * Pull the latest reading per device from `temperature_readings`.
 *
 * Query pulls the N most recent docs sorted by timestamp descending
 * and keeps the first reading encountered per deviceId. Because the
 * sort is server-side, the first hit for a deviceId is guaranteed to
 * be the newest reading for that device.
 *
 * Falls back to the mock dataset on error or empty result.
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
