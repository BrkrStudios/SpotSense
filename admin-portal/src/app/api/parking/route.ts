import { NextResponse } from "next/server";
import { getSimulationState } from "@/lib/parking-simulation";
import { validateApiKey } from "@/lib/api-auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const state = getSimulationState();

  return NextResponse.json(state, { headers: CORS_HEADERS });
}
