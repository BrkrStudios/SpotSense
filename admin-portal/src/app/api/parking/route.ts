import { NextResponse } from "next/server";
import { getMockParkingData } from "@/lib/mock-data";
import { getRealSpotData, REAL_SPOT_ROW, REAL_SPOT_COL, REAL_SPOT_ID } from "@/lib/sensor";

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

  // Overlay real sensor data for spot #220
  const realData = await getRealSpotData();
  if (realData) {
    grid[REAL_SPOT_ROW][REAL_SPOT_COL] = {
      status: realData.status,
      isHandicap: false,
    };
    sensors[REAL_SPOT_ID] = realData.sensor;
  }

  return NextResponse.json(
    {
      grid,
      sensors,
      lastSync: new Date().toISOString(),
      piZeroStatus: realData ? "online" : "offline",
      piFiveStatus: "online",
    },
    { headers: CORS_HEADERS }
  );
}
