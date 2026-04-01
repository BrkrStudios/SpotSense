/**
 * Simple API key authentication for external clients (iOS app).
 * Same-origin requests from the admin portal frontend are exempt.
 */

const API_KEY = process.env.SPOTSENSE_API_KEY || "spotsense-2026-demo";

export function validateApiKey(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // Exempt same-origin requests (admin portal frontend).
  // Same-origin GET requests typically send neither Origin nor Referer.
  if (!origin && !referer) return true;

  // If origin or referer matches the deployment host, it's same-origin.
  if (host && (origin?.includes(host) || referer?.includes(host))) return true;

  // Localhost exemption for local dev
  if (
    origin?.includes("localhost") ||
    origin?.includes("127.0.0.1") ||
    referer?.includes("localhost") ||
    referer?.includes("127.0.0.1")
  ) {
    return true;
  }

  // Check Authorization: Bearer <key>
  const auth = request.headers.get("authorization");
  if (auth) {
    const token = auth.replace(/^Bearer\s+/i, "");
    if (token === API_KEY) return true;
  }

  // Check x-api-key header
  const apiKey = request.headers.get("x-api-key");
  if (apiKey === API_KEY) return true;

  return false;
}
