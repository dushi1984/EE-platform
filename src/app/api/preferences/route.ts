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
