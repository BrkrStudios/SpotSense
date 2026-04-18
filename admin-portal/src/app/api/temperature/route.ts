import { NextResponse } from "next/server";
import { fetchTemperatureReadings } from "@/lib/temperature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/temperature
 * Returns { readings: TemperatureReading[] } — matches the shape of the
 * Python reference implementation. Session-gated by the existing auth
 * middleware (not in PUBLIC_PATHS, so unauthenticated requests get 401).
 */
export async function GET() {
  const readings = await fetchTemperatureReadings();
  return NextResponse.json({ readings });
}
