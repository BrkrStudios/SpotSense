import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifySession,
  SESSION_COOKIE,
  readAuthState,
  writeAuthState,
  verifyPassword,
  ADMIN_USERNAME,
} from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/2fa/disable  body: { password }
 * Requires the user to re-enter their password so a stolen session alone
 * can't silently turn 2FA off.
 */
export async function POST(req: NextRequest) {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const ok = await verifyPassword(ADMIN_USERNAME, body.password ?? "");
  if (!ok) {
    return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
  }

  const state = readAuthState();
  state.twoFactor = { enabled: false, secret: null };
  writeAuthState(state);

  return NextResponse.json({ ok: true });
}
