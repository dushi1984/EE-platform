import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { academicLevels, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { firstAllowedPath, getAccessPolicy } from "@/lib/access";
import type { TKey } from "@/lib/i18n";
import { GRADES, gradeLabel } from "@/lib/i18n-teacher";
import { notifyTeachers, notifyUsers } from "@/lib/notifications";
import {
  createSessionToken,
  generateQrToken,
  hashPassword,
  iframeCookieOptions,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const normalizePhone = (value: string) => value.replace(/[\s\-()]/g, "");
const isPhone = (value: string) => /^\+?\d{8,15}$/.test(normalizePhone(value));

async function generateUniqueStudentCode(): Promise<string> {
  const [last] = await db
    .select({ id: users.id })
    .from(users)
    .orderBy(sql`${users.id} desc`)
    .limit(1);

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate =
      attempt === 0
        ? `S${String((last?.id ?? 0) + 20260)}`
        : `S${Math.floor(100000 + Math.random() * 900000)}`;
    const exists = await db.query.users.findFirst({ where: eq(users.studentCode, candidate) });
    if (!exists) return candidate;
  }
  return `S${Date.now().toString().slice(-7)}`;
}

export async function POST(request: NextRequest) {
  const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;
  const fail = (error: TKey) => {
    if (wantsJson) return NextResponse.json({ ok: false, error }, { status: 400 });
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `/register?error=${encodeURIComponent(error)}` },
    });
  };

  const form = await request.formData();
  const fullName = String(form.get("fullName") ?? "").trim().replace(/\s+/g, " ");
  const parentPhone = String(form.get("parentPhone") ?? "").trim();
  const contact = String(form.get("contact") ?? "").trim().toLowerCase();
  const gradeInput = String(form.get("grade") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirmPassword") ?? "");

  if (fullName.split(" ").length < 2 || fullName.length < 5) return fail("errors.fullName");
  if (!isPhone(parentPhone)) return fail("errors.parentPhone");
  const email = EMAIL_RE.test(contact) ? contact : null;
  const phone = !email && isPhone(contact) ? normalizePhone(contact) : null;
  if (!email && !phone) return fail("errors.contact");
  if (!gradeInput) return fail("errors.gradeRequired");
  if (password.length < 6) return fail("errors.password");
  if (password !== confirm) return fail("errors.passwordMatch");

  await ensureSeeded();

  const knownLevels = await db.select().from(academicLevels);
  const validGrades = new Set<string>([...GRADES, ...knownLevels.map((l) => l.name)]);
  if (!validGrades.has(gradeInput)) return fail("errors.gradeRequired");

  const contactTaken = await db.query.users.findFirst({
    where: email ? eq(users.email, email) : eq(users.phone, phone!),
  });
  if (contactTaken) return fail("errors.contactTaken");

  const studentCode = await generateUniqueStudentCode();

  const [user] = await db
    .insert(users)
    .values({
      fullName,
      email,
      phone,
      parentPhone: normalizePhone(parentPhone),
      studentCode,
      grade: gradeInput,
      accountStatus: "pending",
      approvedAt: null,
      passwordHash: hashPassword(password),
      qrToken: generateQrToken(),
      lastLoginAt: new Date(),
    })
    .returning();

  const arGrade = knownLevels.find((l) => l.name === gradeInput)?.nameAr || gradeLabel("ar", gradeInput);

  await Promise.all([
    notifyTeachers({
      kind: "student",
      title: `New student signup awaiting approval: ${fullName} (${gradeInput})`,
      titleAr: `طالب جديد بانتظار الموافقة: ${fullName} (${arGrade})`,
      body: `Contact: ${email || phone} · Parent: ${normalizePhone(parentPhone)} — Click to approve, suspend, block, or send a message.`,
      bodyAr: `التواصل: ${email || phone} · ولي الأمر: ${normalizePhone(parentPhone)} — اضغط للموافقة أو الإيقاف أو الحظر أو إرسال رسالة.`,
      href: `/students/${user.id}`,
    }),
    notifyUsers([user.id], {
      kind: "system",
      title: `Welcome, ${fullName.split(" ")[0]}! Signup received`,
      titleAr: `أهلاً بك يا ${fullName.split(" ")[0]}! تم استلام تسجيلك`,
      body: "You can explore teacher-selected pages and materials now. Full features unlock once your teacher approves your account.",
      bodyAr: "يمكنك الآن تصفح الصفحات والمواد التي أتاحها المعلم، وستُفتح كافة المزايا فور موافقة المعلم على حسابك.",
      href: "/dashboard",
    }),
  ]).catch(() => {});

  const policy = await getAccessPolicy();
  const baseDest = firstAllowedPath(user, policy);
  const token = createSessionToken(user.id, user.sessionVersion);
  const destination = `${baseDest}${baseDest.includes("?") ? "&" : "?"}session=${encodeURIComponent(token)}`;

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
