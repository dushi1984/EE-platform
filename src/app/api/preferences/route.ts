import { NextRequest, NextResponse } from "next/server";
import { LOCALE_COOKIE, THEME_COOKIE } from "@/lib/i18n-server";
import { preferenceCookieOptions } from "@/lib/session";

export async function POST(request: NextRequest) {
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const data = input as Record<string, unknown>;
  const response = NextResponse.json({ ok: true });
  if (data.locale === "en" || data.locale === "ar") response.cookies.set(LOCALE_COOKIE, data.locale, preferenceCookieOptions);
  else if (data.theme === "light" || data.theme === "dark") response.cookies.set(THEME_COOKIE, data.theme, preferenceCookieOptions);
  else return NextResponse.json({ error: "Invalid preference" }, { status: 400 });
  return response;
}
