import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyPassword,
  issueSession,
  readAuthState,
  SESSION_COOKIE,
  verifyTotp,
} from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/login
 * Body: { username, password, code? }
 * If 2FA is enabled the client must include `code` (6-digit TOTP).
 * Responses:
 *   200 { ok: true }                      — session cookie set, route to /
 *   200 { ok: false, need2fa: true }      — credentials OK, 2FA code required
 *   401 { ok: false, error: "invalid" }   — bad credentials or bad code
 */
export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const { username = "", password = "", code } = body;
  const ok = await verifyPassword(username, password);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 401 });
  }

  const state = readAuthState();
  const needs2fa = state.twoFactor.enabled && !!state.twoFactor.secret;

  if (needs2fa) {
    if (!code) {
      return NextResponse.json({ ok: false, need2fa: true });
    }
    if (!verifyTotp(state.twoFactor.secret!, code)) {
      return NextResponse.json(
        { ok: false, error: "invalid_code", need2fa: true },
        { status: 401 }
      );
    }
  }

  const token = await issueSession({
    sub: username,
    twoFactorPassed: !needs2fa || true, // passed 2FA above if it was required
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
