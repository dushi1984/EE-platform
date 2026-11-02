import { NextRequest, NextResponse } from "next/server";
import { or, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { DEMO_PASSWORD, DEMO_STUDENT_CODE, ensureSeeded } from "@/db/seed";
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
  iframeCookieOptions,
  verifyPassword,
} from "@/lib/session";

export const dynamic = "force-dynamic";

function safeDestination(value: string) {
  return value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\") &&
    !value.startsWith("/login") &&
    !value.startsWith("/register")
    ? value
    : "/dashboard";
}

export async function POST(request: NextRequest) {
  await ensureSeeded();

  let identifier = "";
  let password = "";
  let next = "/dashboard";
  let demo = false;
  let remember = true;

  const contentType = request.headers.get("content-type") || "";
  const wantsJson = request.headers.get("accept")?.includes("application/json") || contentType.includes("application/json");

  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      identifier = String(body.identifier ?? "").trim();
      password = String(body.password ?? "");
      next = safeDestination(String(body.next ?? "/dashboard"));
      demo = body.demo === true;
      remember = body.remember !== false;
    } catch {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    }
  } else {
    const form = await request.formData();
    identifier = String(form.get("identifier") ?? "").trim();
    password = String(form.get("password") ?? "");
    next = safeDestination(String(form.get("next") ?? "/dashboard"));
    demo = form.get("demo") === "true";
    const rememberVal = String(form.get("remember") ?? "on");
    remember = rememberVal !== "off" && rememberVal !== "false";
  }

  // Find user by code, email, or phone
  const cleanPhone = identifier.replace(/[\s\-()]/g, "");
  let user = demo
    ? await db.query.users.findFirst({ where: eq(users.studentCode, DEMO_STUDENT_CODE) })
    : identifier
      ? await db.query.users.findFirst({
          where: or(
            eq(sql<string>`lower(${users.email})`, identifier.toLowerCase()),
            eq(users.phone, cleanPhone),
            eq(users.studentCode, identifier),
          ),
        })
      : null;

  let authenticated = user;
  if (authenticated && !demo && !verifyPassword(password, authenticated.passwordHash)) {
    authenticated = null;
  }

  // Guarantee demo account works if student code matches
  if (!authenticated && (demo || (identifier === DEMO_STUDENT_CODE && password === DEMO_PASSWORD))) {
    const demoUser = user ?? (await db.query.users.findFirst({ where: eq(users.studentCode, DEMO_STUDENT_CODE) }));
    if (demoUser) {
      await db.update(users).set({ passwordHash: hashPassword(DEMO_PASSWORD) }).where(eq(users.id, demoUser.id));
      authenticated = demoUser;
    }
  }

  if (!authenticated) {
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: "invalid" }, { status: 401 });
    }
    const params = new URLSearchParams({ error: "invalid" });
    if (identifier) params.set("identifier", identifier);
    if (next !== "/dashboard") params.set("next", next);
    return new NextResponse(null, { status: 303, headers: { Location: `/login?${params.toString()}` } });
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, authenticated.id));
  const token = createSessionToken(authenticated.id, authenticated.sessionVersion);
  const destination = `${next}${next.includes("?") ? "&" : "?"}session=${encodeURIComponent(token)}`;
  // "Remember me" unchecked → session-only cookies that vanish when the browser closes
  const mainOpts = remember ? sessionCookieOptions : { httpOnly: true as const, path: "/", sameSite: "lax" as const };
  const frameOpts = remember
    ? iframeCookieOptions
    : { httpOnly: true as const, secure: true as const, sameSite: "none" as const, partitioned: true as const, path: "/" };

  if (wantsJson) {
    const jsonRes = NextResponse.json({
      ok: true,
      token,
      next: destination,
      user: {
        id: authenticated.id,
        fullName: authenticated.fullName,
        studentCode: authenticated.studentCode,
        avatarUrl: authenticated.avatarUrl,
      },
    });
    jsonRes.cookies.set(SESSION_COOKIE, token, mainOpts);
    try {
      jsonRes.cookies.set(SESSION_COOKIE + "_p", token, frameOpts);
    } catch {
      // ignore
    }
    return jsonRes;
  }

  const response = new NextResponse(null, { status: 303, headers: { Location: destination } });
  response.cookies.set(SESSION_COOKIE, token, mainOpts);
  try {
    response.cookies.set(SESSION_COOKIE + "_p", token, frameOpts);
  } catch {
    // ignore
  }
  return response;
}
