import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import {
  verifySession,
  SESSION_COOKIE,
  readAuthState,
  writeAuthState,
  generateTotpSecret,
  totpUri,
} from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/2fa/setup
 * Starts 2FA enrollment. Generates a fresh TOTP secret (stored provisionally),
 * and returns it along with an otpauth:// URI and QR code data URL.
 * 2FA remains disabled until the user POSTs a valid code to /verify.
 */
export async function POST() {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const state = readAuthState();
  const secret = generateTotpSecret();
  state.twoFactor = { enabled: false, secret };
  writeAuthState(state);

  const uri = totpUri(secret, session.sub);
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220 });

  return NextResponse.json({ secret, uri, qrDataUrl });
}
