import { NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, SESSION_COOKIE, sessionCookieOptions, iframeCookieOptions } from "@/lib/session";

async function performLogout() {
  const user = await getCurrentUser();
  // Revoke every copy of the current token on the server. A stale iframe/localStorage
  // token can no longer authenticate even if the browser refuses to delete it.
  if (user) {
    await db
      .update(users)
      .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
      .where(eq(users.id, user.id));
  }

  const response = new NextResponse(null, { status: 303, headers: { Location: "/login?logged_out=1" } });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(SESSION_COOKIE + "_p");
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });
  try {
    response.cookies.set(SESSION_COOKIE + "_p", "", {
      ...iframeCookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });
  } catch {
    // ignore unsupported Partitioned-cookie environments
  }
  return response;
}

export async function POST() {
  return performLogout();
}

export async function GET() {
  return performLogout();
}
