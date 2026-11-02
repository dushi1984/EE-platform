import { db } from "@/db";
import { academicClasses, academicLevels, academicTerms, grades, lessonProgress, materials, messages, purchases, subjects, taskProgress, taskSubmissions, tasks, users } from "@/db/schema";
import { and, asc, desc, eq, gt, gte, sql } from "drizzle-orm";
import { ensureSeeded } from "@/db/seed";

const DAY = 24 * 60 * 60 * 1000;

export type ActivityStatus = "active" | "idle" | "inactive";

export type StudentRow = {
  id: number;
  fullName: string;
  avatarUrl: string | null;
  grade: string;
  studentCode: string;
  email: string | null;
  phone: string | null;
  avgGrade: number | null;
  doneTasks: number;
  openTasks: number;
  totalTasks: number;
  progressPct: number;
  lastLoginAt: Date | null;
  lastActivity: Date | null;
  status: ActivityStatus;
};

function activityOf(last: Date | null): ActivityStatus {
  if (!last) return "inactive";
  const days = (Date.now() - last.getTime()) / DAY;
  return days < 3 ? "active" : days < 8 ? "idle" : "inactive";
}

const asDate = (v: unknown): Date | null => (v ? new Date(v as string | number | Date) : null);

export async function getStudentRows(): Promise<StudentRow[]> {
  await ensureSeeded();
  const [studs, taskList, doneRows, gradeAgg, progressAct, lessonAct] = await Promise.all([
    db.select().from(users).where(eq(users.role, "student")).orderBy(asc(users.fullName)),
    db.select({ id: tasks.id, targetGrade: tasks.targetGrade }).from(tasks),
    db.select({ userId: taskProgress.userId, taskId: taskProgress.taskId }).from(taskProgress).where(eq(taskProgress.status, "done")),
    db
      .select({
        userId: grades.userId,
        score: sql<number>`sum(${grades.score})`.mapWith(Number),
        max: sql<number>`sum(${grades.maxScore})`.mapWith(Number),
      })
      .from(grades)
      .groupBy(grades.userId),
    db.select({ userId: taskProgress.userId, at: sql<unknown>`max(${taskProgress.updatedAt})` }).from(taskProgress).groupBy(taskProgress.userId),
    db.select({ userId: lessonProgress.userId, at: sql<unknown>`max(${lessonProgress.completedAt})` }).from(lessonProgress).groupBy(lessonProgress.userId),
  ]);

  const doneBy = new Map<number, Set<number>>();
  for (const r of doneRows) {
    if (!doneBy.has(r.userId)) doneBy.set(r.userId, new Set());
    doneBy.get(r.userId)!.add(r.taskId);
  }
  const gradeBy = new Map(gradeAgg.map((g) => [g.userId, g]));
  const progBy = new Map(progressAct.map((p) => [p.userId, asDate(p.at)]));
  const lessonBy = new Map(lessonAct.map((p) => [p.userId, asDate(p.at)]));

  return studs.map((u) => {
    const visible = taskList.filter((t) => t.targetGrade === "all" || t.targetGrade === u.grade);
    const ids = new Set(visible.map((t) => t.id));
    const done = [...(doneBy.get(u.id) ?? [])].filter((id) => ids.has(id)).length;
    const g = gradeBy.get(u.id);
    const times = [u.lastLoginAt, progBy.get(u.id) ?? null, lessonBy.get(u.id) ?? null].filter((x): x is Date => !!x);
    const last = times.length ? new Date(Math.max(...times.map((d) => d.getTime()))) : null;
    return {
      id: u.id,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
      grade: u.grade,
      studentCode: u.studentCode,
      email: u.email,
      phone: u.phone,
      avgGrade: g && g.max ? Math.round((g.score / g.max) * 100) : null,
      doneTasks: done,
      openTasks: Math.max(0, visible.length - done),
      totalTasks: visible.length,
      progressPct: visible.length ? Math.round((done / visible.length) * 100) : 0,
      lastLoginAt: u.lastLoginAt,
      lastActivity: last,
      status: activityOf(last),
    };
  });
}

export async function getStudentTrend(userId: number) {
  const since = new Date(Date.now() - 180 * DAY);
  const rows = await db
    .select({ score: grades.score, max: grades.maxScore, at: grades.gradedAt })
    .from(grades)
    .where(and(eq(grades.userId, userId), gte(grades.gradedAt, since)));
  const buckets = Array.from({ length: 6 }, () => ({ score: 0, max: 0 }));
  for (const r of rows) {
    const idx = Math.min(5, Math.floor((Date.now() - new Date(r.at).getTime()) / (30 * DAY)));
    buckets[5 - idx].score += r.score;
    buckets[5 - idx].max += r.max;
  }
  return buckets.map((b, i) => ({
    date: new Date(Date.now() - (5 - i) * 30 * DAY),
    pct: b.max ? Math.round((b.score / b.max) * 100) : (null as number | null),
  }));
}

export async function getTeacherDashboard() {
  const students = await getStudentRows();
  const [open] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(tasks).where(eq(tasks.status, "open"));
  const [pending] = await db
    .select({ cents: sql<number>`coalesce(sum(${purchases.pricePaidCents}),0)`.mapWith(Number) })
    .from(purchases)
    .where(eq(purchases.status, "pending"));
  return { students, totalStudents: students.length, activeTasks: open?.n ?? 0, pendingCents: pending?.cents ?? 0 };
}

export type TeacherTaskRow = {
  id: number;
  title: string;
  titleAr: string;
  taskType: string;
  dueDate: Date;
  termName: string | null;
  termNameAr: string | null;
  status: string;
  submitted: number;
  total: number;
  subjectName: string;
  subjectNameAr: string;
  subjectIcon: string;
};

export async function getTeacherTasks(): Promise<TeacherTaskRow[]> {
  await ensureSeeded();
  const [rows, studs, subCounts] = await Promise.all([
    db.select({ task: tasks, subject: subjects }).from(tasks).innerJoin(subjects, eq(subjects.id, tasks.subjectId)).orderBy(desc(tasks.dueDate)),
    db.select({ id: users.id, grade: users.grade }).from(users).where(eq(users.role, "student")),
    db.select({ taskId: taskSubmissions.taskId, n: sql<number>`count(*)`.mapWith(Number) }).from(taskSubmissions).groupBy(taskSubmissions.taskId),
  ]);
  const termRows = await db.select().from(academicTerms);
  const termById = new Map(termRows.map((tm) => [tm.id, tm]));
  const countBy = new Map(subCounts.map((c) => [c.taskId, c.n]));
  return rows.map(({ task, subject }) => ({
    id: task.id,
    title: task.title,
    titleAr: task.titleAr,
    taskType: task.taskType,
    dueDate: task.dueDate,
    termName: task.termId ? (termById.get(task.termId)?.name ?? null) : null,
    termNameAr: task.termId ? (termById.get(task.termId)?.nameAr ?? null) : null,
    status: task.status,
    submitted: countBy.get(task.id) ?? 0,
    total: studs.filter((s) => task.targetGrade === "all" || task.targetGrade === s.grade).length,
    subjectName: subject.name,
    subjectNameAr: subject.nameAr,
    subjectIcon: subject.icon,
  }));
}

export type SubmissionRow = {
  user: { id: number; fullName: string; avatarUrl: string | null };
  submissionId: number | null;
  fileName: string | null;
  submittedAt: Date | null;
  score: number | null;
  isGraded: boolean;
  isToGrade: boolean;
  isLate: boolean;
};

export async function getTaskSubmissionRows(taskId: number) {
  await ensureSeeded();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId), with: { subject: true } });
  if (!task) return null;
  const [studs, subs] = await Promise.all([
    db.select().from(users).where(eq(users.role, "student")).orderBy(asc(users.fullName)),
    db.select().from(taskSubmissions).where(eq(taskSubmissions.taskId, taskId)),
  ]);
  const subBy = new Map(subs.map((s) => [s.userId, s]));
  const due = task.dueDate.getTime();
  const rows: SubmissionRow[] = studs
    .filter((u) => task.targetGrade === "all" || task.targetGrade === u.grade)
    .map((u) => {
      const s = subBy.get(u.id);
      return {
        user: { id: u.id, fullName: u.fullName, avatarUrl: u.avatarUrl },
        submissionId: s?.id ?? null,
        fileName: s?.fileName ?? null,
        submittedAt: s?.submittedAt ?? null,
        score: s?.score ?? null,
        isGraded: !!s && s.score !== null,
        isToGrade: !!s && s.score === null,
        isLate: s ? s.submittedAt.getTime() > due : due < Date.now(),
      };
    });
  return { task, rows };
}

export async function getTeacherMaterials() {
  await ensureSeeded();
  return db.query.materials.findMany({
    with: { subject: true, lessons: { columns: { id: true } } },
    orderBy: [desc(materials.updatedAt)],
  });
}

export type PaymentRange = "month" | "30" | "all";
export const PAYMENTS_PAGE_SIZE = 6;

export async function getStudentDetail(studentId: number) {
  await ensureSeeded();
  const students = await getStudentRows();
  const student = students.find((s) => s.id === studentId);
  if (!student) return null;
  const [fullUser, recentGrades, recentTasks, sentMessages] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, studentId) }),
    db.query.grades.findMany({
      where: eq(grades.userId, studentId),
      with: { subject: true },
      orderBy: [desc(grades.gradedAt)],
      limit: 8,
    }),
    db
      .select({ task: tasks, progress: taskProgress, submission: taskSubmissions })
      .from(tasks)
      .leftJoin(taskProgress, and(eq(taskProgress.taskId, tasks.id), eq(taskProgress.userId, studentId)))
      .leftJoin(taskSubmissions, and(eq(taskSubmissions.taskId, tasks.id), eq(taskSubmissions.userId, studentId)))
      .where(sql`${tasks.targetGrade} = 'all' or ${tasks.targetGrade} = ${student.grade}`)
      .orderBy(desc(tasks.dueDate))
      .limit(8),
    db.query.messages.findMany({
      where: eq(messages.studentId, studentId),
      with: { sender: true, student: true },
      orderBy: [desc(messages.createdAt)],
      limit: 8,
    }),
  ]);
  return { student, fullUser: fullUser!, recentGrades, recentTasks, messages: sentMessages };
}

export async function getMessagesForUser(userId: number, role: string) {
  await ensureSeeded();
  return db.query.messages.findMany({
    where:
      role === "teacher"
        ? undefined
        : and(eq(messages.studentId, userId), eq(messages.recipientType, "student")),
    with: { sender: true, student: true },
    orderBy: [desc(messages.createdAt)],
  });
}


/* ---------- Academic structure ---------- */

const DEFAULT_LEVELS = ["Grade 10", "Grade 11", "Grade 12"];
const DEFAULT_TERMS = ["First Term", "Second Term"];

let structurePromise: Promise<void> | null = null;

export async function ensureAcademicStructure() {
  if (!structurePromise) {
    structurePromise = ensureAcademicStructureOnce().finally(() => {
      structurePromise = null;
    });
  }
  return structurePromise;
}

async function ensureAcademicStructureOnce() {
  await ensureSeeded();
  const [lc] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(academicLevels);
  if ((lc?.n ?? 0) === 0) {
    await db.insert(academicLevels).values(
      DEFAULT_LEVELS.map((name, i) => ({
        name,
        nameAr: `الصف ${name.replace("Grade ", "")}`,
        sortOrder: i,
      })),
    );
  }
  const [tc] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(academicTerms);
  if ((tc?.n ?? 0) === 0) {
    await db.insert(academicTerms).values([
      { name: "First Term", nameAr: "الترم الأول", isActive: true, sortOrder: 0 },
      { name: "Second Term", nameAr: "الترم الثاني", isActive: false, sortOrder: 1 },
    ]);
  }
}

export async function getAcademicLevels() {
  await ensureAcademicStructure();
  return db.select().from(academicLevels).orderBy(asc(academicLevels.sortOrder), asc(academicLevels.id));
}

export async function getAcademicTerms() {
  await ensureAcademicStructure();
  return db.select().from(academicTerms).orderBy(asc(academicTerms.sortOrder), asc(academicTerms.id));
}

export async function getAcademicClasses() {
  await ensureAcademicStructure();
  const rows = await db
    .select({ cls: academicClasses, level: academicLevels })
    .from(academicClasses)
    .innerJoin(academicLevels, eq(academicLevels.id, academicClasses.levelId))
    .orderBy(asc(academicLevels.sortOrder), asc(academicClasses.name));
  return rows.map((r) => ({ ...r.cls, levelName: r.level.name, levelNameAr: r.level.nameAr }));
}

export async function getAcademicSubjectsList() {
  await ensureAcademicStructure();
  return db.select().from(subjects).orderBy(asc(subjects.id));
}

export async function getPayments(range: PaymentRange, page: number) {
  await ensureSeeded();
  const now = new Date();
  const since = range === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : range === "30" ? new Date(Date.now() - 30 * DAY) : null;
  const where = since ? and(gt(purchases.pricePaidCents, 0), gte(purchases.purchasedAt, since)) : gt(purchases.pricePaidCents, 0);

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
