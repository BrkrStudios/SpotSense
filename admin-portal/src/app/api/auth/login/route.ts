import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyPassword, issueSession, SESSION_COOKIE } from "@/lib/auth";
import {
  checkRateLimit,
  recordFailure,
  clearFailures,
  getClientIp,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/auth/login
 * Body: { username, password }
 *
 * Responses:
 *   200 { ok: true }                                   — session cookie set
 *   401 { ok: false, error: "invalid", attemptsLeft }  — bad creds (counts as failure)
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

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const { username = "", password = "" } = body;

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

  // 3) Success — clear the bucket and issue a session.
  clearFailures(ip);

  const token = await issueSession({ sub: username });
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
