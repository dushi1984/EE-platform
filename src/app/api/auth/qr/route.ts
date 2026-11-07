import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { firstAllowedPath, getAccessPolicy, normalizeAccountStatus } from "@/lib/access";
import { createSessionToken, iframeCookieOptions, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const dynamic = "force-dynamic";

function extractToken(raw: string | null) {
  if (!raw) return null;
  const value = raw.trim();
  try {
    const url = new URL(value);
    return url.searchParams.get("token")?.trim() || null;
  } catch {
    return value || null;
  }
}

export async function GET(req: Request) {
  await ensureSeeded();
  const qrToken = extractToken(new URL(req.url).searchParams.get("token"));
  const user = qrToken
    ? await db.query.users.findFirst({
        where: or(eq(users.qrToken, qrToken), eq(users.studentCode, qrToken)),
      })
    : null;

  if (!user) {
    return new NextResponse(null, { status: 302, headers: { Location: "/login/qr?error=invalid" } });
  }

  if (user.role === "student" && normalizeAccountStatus(user.accountStatus) === "blocked") {
    return new NextResponse(null, { status: 302, headers: { Location: "/login?error=blocked" } });
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const sessionToken = createSessionToken(user.id, user.sessionVersion);
  const policy = await getAccessPolicy();
  const baseDest = firstAllowedPath(user, policy);
  const res = new NextResponse(null, {
    status: 302,
    headers: { Location: `${baseDest}${baseDest.includes("?") ? "&" : "?"}session=${encodeURIComponent(sessionToken)}` },
  });
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions);
  try {
    res.cookies.set(SESSION_COOKIE + "_p", sessionToken, iframeCookieOptions);
  } catch {
    // ignore
  }
  return res;
}
