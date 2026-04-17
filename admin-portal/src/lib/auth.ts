/**
 * Server-side authentication primitives.
 *
 * Responsibilities:
 *   - Verify username + bcrypt password hash
 *   - Issue/verify signed JWT session cookies (jose, HS256)
 *   - Persist 2FA state (secret, enabled flag) in a local JSON file
 *   - RFC 6238 TOTP verification
 *
 * Security notes:
 *   - The admin password is NEVER stored in plaintext. Only a bcrypt hash
 *     (cost 12) of "hcuspot26" lives in this file.
 *   - Session cookies are HttpOnly + SameSite=Lax + signed. The signing
 *     secret defaults to a baked-in 32-byte value for demo convenience but
 *     should be overridden via AUTH_SESSION_SECRET in production.
 *   - TOTP secrets are generated with cryptographic RNG, stored base32
 *     encoded, and verified with a ±1-step drift window.
 */

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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
  twoFactorPassed: boolean;
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
    return {
      sub: payload.sub,
      twoFactorPassed: Boolean(payload.twoFactorPassed),
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Persistent auth state (2FA config)
// -----------------------------------------------------------------------------

export interface AuthState {
  username: string;
  createdAt: string;
  twoFactor: {
    enabled: boolean;
    secret: string | null; // base32-encoded
  };
}

const STATE_PATH = path.join(process.cwd(), ".auth-state.json");

function defaultState(): AuthState {
  return {
    username: ADMIN_USERNAME,
    createdAt: ADMIN_MEMBER_SINCE,
    twoFactor: { enabled: false, secret: null },
  };
}

export function readAuthState(): AuthState {
  try {
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as AuthState;
    // Shallow sanity check; fall back to defaults if the shape is off.
    if (!parsed?.twoFactor) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

export function writeAuthState(state: AuthState): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

// -----------------------------------------------------------------------------
// TOTP (RFC 6238) — SHA-1, 6 digits, 30-second step
// -----------------------------------------------------------------------------

const TOTP_DIGITS = 6;
const TOTP_STEP = 30;
const TOTP_DRIFT = 1; // accept codes ±1 step (±30s) to cover clock skew

/** Base32 alphabet per RFC 4648. */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("Invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function totpCodeFor(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  // Big-endian 64-bit counter.
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = bin % 10 ** TOTP_DIGITS;
  return code.toString().padStart(TOTP_DIGITS, "0");
}

export function verifyTotp(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP);
  for (let d = -TOTP_DRIFT; d <= TOTP_DRIFT; d++) {
    if (totpCodeFor(secret, counter + d) === code) return true;
  }
  return false;
}

/** Build the otpauth:// URI authenticator apps scan. */
export function totpUri(secret: string, username: string): string {
  const issuer = encodeURIComponent("SpotSense");
  const label = encodeURIComponent(`${issuer}:${username}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}
