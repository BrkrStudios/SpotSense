import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyPassword,
  issueSession,
  readAuthState,
  SESSION_COOKIE,
  verifyTotp,
} from "@/lib/auth";
import {
  checkRateLimit,
  recordFailure,
  clearFailures,
  getClientIp,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/auth/login
 * Body: { username, password, code? }
 *
 * Responses:
 *   200 { ok: true }                                   — session cookie set
 *   200 { ok: false, need2fa: true }                   — password OK, code required
 *   401 { ok: false, error: "invalid", attemptsLeft }  — bad creds (counts as failure)
 *   401 { ok: false, error: "invalid_code", need2fa }  — bad TOTP  (counts as failure)
 *   429 { ok: false, error: "rate_limited", retryAfterSec } — IP locked out
 *
 * Rate limiting is per-IP: 5 failures in 15 min → 15 min lockout. Successful
 * login clears the bucket. Only /api/auth/login applies this limit —
 * /api/parking (iOS) uses its own x-api-key check and is unaffected.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // 1) Reject early if the IP is already locked out.
  const pre = checkRateLimit(ip);
  if (!pre.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryAfterSec: pre.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(pre.retryAfterSec ?? 60) } }
    );
  }

  let body: { username?: string; password?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const { username = "", password = "", code } = body;

  // 2) Password check. A miss counts as a rate-limit failure.
  const ok = await verifyPassword(username, password);
  if (!ok) {
    const after = recordFailure(ip);
    return NextResponse.json(
      {
        ok: false,
        error: "invalid",
        attemptsLeft: after.attemptsLeft,
        retryAfterSec: after.retryAfterSec,
      },
      after.ok
        ? { status: 401 }
        : { status: 429, headers: { "Retry-After": String(after.retryAfterSec ?? 60) } }
    );
  }

  const state = readAuthState();
  const needs2fa = state.twoFactor.enabled && !!state.twoFactor.secret;

  if (needs2fa) {
    // Prompting for a code is NOT a failure — don't record.
    if (!code) {
      return NextResponse.json({ ok: false, need2fa: true });
    }
    // A wrong code counts as a failure (attacker brute-forcing codes).
    if (!verifyTotp(state.twoFactor.secret!, code)) {
      const after = recordFailure(ip);
      return NextResponse.json(
        {
          ok: false,
          error: "invalid_code",
          need2fa: true,
          attemptsLeft: after.attemptsLeft,
          retryAfterSec: after.retryAfterSec,
        },
        after.ok
          ? { status: 401 }
          : { status: 429, headers: { "Retry-After": String(after.retryAfterSec ?? 60) } }
      );
    }
  }

  // 3) Success — clear the bucket and issue a session.
  clearFailures(ip);

  const token = await issueSession({ sub: username, twoFactorPassed: true });
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
