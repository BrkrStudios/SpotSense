import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE, readAuthState } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const state = readAuthState();
  return NextResponse.json({
    authenticated: true,
    user: {
      username: session.sub,
      memberSince: state.createdAt,
      twoFactorEnabled: state.twoFactor.enabled,
    },
  });
}
