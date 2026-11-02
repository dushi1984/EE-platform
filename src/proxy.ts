import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "insci_session";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Authentication pages must never accept URL session fallbacks. This prevents
  // a copied/stale URL from immediately signing the user back in after logout.
  if (
    (pathname === "/login" || pathname.startsWith("/login/") || pathname === "/register") &&
    (request.nextUrl.searchParams.has("session") || request.nextUrl.searchParams.has("token"))
  ) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("session");
    clean.searchParams.delete("token");
    return NextResponse.redirect(clean);
  }

  const queryToken = request.nextUrl.searchParams.get("session") || request.nextUrl.searchParams.get("token");
  const headerToken = request.headers.get("x-session-token");
  const cookieToken =
    request.cookies.get(SESSION_COOKIE)?.value || request.cookies.get(SESSION_COOKIE + "_p")?.value;

  // Explicit request state must win over cookies. Embedded previews can retain
  // a stale/blocked cookie while the login redirect already carries a fresh token.
  const token = (queryToken || headerToken || cookieToken || "").trim();

  const queryLocale = request.nextUrl.searchParams.get("lang");
  const locale =
    queryLocale ||
    request.headers.get("x-locale") ||
    request.cookies.get("locale")?.value ||
    request.cookies.get("locale_p")?.value ||
    "";

  const queryTheme = request.nextUrl.searchParams.get("theme");
  const theme =
    queryTheme ||
    request.headers.get("x-theme") ||
    request.cookies.get("theme")?.value ||
    request.cookies.get("theme_p")?.value ||
    "";

  const requestHeaders = new Headers(request.headers);
  if (token) {
    requestHeaders.set("x-session-token", token);
    if (!cookieToken || queryToken || headerToken) {
      const existing = requestHeaders.get("cookie");
      const withoutOld = (existing ?? "")
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part && !part.startsWith(`${SESSION_COOKIE}=`) && !part.startsWith(`${SESSION_COOKIE}_p=`));
      withoutOld.push(`${SESSION_COOKIE}=${token}`);
      requestHeaders.set("cookie", withoutOld.join("; "));
    }
  }
  if (locale === "en" || locale === "ar") requestHeaders.set("x-locale", locale);
  if (theme === "light" || theme === "dark") requestHeaders.set("x-theme", theme);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (queryToken && queryToken.split(".").length === 4 && pathname !== "/api/auth/logout") {
    response.cookies.set(SESSION_COOKIE, queryToken, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    try {
      response.cookies.set(`${SESSION_COOKIE}_p`, queryToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        partitioned: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    } catch {
      // Partitioned cookies are not supported by every local runtime.
    }
  }

  if (queryLocale === "en" || queryLocale === "ar") {
    response.cookies.set("locale", queryLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    try {
      response.cookies.set("locale_p", queryLocale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        secure: true,
        sameSite: "none",
        partitioned: true,
      });
    } catch {
      // Partitioned cookies are not supported by every local runtime.
    }
  }

  if (queryTheme === "light" || queryTheme === "dark") {
    response.cookies.set("theme", queryTheme, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    try {
      response.cookies.set("theme_p", queryTheme, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        secure: true,
        sameSite: "none",
        partitioned: true,
      });
    } catch {
      // Partitioned cookies are not supported by every local runtime.
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico).*)"],
};
