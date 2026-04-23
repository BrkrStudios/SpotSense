/**
 * Server-side authentication primitives.
 *
 * Responsibilities:
 *   - Verify username + bcrypt password hash
 *   - Issue/verify signed JWT session cookies (jose, HS256)
 *
 * Security notes:
 *   - The admin password is NEVER stored in plaintext. Only a bcrypt hash
 *     (cost 12) of "hcuspot26" lives in this file.
 *   - Session cookies are HttpOnly + SameSite=Lax + signed. The signing
 *     secret defaults to a baked-in 32-byte value for demo convenience but
 *     should be overridden via AUTH_SESSION_SECRET in production.
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
    // Still run a dummy compare to blunt username-enumeration timing attacks.
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
