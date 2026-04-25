/**
 * Per-IP rate limiter for auth endpoints.
 *
 * After MAX_ATTEMPTS failures inside a rolling WINDOW, an IP is locked
 * out for LOCKOUT_MS. A successful authentication clears that IP's
 * bucket.
 *
 * State lives in a Map on globalThis so Next.js HMR in dev doesn't wipe
 * counters on every hot-reload (same pattern the parking simulation uses).
 * The portal currently runs as a single Node process on Railway, so an
 * in-memory Map is fine; swap for Redis if this ever scales to more
 * than one instance.
 */

import type { NextRequest } from "next/server";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min

interface Entry {
  count: number;
  firstFailAt: number;
  lockedUntil: number;
}

const GLOBAL_KEY = "__spotsense_rate_limit";
type Store = Map<string, Entry>;

function getStore(): Store {
  const g = globalThis as unknown as { [k: string]: Store | undefined };
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map();
  return g[GLOBAL_KEY] as Store;
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the client may try again. Present when ok === false. */
  retryAfterSec?: number;
  /** Attempts remaining before lockout. Present when ok === true. */
  attemptsLeft?: number;
}

/** Check without mutating — use before running the credential comparison. */
export function checkRateLimit(ip: string): RateLimitResult {
  const store = getStore();
  const entry = store.get(ip);
  const now = Date.now();

  if (!entry) return { ok: true, attemptsLeft: MAX_ATTEMPTS };

  if (entry.lockedUntil > now) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  // Window expired — wipe so the next failure starts a fresh bucket.
  if (now - entry.firstFailAt > WINDOW_MS) {
    store.delete(ip);
    return { ok: true, attemptsLeft: MAX_ATTEMPTS };
  }

  return { ok: true, attemptsLeft: Math.max(0, MAX_ATTEMPTS - entry.count) };
}

/** Record a failed attempt; may trigger lockout. Returns the resulting state. */
export function recordFailure(ip: string): RateLimitResult {
  const store = getStore();
  const now = Date.now();
  const entry: Entry = store.get(ip) ?? {
    count: 0,
    firstFailAt: now,
    lockedUntil: 0,
  };

  // If the prior window expired, reset it before incrementing.
  if (now - entry.firstFailAt > WINDOW_MS) {
    entry.count = 0;
    entry.firstFailAt = now;
    entry.lockedUntil = 0;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  store.set(ip, entry);

  if (entry.lockedUntil > now) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }
  return { ok: true, attemptsLeft: MAX_ATTEMPTS - entry.count };
}

/** Clear the bucket after a successful authentication. */
export function clearFailures(ip: string): void {
  getStore().delete(ip);
}

/**
 * Extract the client IP from standard proxy headers. Railway sets
 * `x-forwarded-for`; everything else is a fallback.
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    // XFF can be a comma-separated chain; the leftmost entry is the client.
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export const RATE_LIMIT_CONFIG = {
  maxAttempts: MAX_ATTEMPTS,
  windowMs: WINDOW_MS,
  lockoutMs: LOCKOUT_MS,
};
