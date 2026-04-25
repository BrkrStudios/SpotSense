/**
 * Server-side authentication primitives.
 *   - Verify username + bcrypt password hash.
 *   - Issue/verify signed JWT session cookies (HS256 via `jose`).
 *
 * The admin password is stored only as a bcrypt hash (cost 12) — no
 * plaintext lives in the repo. Session cookies are HttpOnly,
 * SameSite=Lax, and signed with AUTH_SESSION_SECRET. A fallback
 * secret is hard-coded so local dev works out of the box; production
 * must set AUTH_SESSION_SECRET to a fresh 32-byte random value.
 */

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

// -----------------------------------------------------------------------------
// User identity + credentials
// -----------------------------------------------------------------------------

/** Username granted admin access. */
export const ADMIN_USERNAME = "HcSpot";

/**
 * Bcrypt hash (cost 12) of the admin password.
 * Plaintext never appears anywhere in this repo.
 * Generate a replacement with:  bcryptjs.hashSync("<password>", 12)
 */
const ADMIN_PASSWORD_HASH =
  "$2b$12$X4DCGp8jfRAYaWs9jHMNZer1SO5Io34cZRrRyYNdMAzmtNeLsmlym";

/** Day the admin account was provisioned. Surfaces on the profile card. */
export const ADMIN_MEMBER_SINCE = "2025-01-15";

export async function verifyPassword(
  username: string,
  password: string
): Promise<boolean> {
  if (username !== ADMIN_USERNAME) {
    // Run a dummy compare anyway so the response time for an unknown
    // username matches the response time for a wrong password. Prevents
    // username enumeration by timing.
    await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    return false;
  }
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

// -----------------------------------------------------------------------------
// Session (JWT in an HttpOnly cookie)
// -----------------------------------------------------------------------------

const SESSION_SECRET = new TextEncoder().encode(
  process.env.AUTH_SESSION_SECRET ??
    "d60945f11905ca6ca11c870243c22aa5b36212106e22549a7a963befcfe04e8c"
);

export const SESSION_COOKIE = "spotsense_session";
const SESSION_TTL = "7d";

export interface SessionPayload {
  sub: string; // username
}

export async function issueSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(SESSION_SECRET);
}

export async function verifySession(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
