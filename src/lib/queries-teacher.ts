import { and, asc, desc, eq, gt, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  academicClasses,
  academicLevels,
  academicTerms,
  grades,
  materials,
  messages,
  payments,
  purchases,
  subjects,
  taskProgress,
  taskSubmissions,
  tasks,
  users,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { taskAppliesToStudent } from "@/lib/queries";

const DAY = 86_400_000;

export type StudentStatus = "active" | "idle" | "inactive";
export type ActivityStatus = StudentStatus;

export function computeStatus(lastActivity: Date | null): StudentStatus {
  if (!lastActivity) return "inactive";
  const age = Date.now() - lastActivity.getTime();
  if (age <= 2 * DAY) return "active";
  if (age <= 7 * DAY) return "idle";
  return "inactive";
}

export type StudentRow = {
  id: number;
  fullName: string;
  studentCode: string;
  email: string | null;
  phone: string | null;
  parentName: string;
  parentPhone: string;
  grade: string;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  lastActivity: Date | null;
  status: StudentStatus;
  avgGrade: number | null;
  openTasks: number;
  doneTasks: number;
  totalTasks: number;
  progressPct: number;
};

export async function getStudentRows(): Promise<StudentRow[]> {
  await ensureSeeded();
  const [students, allGrades, allTasks, allProgress, allSubs] = await Promise.all([
    db.select().from(users).where(eq(users.role, "student")).orderBy(asc(users.id)),
    db.select().from(grades),
    db.select().from(tasks),
    db.select().from(taskProgress),
    db.select().from(taskSubmissions),
  ]);

  return students.map((s) => {
    const gRows = allGrades.filter((g) => g.userId === s.id);
    const totalScore = gRows.reduce((a, g) => a + g.score, 0);
    const totalMax = gRows.reduce((a, g) => a + g.maxScore, 0);
    const avgGrade = totalMax ? Math.round((totalScore / totalMax) * 100) : null;

    const forStudent = allTasks.filter((t) => taskAppliesToStudent(t, s));
    const progMap = new Map(allProgress.filter((p) => p.userId === s.id).map((p) => [p.taskId, p]));
    const doneTasks = forStudent.filter((t) => progMap.get(t.id)?.status === "done").length;
    const openTasks = forStudent.filter((t) => t.status === "open" && progMap.get(t.id)?.status !== "done").length;
    const totalTasks = forStudent.length;
    const progressPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const subDates = allSubs.filter((x) => x.userId === s.id).map((x) => x.submittedAt.getTime());
    const progDates = allProgress.filter((x) => x.userId === s.id).map((x) => x.updatedAt.getTime());
    const candidates = [s.lastLoginAt?.getTime() ?? 0, ...subDates, ...progDates].filter(Boolean);
    const lastActivity = candidates.length ? new Date(Math.max(...candidates)) : null;

    return {
      id: s.id,
      fullName: s.fullName,
      studentCode: s.studentCode,
      email: s.email,
      phone: s.phone,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      grade: s.grade,
      avatarUrl: s.avatarUrl,
      lastLoginAt: s.lastLoginAt,
      lastActivity,
      status: computeStatus(lastActivity),
      avgGrade,
      openTasks,
      doneTasks,
      totalTasks,
      progressPct,
    };
  });
}

export async function getStudentTrend(studentId: number) {
  await ensureSeeded();
  const rows = await db
    .select({ score: grades.score, max: grades.maxScore, at: grades.gradedAt })
    .from(grades)
    .where(eq(grades.userId, studentId))
    .orderBy(asc(grades.gradedAt));

  const now = new Date();
  const buckets: { monthIndex: number; year: number; pct: number | null; date: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const inMonth = rows.filter((r) => r.at.getFullYear() === d.getFullYear() && r.at.getMonth() === d.getMonth());
    const s = inMonth.reduce((a, x) => a + x.score, 0);
    const m = inMonth.reduce((a, x) => a + x.max, 0);
    buckets.push({ monthIndex: d.getMonth(), year: d.getFullYear(), pct: m ? Math.round((s / m) * 100) : null, date: d });
  }
  let carry = buckets.find((b) => b.pct !== null)?.pct ?? null;
  for (const b of buckets) {
    if (b.pct === null) b.pct = carry;
    else carry = b.pct;
  }
  return buckets;
}

export async function getTeacherDashboard() {
  const [students, allTasks, allPayments] = await Promise.all([
    getStudentRows(),
    db.select().from(tasks),
    db.select().from(payments),
  ]);
  const activeTasks = allTasks.filter((t) => t.status === "open").length;
  const pendingCents = allPayments.filter((p) => p.status === "pending").reduce((a, p) => a + p.amountCents, 0);
  return {
    totalStudents: students.length,
    activeTasks,
    pendingCents,
    students,
  };
}

export type TeacherTaskRow = {
  id: number;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  taskType: string;
  dueDate: Date;
  status: string;
  maxScore: number;
  targetGrade: string;
  targetClassId: number | null;
  targetClassName: string | null;
  targetClassNameAr: string | null;
  targetStudentId: number | null;
  targetStudentName: string | null;
  termId: number | null;
  termName: string | null;
  termNameAr: string | null;
  hasQuiz: boolean;
  attachmentName: string | null;
  attachmentUrl: string | null;
  subject: { id: number; name: string; nameAr: string; icon: string };
  submitted: number;
  total: number;
};

export async function getTeacherTasks(): Promise<TeacherTaskRow[]> {
  await ensureSeeded();
  const [rows, students, subs, terms, classes] = await Promise.all([
    db.query.tasks.findMany({ with: { subject: true }, orderBy: [desc(tasks.dueDate), desc(tasks.id)] }),
    db
      .select({ id: users.id, fullName: users.fullName, grade: users.grade, classId: users.classId })
      .from(users)
      .where(eq(users.role, "student")),
    db.select({ taskId: taskSubmissions.taskId, userId: taskSubmissions.userId }).from(taskSubmissions),
    db.select().from(academicTerms),
    db.query.academicClasses.findMany({ with: { level: true } }),
  ]);
  const termById = new Map(terms.map((tm) => [tm.id, tm]));
  const studentById = new Map(students.map((s) => [s.id, s]));
  const classById = new Map(classes.map((cl) => [cl.id, cl]));

  return rows.map((t) => {
    const targetStudent = t.targetStudentId ? studentById.get(t.targetStudentId) : null;
    const targetClass = t.targetClassId ? classById.get(t.targetClassId) : null;
    const inAudience = students.filter((s) => taskAppliesToStudent(t, s));
    const inSet = new Set(inAudience.map((s) => s.id));
    const submitted = subs.filter((s) => s.taskId === t.id && inSet.has(s.userId)).length;
    const tm = t.termId ? termById.get(t.termId) : undefined;
    return {
      id: t.id,
      title: t.title,
      titleAr: t.titleAr,
      description: t.description,
      descriptionAr: t.descriptionAr,
      taskType: t.taskType,
      dueDate: t.dueDate,
      status: t.status,
      maxScore: t.maxScore,
      targetGrade: t.targetGrade,
      targetClassId: t.targetClassId,
      targetClassName: targetClass ? `${targetClass.name} (${targetClass.level.name})` : null,
      targetClassNameAr: targetClass ? `${targetClass.nameAr || targetClass.name} (${targetClass.level.nameAr})` : null,
      targetStudentId: t.targetStudentId,
      targetStudentName: targetStudent?.fullName ?? null,
      termId: t.termId,
      termName: tm?.name ?? null,
      termNameAr: tm?.nameAr ?? null,
      hasQuiz: Boolean(t.quizQuestions && t.quizQuestions.length > 0),
      attachmentName: t.attachmentName,
      attachmentUrl: t.attachmentUrl,
      subject: t.subject,
      submitted,
      total: inAudience.length,
    };
  });
}

export async function getTaskSubmissionRows(taskId: number) {
  await ensureSeeded();
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      subject: true,
      targetClass: { with: { level: true } },
      targetStudent: true,
    },
  });
  if (!task) return null;
  const [allStudents, subs, progs] = await Promise.all([
    db.select().from(users).where(eq(users.role, "student")).orderBy(asc(users.id)),
    db.select().from(taskSubmissions).where(eq(taskSubmissions.taskId, taskId)),
    db.select().from(taskProgress).where(eq(taskProgress.taskId, taskId)),
  ]);
  const students = allStudents.filter((s) => taskAppliesToStudent(task, s));
  const subByUser = new Map(subs.map((s) => [s.userId, s]));
  const progByUser = new Map(progs.map((p) => [p.userId, p]));
  const pastDue = task.dueDate.getTime() < Date.now();

  const rows = students.map((s) => {
    const sub = subByUser.get(s.id);
    const prog = progByUser.get(s.id);
    const rawStatus = prog?.status;
    const studentStatus: "todo" | "in_progress" | "done" =
      rawStatus === "done" || rawStatus === "in_progress" ? rawStatus : sub ? "done" : "todo";
    const progress = prog?.progress ?? (studentStatus === "done" ? 100 : 0);
    const isGraded = sub?.score !== null && sub?.score !== undefined;
    const isChecked = Boolean(sub?.checkedAt);
    const isSubmitted = !!sub;
    const isLate = (isSubmitted && sub!.submittedAt.getTime() > task.dueDate.getTime()) || (!isSubmitted && pastDue);
    const isToGrade = isSubmitted && !isGraded;
    return {
      user: {
        id: s.id,
        fullName: s.fullName,
        avatarUrl: s.avatarUrl,
        studentCode: s.studentCode,
        grade: s.grade,
        classId: s.classId,
      },
      studentStatus,
      progress,
      submissionId: sub?.id ?? null,
      fileName: sub?.fileName ?? null,
      fileUrl: sub?.fileUrl ?? null,
      fileStoragePath: sub?.fileStoragePath ?? null,
      note: sub?.note ?? "",
      teacherFeedback: sub?.teacherFeedback ?? "",
      checkedAt: sub?.checkedAt ?? null,
      isChecked,
      quizAnswers: sub?.quizAnswers ?? null,
      submittedAt: sub?.submittedAt ?? null,
      gradedAt: sub?.gradedAt ?? null,
      score: sub?.score ?? null,
      isSubmitted,
      isGraded,
      isToGrade,
      isLate,
    };
  });
  return { task, rows };
}

export async function getTeacherMaterials() {
  await ensureSeeded();
  return db.query.materials.findMany({
    with: { subject: true, lessons: true },
    orderBy: [desc(materials.updatedAt), desc(materials.id)],
  });
}

export async function getTeacherPayments(rangeDays: number | "all" = 30) {
  await ensureSeeded();
  const all = await db.query.payments.findMany({
    with: { user: true, material: true },
    orderBy: [desc(payments.createdAt)],
  });
  const cutoff = rangeDays === "all" ? 0 : Date.now() - rangeDays * DAY;
  const rows = all.filter((p) => p.createdAt.getTime() >= cutoff);
  const totalRevenueCents = rows.filter((p) => p.status === "paid").reduce((a, p) => a + p.amountCents, 0);
  const paidCount = rows.filter((p) => p.status === "paid").length;
  const pendingCount = rows.filter((p) => p.status === "pending").length;
  return { rows, totalRevenueCents, paidCount, pendingCount };
}

export async function getStudentDetail(studentId: number) {
  const [rows, recentGrades, allTasks, prog, subs, fullUser, sentMessages, classes] = await Promise.all([
    getStudentRows(),
    db.query.grades.findMany({ where: eq(grades.userId, studentId), with: { subject: true }, orderBy: [desc(grades.gradedAt)], limit: 6 }),
    db.query.tasks.findMany({ with: { subject: true }, orderBy: [desc(tasks.dueDate), desc(tasks.id)] }),
    db.select().from(taskProgress).where(eq(taskProgress.userId, studentId)),
    db.select().from(taskSubmissions).where(eq(taskSubmissions.userId, studentId)),
    db.query.users.findFirst({ where: eq(users.id, studentId) }),
    db.query.messages.findMany({
      where: eq(messages.studentId, studentId),
      with: { sender: true, student: true },
      orderBy: [desc(messages.createdAt)],
      limit: 8,
    }),
    db.query.academicClasses.findMany({ with: { level: true } }),
  ]);
  const student = rows.find((r) => r.id === studentId);
  if (!student || !fullUser) return null;
  const classById = new Map(classes.map((cl) => [cl.id, cl]));
  const studentClass = fullUser.classId ? classById.get(fullUser.classId) ?? null : null;
  const pByTask = new Map(prog.map((p) => [p.taskId, p]));
  const sByTask = new Map(subs.map((s) => [s.taskId, s]));
  const visible = allTasks
    .filter((t) => taskAppliesToStudent(t, fullUser))
    .sort((a, b) => {
      const aPersonal = a.targetStudentId === studentId ? 1 : 0;
      const bPersonal = b.targetStudentId === studentId ? 1 : 0;
      if (aPersonal !== bPersonal) return bPersonal - aPersonal;
      return b.dueDate.getTime() - a.dueDate.getTime();
    })
    .map((t) => {
      const targetClass = t.targetClassId ? classById.get(t.targetClassId) ?? null : null;
      return {
        task: t,
        progress: pByTask.get(t.id) ?? null,
        submission: sByTask.get(t.id) ?? null,
        isPersonal: t.targetStudentId === studentId,
        targetClassName: targetClass ? targetClass.name : null,
        targetClassNameAr: targetClass ? targetClass.nameAr || targetClass.name : null,
      };
    });
  return {
    student,
    fullUser,
    studentClass,
    recentGrades,
    recentTasks: visible,
    messages: sentMessages,
  };
}

export async function getMessagesForUser(userId: number, role: string) {
  await ensureSeeded();
  const where = role === "teacher" ? undefined : eq(messages.studentId, userId);
  return db.query.messages.findMany({
    where,
    with: { sender: true, student: true },
    orderBy: [desc(messages.createdAt)],
    limit: 50,
  });
}

/* -------------------- Academic structure queries -------------------- */

export async function getAcademicLevels() {
  await ensureSeeded();
  return db.select().from(academicLevels).orderBy(asc(academicLevels.sortOrder), asc(academicLevels.id));
}

export async function getAcademicClasses() {
  await ensureSeeded();
  const rows = await db.query.academicClasses.findMany({
    with: { level: true },
    orderBy: [asc(academicClasses.levelId), asc(academicClasses.id)],
  });
  return rows.map((r) => ({ ...r, levelName: r.level.name, levelNameAr: r.level.nameAr }));
}

export async function getAcademicTerms() {
  await ensureSeeded();
  return db.select().from(academicTerms).orderBy(asc(academicTerms.sortOrder), asc(academicTerms.id));
}

export async function getAcademicSubjectsList() {
  await ensureSeeded();
  return db.select().from(subjects).orderBy(asc(subjects.id));
}

export type PaymentRange = "month" | "30" | "all";
export const PAYMENTS_PAGE_SIZE = 6;

export async function getPayments(range: PaymentRange, page: number) {
  await ensureSeeded();
  const now = new Date();
  const since =
    range === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : range === "30"
        ? new Date(Date.now() - 30 * DAY)
        : null;
  const where = since
    ? and(gt(purchases.pricePaidCents, 0), gte(purchases.purchasedAt, since))
    : gt(purchases.pricePaidCents, 0);

  const [sum] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${purchases.pricePaidCents}) filter (where ${purchases.status} = 'paid'),0)`.mapWith(Number),
      collected: sql<number>`count(*) filter (where ${purchases.status} = 'paid')`.mapWith(Number),
      pending: sql<number>`coalesce(sum(${purchases.pricePaidCents}) filter (where ${purchases.status} = 'pending'),0)`.mapWith(Number),
      total: sql<number>`count(*)`.mapWith(Number),
    })
    .from(purchases)
    .where(where);

  const totalPages = Math.max(1, Math.ceil(sum.total / PAYMENTS_PAGE_SIZE));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  const rows = await db
    .select({
      id: purchases.id,
      date: purchases.purchasedAt,
      cents: purchases.pricePaidCents,
      method: purchases.paymentMethod,
      status: purchases.status,
      studentName: users.fullName,
      avatarUrl: users.avatarUrl,
      itemTitle: materials.title,
      itemTitleAr: materials.titleAr,
    })
    .from(purchases)
    .innerJoin(users, eq(users.id, purchases.userId))
    .innerJoin(materials, eq(materials.id, purchases.materialId))
    .where(where)
    .orderBy(desc(purchases.purchasedAt))
    .limit(PAYMENTS_PAGE_SIZE)
    .offset((current - 1) * PAYMENTS_PAGE_SIZE);

  return { summary: sum, rows, page: current, totalPages };
}
