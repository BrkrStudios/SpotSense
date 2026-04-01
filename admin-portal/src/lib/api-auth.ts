/**
 * Simple API key authentication for external clients (iOS app).
 * Same-origin requests from the admin portal frontend are exempt.
 */

const API_KEY = process.env.SPOTSENSE_API_KEY || "spotsense-2026-demo";

export function validateApiKey(request: Request): boolean {
  // Exempt same-origin requests (admin portal frontend)
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
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
