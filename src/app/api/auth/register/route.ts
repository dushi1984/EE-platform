import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { createSessionToken, generateQrToken, hashPassword, iframeCookieOptions, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import type { TKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const normalizePhone = (value: string) => value.replace(/[\s\-()]/g, "");
const isPhone = (value: string) => /^\+?\d{8,15}$/.test(normalizePhone(value));

export async function POST(request: NextRequest) {
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const fail = (error: TKey) => {
    if (wantsJson) return NextResponse.json({ ok: false, error }, { status: 400 });
    return new NextResponse(null, { status: 303, headers: { Location: `/register?error=${encodeURIComponent(error)}` } });
  };

  const form = await request.formData();
  const fullName = String(form.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const parentPhone = String(form.get("parentPhone") ?? "").trim();
  const contact = String(form.get("contact") ?? "").trim().toLowerCase();
  const code = String(form.get("code") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirmPassword") ?? "");

  if (fullName.split(" ").length < 2 || fullName.length < 5) return fail("errors.fullName");
  if (!isPhone(parentPhone)) return fail("errors.parentPhone");
  const email = EMAIL_RE.test(contact) ? contact : null;
  const phone = !email && isPhone(contact) ? normalizePhone(contact) : null;
  if (!email && !phone) return fail("errors.contact");
  if (!/^[A-Za-z0-9-]{4,12}$/.test(code)) return fail("errors.code");
  if (password.length < 6) return fail("errors.password");
  if (password !== confirm) return fail("errors.passwordMatch");

  await ensureSeeded();
  if (await db.query.users.findFirst({ where: eq(users.studentCode, code) })) return fail("errors.codeTaken");
  const contactTaken = await db.query.users.findFirst({ where: email ? eq(users.email, email) : eq(users.phone, phone!) });
  if (contactTaken) return fail("errors.contactTaken");

  const [user] = await db
    .insert(users)
    .values({
      fullName,
      email,
      phone,
      parentPhone: normalizePhone(parentPhone),
      studentCode: code,
      passwordHash: hashPassword(password),
      qrToken: generateQrToken(),
      lastLoginAt: new Date(),
    })
    .returning();

  const token = createSessionToken(user.id, user.sessionVersion);
  const destination = `/dashboard?session=${encodeURIComponent(token)}`;

  if (wantsJson) {
    const jsonRes = NextResponse.json({ ok: true, token, next: destination });
    jsonRes.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    try {
      jsonRes.cookies.set(SESSION_COOKIE + "_p", token, iframeCookieOptions);
    } catch {
      // ignore
    }
    return jsonRes;
  }

  const response = new NextResponse(null, { status: 303, headers: { Location: destination } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  try {
    response.cookies.set(SESSION_COOKIE + "_p", token, iframeCookieOptions);
  } catch {
    // ignore
  }
  return response;
}
