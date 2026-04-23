import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifySession,
  SESSION_COOKIE,
  ADMIN_MEMBER_SINCE,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      username: session.sub,
      memberSince: ADMIN_MEMBER_SINCE,
    },
  });
}
