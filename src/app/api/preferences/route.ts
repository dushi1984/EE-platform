import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, THEME_COOKIE } from "@/lib/i18n-server";
import { preferenceCookieOptions } from "@/lib/session";

function setPreferenceCookie(response: NextResponse, name: string, value: string) {
  response.cookies.set(name, value, preferenceCookieOptions);
  try {
    response.cookies.set(`${name}_p`, value, {
      ...preferenceCookieOptions,
      secure: true,
      sameSite: "none",
      partitioned: true,
    });
  } catch {
    // Partitioned cookies are optional on runtimes that do not support them.
  }
}

function getRequestOrigin(request: NextRequest): string {
  const fwdHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = fwdHost || request.headers.get("host") || request.nextUrl.host;
  const fwdProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = fwdProto || request.nextUrl.protocol.replace(":", "") || "https";
  return `${proto}://${host}`;
}

function resolveSafeReturnUrl(request: NextRequest, rawReturnTo: string | null): URL {
  const origin = getRequestOrigin(request);
  let candidate = (rawReturnTo ?? "").trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const expectedHost = new URL(origin).host;
        if (refUrl.host === expectedHost || refUrl.host === request.nextUrl.host) {
          candidate = `${refUrl.pathname}${refUrl.search}`;
        }
      } catch {
        // ignore invalid referer
      }
    }
  }

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    candidate = "/";
  }
  return new URL(candidate, origin);
}

/**
 * Progressive-enhancement GET endpoint so language & theme toggles work
 * immediately on every mobile/desktop browser even before JS hydrates or when JS is blocked.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const locale = sp.get("locale");
  const theme = sp.get("theme");
  const targetUrl = resolveSafeReturnUrl(request, sp.get("returnTo"));

  if (locale === "en" || locale === "ar") {
    targetUrl.searchParams.set("lang", locale);
  }
  if (theme === "light" || theme === "dark") {
    targetUrl.searchParams.set("theme", theme);
  }

  const isAuthRoute =
    targetUrl.pathname === "/login" ||
    targetUrl.pathname.startsWith("/login/") ||
    targetUrl.pathname === "/register";
  if (isAuthRoute) {
    targetUrl.searchParams.delete("session");
    targetUrl.searchParams.delete("token");
  }

  const response = NextResponse.redirect(targetUrl, 303);
  if (locale === "en" || locale === "ar") {
    setPreferenceCookie(response, LOCALE_COOKIE, locale);
  }
  if (theme === "light" || theme === "dark") {
    setPreferenceCookie(response, THEME_COOKIE, theme);
  }
  return response;
}

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!input || typeof input !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const data = input as Record<string, unknown>;
  const response = NextResponse.json({ ok: true });
  let updated = false;
  if (data.locale === "en" || data.locale === "ar") {
    setPreferenceCookie(response, LOCALE_COOKIE, data.locale);
    updated = true;
  }
  if (data.theme === "light" || data.theme === "dark") {
    setPreferenceCookie(response, THEME_COOKIE, data.theme);
    updated = true;
  }
  if (!updated) {
    return NextResponse.json({ error: "Invalid preference" }, { status: 400 });
  }
  return response;
}
