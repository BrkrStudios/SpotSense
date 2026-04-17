import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifySession,
  SESSION_COOKIE,
  readAuthState,
  writeAuthState,
  verifyTotp,
  issueSession,
} from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/2fa/verify   body: { code }
 * Completes enrollment. On success:
 *   - flips twoFactor.enabled = true
 *   - re-issues the session with twoFactorPassed=true so the current user
 *     doesn't get locked out immediately
 */
export async function POST(req: NextRequest) {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const code = body.code ?? "";

  const state = readAuthState();
  if (!state.twoFactor.secret) {
    return NextResponse.json({ error: "no_setup_in_progress" }, { status: 400 });
  }

  if (!verifyTotp(state.twoFactor.secret, code)) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 401 });
  }

  state.twoFactor.enabled = true;
  writeAuthState(state);

  const token = await issueSession({ sub: session.sub, twoFactorPassed: true });
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
