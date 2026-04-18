import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "spotsense_session";
const SESSION_SECRET = new TextEncoder().encode(
  process.env.AUTH_SESSION_SECRET ??
    "d60945f11905ca6ca11c870243c22aa5b36212106e22549a7a963befcfe04e8c"
);

/** Paths that don't require a valid session (exact match). */
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/status"];

/**
 * API routes that run their own auth (x-api-key / Bearer token via
 * src/lib/api-auth.ts::validateApiKey) and must bypass the session-cookie
 * gate so external clients like the iOS app can reach them. Same-origin
 * admin-portal calls also still work because validateApiKey exempts them.
 */
const API_KEY_PROTECTED_PREFIXES = ["/api/parking"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p)) return NextResponse.next();
  if (
    API_KEY_PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    )
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let valid = false;
  let twoFactorPassed = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SESSION_SECRET);
      valid = typeof payload.sub === "string";
      twoFactorPassed = Boolean(payload.twoFactorPassed);
    } catch {
      valid = false;
    }
  }

  // Unauthenticated → redirect to /login (or 401 for /api/*).
  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Session exists but the user hasn't cleared the 2FA challenge. Keep them
  // on /login so the challenge UI can take over. (/api/auth/2fa/challenge is
  // the endpoint that completes the second step.)
  if (!twoFactorPassed && pathname !== "/api/auth/2fa/challenge") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "2fa_required" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets and Next internals; everything else flows through auth.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
