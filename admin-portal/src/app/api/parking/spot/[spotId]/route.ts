import { NextResponse } from "next/server";
import { getMockParkingData } from "@/lib/mock-data";
import { getRealSpotData, REAL_SPOT_ID } from "@/lib/sensor";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ spotId: string }> }
) {
  const { spotId: spotIdStr } = await params;
  const spotId = parseInt(spotIdStr, 10);

  if (isNaN(spotId) || spotId < 1 || spotId > 308) {
    return NextResponse.json(
      { error: "Invalid spot ID" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // For spot #220, return real sensor data
  if (spotId === REAL_SPOT_ID) {
    const realData = await getRealSpotData();
    if (realData) {
      return NextResponse.json(realData.sensor, { headers: CORS_HEADERS });
    }
  }

  // For all other spots, return mock sensor data
  const data = getMockParkingData();
  const sensor = data.sensors[spotId];
  if (!sensor) {
    return NextResponse.json(
      { error: "Spot not found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json(sensor, { headers: CORS_HEADERS });
}
