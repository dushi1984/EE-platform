"use server";

import { db } from "@/db";
import { grades, lessonProgress, lessons, materials, messages, payments, purchases, quizAttempts, quizQuestions, taskProgress, taskSubmissions, tasks, users, type PaymentMethod } from "@/db/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authRedirect, clearSession, generateQrToken, getCurrentUser, hashPassword, sessionPath, setSession, verifyPassword } from "./session";
import { preferenceCookieOptions } from "./session";
import { LOCALE_COOKIE, THEME_COOKIE } from "./i18n-server";
import { DEMO_STUDENT_CODE, ensureSeeded } from "@/db/seed";
import { cardBrand, gatewayAuthorize, isExpired, luhnValid, type Method } from "./gateway";
import type { TKey } from "./i18n";

export type ActionState = { error?: TKey; success?: TKey } | null;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const normalizePhone = (v: string) => v.replace(/[\s\-()]/g, "");
const isPhone = (v: string) => /^\+?\d{8,15}$/.test(normalizePhone(v));

/* ---------- Preferences ---------- */

export async function setLocaleAction(formData: FormData) {
  const locale = str(formData, "locale") === "ar" ? "ar" : "en";
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, preferenceCookieOptions);
  revalidatePath("/", "layout");
}

export async function setThemeAction(formData: FormData) {
  const theme = str(formData, "theme") === "dark" ? "dark" : "light";
  const store = await cookies();
  store.set(THEME_COOKIE, theme, preferenceCookieOptions);
  revalidatePath("/", "layout");
}

/* ---------- Auth ---------- */

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fullName = str(formData, "fullName").replace(/\s+/g, " ");
  const parentPhone = str(formData, "parentPhone");
  const contact = str(formData, "contact").toLowerCase();
  const code = str(formData, "code");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (fullName.split(" ").length < 2 || fullName.length < 5) return { error: "errors.fullName" };
  if (!isPhone(parentPhone)) return { error: "errors.parentPhone" };
  const email = EMAIL_RE.test(contact) ? contact : null;
  const phone = !email && isPhone(contact) ? normalizePhone(contact) : null;
  if (!email && !phone) return { error: "errors.contact" };
  if (!/^[A-Za-z0-9-]{4,12}$/.test(code)) return { error: "errors.code" };
  if (password.length < 6) return { error: "errors.password" };
  if (password !== confirm) return { error: "errors.passwordMatch" };

  await ensureSeeded();
  const codeTaken = await db.query.users.findFirst({ where: eq(users.studentCode, code) });
  if (codeTaken) return { error: "errors.codeTaken" };
  const contactTaken = await db.query.users.findFirst({
    where: email ? eq(users.email, email) : eq(users.phone, phone!),
  });
  if (contactTaken) return { error: "errors.contactTaken" };

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
    })
    .returning();

  await setSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const identifier = str(formData, "identifier");
  const password = String(formData.get("password") ?? "");
  const next = str(formData, "next");
  if (!identifier || !password) return { error: "errors.invalidCredentials" };

  await ensureSeeded();
  const lower = identifier.toLowerCase();
  const phone = normalizePhone(identifier);
  const user = await db.query.users.findFirst({
    where: or(eq(sql`lower(${users.email})`, lower), eq(users.phone, phone), eq(users.studentCode, identifier)),
  });
  if (!user || !verifyPassword(password, user.passwordHash)) return { error: "errors.invalidCredentials" };

  await setSession(user.id);
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function demoLoginAction() {
  await ensureSeeded();
  const user = await db.query.users.findFirst({ where: eq(users.studentCode, DEMO_STUDENT_CODE) });
  if (!user) redirect("/login");
  await setSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

/* ---------- Tasks ---------- */

export async function createTaskAction(formData: FormData) {
  // Task creation is teacher-only (Assign Task). Students cannot create tasks.
  const user = await getCurrentUser();
  if (!user || user.role === "student") return { ok: false };
  void formData;
  const title = str(formData, "title");
  const titleAr = str(formData, "titleAr") || title;
  const description = str(formData, "description");
  const descriptionAr = str(formData, "descriptionAr") || description;
  const subjectId = Number(formData.get("subjectId")) || 1;
  const dueStr = str(formData, "dueDate");
  const dueDate = dueStr ? new Date(dueStr) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  if (!title) return { ok: false };

  const [newTask] = await db
    .insert(tasks)
    .values({
      title,
      titleAr,
      description,
      descriptionAr,
      subjectId,
      dueDate,
      targetGrade: user.role === "student" ? user.grade : "all",
    })
    .returning();

  await db.insert(taskProgress).values({
    userId: user.id,
    taskId: newTask.id,
    status: "todo",
    progress: 0,
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true, taskId: newTask.id };
}

export async function deleteTaskAction(taskId: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await db
    .insert(taskProgress)
    .values({ userId: user.id, taskId, status: "dismissed", progress: 0 })
    .onConflictDoUpdate({
      target: [taskProgress.userId, taskProgress.taskId],
      set: { status: "dismissed", updatedAt: new Date() },
    });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateTaskAction(taskId: number, status: "todo" | "in_progress" | "done", progress: number) {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const p = status === "done" ? 100 : status === "todo" ? 0 : Math.min(99, Math.max(1, Math.round(progress)));
  await db
    .insert(taskProgress)
    .values({ userId: user.id, taskId, status, progress: p })
    .onConflictDoUpdate({
      target: [taskProgress.userId, taskProgress.taskId],
      set: { status, progress: p, updatedAt: new Date() },
    });
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
  return { ok: true, status, progress: p };
}

/* ---------- Materials ---------- */

/* ---------- Checkout / payment gateway ---------- */

function genReference() {
  return `INS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}


export type CheckoutState = {
  ok?: boolean;
  stage?: "processing" | "paid" | "failed";
  error?: string;
  errorKey?: TKey;
  reference?: string;
  redirectTo?: string;
  slug?: string;
  receiptUrl?: string;
  amountCents?: number;
} | null;

export async function checkoutAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, stage: "failed", errorKey: "common.errorGeneric", redirectTo: "/login" };

  const materialId = Number(formData.get("materialId"));
  const material = await db.query.materials.findFirst({ where: eq(materials.id, materialId) });
  if (!material) return { ok: false, stage: "failed", errorKey: "common.errorGeneric" };

  const locale = (await cookies()).get(LOCALE_COOKIE)?.value === "ar" ? "ar" : "en";
  const fail = (msg?: string, key?: TKey) => ({ ok: false, stage: "failed" as const, error: msg, errorKey: key });

  // Free material — bypass the gateway entirely
  if (material.priceCents === 0) {
    await db
      .insert(purchases)
      .values({ userId: user.id, materialId, pricePaidCents: 0, paymentMethod: "free", status: "paid" })
      .onConflictDoUpdate({
        target: [purchases.userId, purchases.materialId],
        set: { paymentMethod: "free", status: "paid", purchasedAt: new Date() },
      });
    revalidatePath("/materials");
    revalidatePath(`/materials/${material.slug}`);
    revalidatePath("/dashboard");
    return {
      ok: true,
      stage: "paid",
      slug: material.slug,
      redirectTo: await sessionPath(`/materials/${material.slug}`),
    };
  }

  const rawMethod = str(formData, "method");
  if (!["card", "wallet", "instapay"].includes(rawMethod)) return fail(undefined, "errors.contact" as TKey);
  const method = rawMethod as Method;

  const reference = genReference();
  const amount = material.priceCents;

  let label = "";

  if (method === "card") {
    const holder = str(formData, "cardName");
    const numberRaw = str(formData, "cardNumber").replace(/\D/g, "");
    const expMonth = Number(str(formData, "expMonth"));
    const expYear = Number(str(formData, "expYear"));
    const cvc = str(formData, "cardCvc");

    if (holder.length < 3) return fail(locale === "ar" ? "أدخل الاسم على البطاقة." : "Enter the name printed on the card.");
    if (!luhnValid(numberRaw)) return fail(locale === "ar" ? "رقم البطاقة غير صحيح." : "That card number is not valid.");
    const now = new Date();
    const thisYear = now.getFullYear();
    if (!expMonth || expMonth < 1 || expMonth > 12) return fail(locale === "ar" ? "شهر الانتهاء غير صحيح." : "Enter a valid expiry month.");
    if (!expYear || expYear < thisYear || expYear > thisYear + 20) return fail(locale === "ar" ? "سنة الانتهاء غير صحيحة." : "Enter a valid expiry year.");
    if (expYear === thisYear && expMonth < now.getMonth() + 1) return fail(locale === "ar" ? "انتهت صلاحية البطاقة." : "This card has expired.");
    if (!/^\d{3,4}$/.test(cvc)) return fail(locale === "ar" ? "رمز التحقق غير صحيح." : "Enter the 3 or 4 digit security code.");

    const brand = cardBrand(numberRaw);
    label = `${brand} •••• ${numberRaw.slice(-4)}`;
  } else if (method === "wallet") {
    const wallet = normalizePhone(str(formData, "walletNumber"));
    if (!isPhone(wallet)) return fail(locale === "ar" ? "رقم المحفظة غير صحيح." : "Enter a valid mobile wallet number.");
    label = `E-Wallet ••• ${wallet.slice(-3)}`;
  } else {
    const handle = str(formData, "instapayHandle");
    if (handle.length < 5) return fail(locale === "ar" ? "عنوان Instapay غير صحيح." : "Enter a valid Instapay address.");
    label = `Instapay · ${handle}`;
  }

  // Create the transaction as pending, then run the gateway authorization
  const [tx] = await db
    .insert(payments)
    .values({
      reference,
      userId: user.id,
      materialId,
      amountCents: amount,
      method,
      methodLabel: label,
      status: "processing",
    })
    .returning();

  const auth = gatewayAuthorize(
    {
      method,
      cardNumber: method === "card" ? str(formData, "cardNumber") : undefined,
      walletNumber: method === "wallet" ? normalizePhone(str(formData, "walletNumber")) : undefined,
      instapayHandle: method === "instapay" ? str(formData, "instapayHandle") : undefined,
    },
    locale,
  );

  if (!auth.approved) {
    await db
      .update(payments)
      .set({ status: "failed", failureReason: auth.message, gatewayRef: auth.code })
      .where(eq(payments.id, tx.id));
    revalidatePath("/payments");
    return fail(auth.message);
  }

  await db
    .update(payments)
    .set({ status: "paid", gatewayRef: auth.gatewayRef, completedAt: new Date() })
    .where(eq(payments.id, tx.id));

  await db
    .insert(purchases)
    .values({
      userId: user.id,
      materialId,
      pricePaidCents: amount,
      paymentMethod: method as PaymentMethod,
      status: "paid",
    })
    .onConflictDoUpdate({
      target: [purchases.userId, purchases.materialId],
      set: { pricePaidCents: amount, paymentMethod: method as PaymentMethod, status: "paid", purchasedAt: new Date() },
    });

  revalidatePath("/materials");
  revalidatePath(`/materials/${material.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/payments");

  return {
    ok: true,
    stage: "paid",
    reference,
    slug: material.slug,
    amountCents: amount,
    receiptUrl: `/api/payments/${tx.id}/receipt`,
    redirectTo: await sessionPath(`/materials/${material.slug}`),
  };
}

export async function purchaseAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, redirectTo: "/login" };
  const materialId = Number(formData.get("materialId"));
  const material = await db.query.materials.findFirst({ where: eq(materials.id, materialId) });
  if (!material) return { ok: false };
  const rawMethod = str(formData, "paymentMethod");
  const paymentMethod: PaymentMethod =
    rawMethod === "instapay" || rawMethod === "card" || rawMethod === "wallet" || rawMethod === "free"
      ? rawMethod
      : material.priceCents === 0
        ? "free"
        : "card";
  await db
    .insert(purchases)
    .values({ userId: user.id, materialId, pricePaidCents: material.priceCents, paymentMethod, status: "paid" })
    .onConflictDoUpdate({
      target: [purchases.userId, purchases.materialId],
      set: { pricePaidCents: material.priceCents, paymentMethod, status: "paid", purchasedAt: new Date() },
    });
  revalidatePath("/materials");
  revalidatePath(`/materials/${material.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/payments");
  const target = await sessionPath(`/materials/${material.slug}`);
  return { ok: true, slug: material.slug, redirectTo: target };
}

export async function toggleLessonCompleteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const lessonId = Number(formData.get("lessonId"));
  const slug = str(formData, "slug");
  const completed = formData.get("completed") === "true";
  const nextLessonId = formData.get("nextLessonId") ? Number(formData.get("nextLessonId")) : null;

  if (completed) {
    await db.delete(lessonProgress).where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lessonId)));
  } else {
    await db.insert(lessonProgress).values({ userId: user.id, lessonId }).onConflictDoNothing();
  }
  revalidatePath(`/materials/${slug}`, "layout");
  revalidatePath("/dashboard");
  if (!completed && nextLessonId) await authRedirect(`/materials/${slug}/lessons/${nextLessonId}`);
}

export async function setLessonCompleteAction(lessonId: number, slug: string, completed: boolean) {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  if (completed) {
    await db.insert(lessonProgress).values({ userId: user.id, lessonId }).onConflictDoNothing();
  } else {
    await db.delete(lessonProgress).where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lessonId)));
  }
  revalidatePath(`/materials/${slug}`, "layout");
  revalidatePath("/dashboard");
  return { ok: true, completed };
}

export type QuizResult = {
  score: number;
  total: number;
  results: { questionId: number; correct: boolean; correctIndex: number; explanation: string | null }[];
} | null;

export async function submitQuizAction(_prev: QuizResult, formData: FormData): Promise<QuizResult> {
  const user = await getCurrentUser();
  if (!user) return null;
  const lessonId = Number(formData.get("lessonId"));
  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId), with: { material: true, questions: true } });
  if (!lesson || !lesson.questions.length) return null;

  const results = lesson.questions.map((q) => {
    const answer = Number(formData.get(`q_${q.id}`));
    return { questionId: q.id, correct: answer === q.correctIndex, correctIndex: q.correctIndex, explanation: q.explanation };
  });
  const score = results.filter((r) => r.correct).length;
  const total = lesson.questions.length;

  await db.insert(quizAttempts).values({ userId: user.id, lessonId, score, total });
  const existing = await db.query.grades.findFirst({ where: and(eq(grades.userId, user.id), eq(grades.lessonId, lessonId)) });
  if (!existing) {
    await db.insert(grades).values({
      userId: user.id,
      subjectId: lesson.material.subjectId,
      lessonId,
      title: `${lesson.title} quiz`,
      titleAr: `اختبار ${lesson.titleAr}`,
      kind: "quiz",
      score,
      maxScore: total,
    });
  } else if (score > existing.score) {
    await db.update(grades).set({ score, gradedAt: new Date() }).where(eq(grades.id, existing.id));
  }
  if (score === total || score / total >= 0.5) {
    await db.insert(lessonProgress).values({ userId: user.id, lessonId }).onConflictDoNothing();
  }
  revalidatePath(`/materials/${lesson.material.slug}`, "layout");
  revalidatePath("/grades");
  revalidatePath("/dashboard");
  return { score, total, results };
}

/* ---------- Profile ---------- */

export async function updateNameAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "common.errorGeneric" };
  const fullName = str(formData, "fullName").replace(/\s+/g, " ");
  if (fullName.length < 2) return { error: "errors.name" };
  await db.update(users).set({ fullName }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { success: "common.saved" };
}

export async function updatePhotoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "common.errorGeneric" };
  const url = str(formData, "avatarUrl");
  if (url && !/^https?:\/\/.+/i.test(url)) return { error: "errors.url" };
  await db.update(users).set({ avatarUrl: url || null }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { success: "common.saved" };
}

export async function updateContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "common.errorGeneric" };
  const email = str(formData, "email").toLowerCase();
  const phone = normalizePhone(str(formData, "phone"));
  const parentPhone = normalizePhone(str(formData, "parentPhone"));
  if (email && !EMAIL_RE.test(email)) return { error: "errors.contact" };
  if (phone && !isPhone(phone)) return { error: "errors.contact" };
  if (!email && !phone) return { error: "errors.contact" };
  if (parentPhone && !isPhone(parentPhone)) return { error: "errors.parentPhone" };

  if (email) {
    const taken = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (taken && taken.id !== user.id) return { error: "errors.contactTaken" };
  }
  if (phone) {
    const taken = await db.query.users.findFirst({ where: eq(users.phone, phone) });
    if (taken && taken.id !== user.id) return { error: "errors.contactTaken" };
  }
  await db
    .update(users)
    .set({ email: email || null, phone: phone || null, parentPhone: parentPhone || user.parentPhone })
    .where(eq(users.id, user.id));
  revalidatePath("/profile");
  return { success: "common.saved" };
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "common.errorGeneric" };
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (!verifyPassword(current, user.passwordHash)) return { error: "errors.currentPassword" };
  if (next.length < 6) return { error: "errors.password" };
  if (next !== confirm) return { error: "errors.passwordMatch" };
  await db.update(users).set({ passwordHash: hashPassword(next) }).where(eq(users.id, user.id));
  return { success: "common.saved" };
}

export async function updateNotificationsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  await db
    .update(users)
    .set({
      notifyEmail: formData.get("notifyEmail") === "on",
      notifySms: formData.get("notifySms") === "on",
      notifyTasks: formData.get("notifyTasks") === "on",
    })
    .where(eq(users.id, user.id));
  revalidatePath("/profile");
}

/* ---------- Task submissions ---------- */

export async function submitTaskWorkAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  // Deprecated: uploads now go through POST /api/tasks/[id]/submission.
  return { error: "common.errorGeneric" };
}

export async function removeSubmissionAction(_formData: FormData) {
  // Deprecated: removals now go through DELETE /api/tasks/[id]/submission.
}

export async function sendStudentMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "common.errorGeneric" };
  const body = str(formData, "body");
  const attachmentName = str(formData, "attachmentName");
  const attachmentData = str(formData, "attachmentData");
  if (!body) return { error: "common.errorGeneric" };
  if (attachmentData.length > 3_000_000) return { error: "common.errorGeneric" };

  await db.insert(messages).values({
    senderId: user.id,
    studentId: user.id,
    recipientType: "student",
    body: body.slice(0, 5000),
    attachmentName: attachmentName && attachmentData ? attachmentName.slice(0, 120) : null,
    attachmentData: attachmentName && attachmentData ? attachmentData : null,
  });
  revalidatePath("/messages");
  return { success: "common.saved" };
}
