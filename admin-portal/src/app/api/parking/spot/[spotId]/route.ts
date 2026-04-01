import { NextResponse } from "next/server";
import { getMockParkingData } from "@/lib/mock-data";
import { isRealSpot, getRealSpotsData } from "@/lib/sensor";
import { TOTAL_NUMBERED_SPOTS } from "@/lib/constants";
import { validateApiKey } from "@/lib/api-auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ spotId: string }> }
) {
  if (!validateApiKey(_request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }
  const { spotId: spotIdStr } = await params;
  const spotId = parseInt(spotIdStr, 10);

  if (isNaN(spotId) || spotId < 1 || spotId > TOTAL_NUMBERED_SPOTS) {
    return NextResponse.json(
      { error: "Invalid spot ID" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // For real spots, return live Firebase data
  if (isRealSpot(spotId)) {
    const realDataMap = await getRealSpotsData();
    const realData = realDataMap[spotId];
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
