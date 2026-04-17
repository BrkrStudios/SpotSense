import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { readGlobalConfig, writeGlobalConfig } from "@/lib/firebase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

  const config = await readGlobalConfig();
  const cameraThreshold = config?.neededHits ?? 5;

  return NextResponse.json({ cameraThreshold }, { headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const body = await request.json();
    const { cameraThreshold } = body;

    if (
      typeof cameraThreshold !== "number" ||
      !Number.isInteger(cameraThreshold) ||
      cameraThreshold < 1 ||
      cameraThreshold > 10
    ) {
      return NextResponse.json(
        { error: "cameraThreshold must be an integer between 1 and 10" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await writeGlobalConfig({ neededHits: cameraThreshold });

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[Config API] Error saving config:", err);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
