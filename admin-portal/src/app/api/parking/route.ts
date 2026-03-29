import { NextResponse } from "next/server";
import { getMockParkingData } from "@/lib/mock-data";
import { REAL_SPOTS, getRealSpotsData } from "@/lib/sensor";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  // Start with all demo data
  const data = getMockParkingData();

  // Deep-clone grid and sensors so we don't mutate the cached mock
  const grid = data.grid.map((row) => row.map((spot) => ({ ...spot })));
  const sensors = { ...data.sensors };

  // Overlay real sensor data for all real spots
  const realDataMap = await getRealSpotsData();

  for (const config of REAL_SPOTS) {
    const realData = realDataMap[config.spotNumber];
    if (realData) {
      grid[config.row][config.col] = {
        status: realData.status,
        isHandicap: false,
      };
      sensors[config.spotNumber] = realData.sensor;
    }
  }

  const onlineCount = Object.keys(realDataMap).length;
  const piZeroStatus =
    onlineCount === REAL_SPOTS.length
      ? "online"
      : onlineCount > 0
        ? "degraded"
        : "offline";

  return NextResponse.json(
    {
      grid,
      sensors,
      lastSync: new Date().toISOString(),
      piZeroStatus,
      backendStatus: "online",
    },
    { headers: CORS_HEADERS }
  );
}
