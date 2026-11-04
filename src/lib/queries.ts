import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  grades,
  lessonProgress,
  lessons,
  materialViews,
  materials,
  messages,
  purchases,
  subjects,
  taskProgress,
  taskSubmissions,
  tasks,
  users,
  type TaskQuizQuestion,
  type TaskStatus,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";

export function taskAppliesToStudent(
  task: { targetStudentId: number | null; targetGrade: string },
  student: { id: number; grade: string },
): boolean {
  if (task.targetStudentId !== null && task.targetStudentId !== undefined) {
    return task.targetStudentId === student.id;
  }
  return task.targetGrade === "all" || task.targetGrade === student.grade;
}

export type TaskRow = {
  id: number;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  dueDate: Date;
  subject: { id: number; name: string; nameAr: string; color: string; icon: string };
  status: TaskStatus;
  progress: number;
  overdue: boolean;
  taskType: string;
  attachmentName: string | null;
  hasSubmission: boolean;
  isPersonal: boolean;
  hasQuiz: boolean;
};

const DAY = 86_400_000;

export async function getTasksForUser(userId: number): Promise<TaskRow[]> {
  await ensureSeeded();
  const [me, allTasks, progressRows, submissionRows] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.tasks.findMany({ with: { subject: true }, orderBy: [asc(tasks.dueDate)] }),
    db.select().from(taskProgress).where(eq(taskProgress.userId, userId)),
    db.select({ taskId: taskSubmissions.taskId }).from(taskSubmissions).where(eq(taskSubmissions.userId, userId)),
  ]);
  const myGrade = me?.grade ?? "Grade 10";
  const byTask = new Map(progressRows.map((p) => [p.taskId, p]));
  const submittedSet = new Set(submissionRows.map((s) => s.taskId));
  const now = Date.now();
  return allTasks
    .filter((t) => taskAppliesToStudent(t, { id: userId, grade: myGrade }))
    .filter((t) => byTask.get(t.id)?.status !== "dismissed")
    .map((t) => {
      const p = byTask.get(t.id);
      const status = (p?.status ?? "todo") as TaskStatus;
      return {
        id: t.id,
        title: t.title,
        titleAr: t.titleAr,
        description: t.description,
        descriptionAr: t.descriptionAr,
        dueDate: t.dueDate,
        subject: t.subject,
        status,
        progress: p?.progress ?? 0,
        overdue: status !== "done" && t.dueDate.getTime() < now - DAY,
        taskType: t.taskType,
        attachmentName: t.attachmentName,
        hasSubmission: submittedSet.has(t.id),
        isPersonal: t.targetStudentId === userId,
        hasQuiz: Boolean(t.quizQuestions && t.quizQuestions.length > 0),
      };
    });
}

/** Split tasks into "this week" (upcoming + due within last 2 days if still active) vs "archive". */
export function splitTasks(rows: TaskRow[]) {
  const cutoff = Date.now() - 2 * DAY;
  const week: TaskRow[] = [];
  const archive: TaskRow[] = [];
  for (const r of rows) {
    if (r.dueDate.getTime() >= cutoff) week.push(r);
    else archive.push(r);
  }
  archive.reverse();
  return { week, archive };
}

export type MaterialCardData = {
  id: number;
  slug: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  thumbnailUrl: string | null;
  priceCents: number;
  isNew: boolean;
  kind: string;
  fileSize: string;
  fileName: string | null;
  fileUrl: string | null;
  storagePath: string | null;
  subject: { id: number; name: string; nameAr: string; color: string; icon: string };
  purchased: boolean;
  lessonCount: number;
  completedLessons: number;
  percent: number;
  totalMinutes: number;
};

export async function getAllSubjects() {
  await ensureSeeded();
  return db.select().from(subjects).orderBy(asc(subjects.id));
}

export async function getMaterialsForUser(userId: number): Promise<MaterialCardData[]> {
  await ensureSeeded();
  const [all, owned, completed] = await Promise.all([
    db.query.materials.findMany({
      with: { subject: true, lessons: true },
      orderBy: [desc(materials.isNew), asc(materials.id)],
    }),
    db.select({ materialId: purchases.materialId }).from(purchases).where(eq(purchases.userId, userId)),
    db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress).where(eq(lessonProgress.userId, userId)),
  ]);
  const ownedSet = new Set(owned.map((o) => o.materialId));
  const doneSet = new Set(completed.map((c) => c.lessonId));

  return all
    .filter((m) => m.published)
    .map((m) => {
      const lessonCount = m.lessons.length;
      const completedLessons = m.lessons.filter((l) => doneSet.has(l.id)).length;
      const purchased = m.priceCents === 0 || ownedSet.has(m.id);
      return {
        id: m.id,
        slug: m.slug,
        title: m.title,
        titleAr: m.titleAr,
        description: m.description,
        descriptionAr: m.descriptionAr,
        thumbnailUrl: m.thumbnailUrl,
        priceCents: m.priceCents,
        isNew: m.isNew,
        kind: m.kind,
        fileSize: m.fileSize,
        fileName: m.fileName,
        fileUrl: m.fileUrl,
        storagePath: m.storagePath,
        subject: m.subject,
        purchased,
        lessonCount,
        completedLessons,
        percent: lessonCount ? Math.round((completedLessons / lessonCount) * 100) : 0,
        totalMinutes: m.lessons.reduce((a, l) => a + l.durationMinutes, 0),
      };
    });
}

export async function getMaterialBySlug(slug: string, userId: number) {
  await ensureSeeded();
  const m = await db.query.materials.findFirst({
    where: eq(materials.slug, slug),
    with: {
      subject: true,
      lessons: {
        orderBy: [asc(lessons.position)],
        with: { questions: true },
      },
    },
  });
  if (!m) return null;
  const [owned, done, me] = await Promise.all([
    db.query.purchases.findFirst({ where: and(eq(purchases.userId, userId), eq(purchases.materialId, m.id)) }),
    db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress).where(eq(lessonProgress.userId, userId)),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
  ]);
  const doneSet = new Set(done.map((d) => d.lessonId));
  const purchased = me?.role === "teacher" || m.priceCents === 0 || !!owned;
  return { ...m, purchased, doneSet };
}

export async function recordMaterialView(userId: number, materialId: number) {
  await db
    .insert(materialViews)
    .values({ userId, materialId })
    .onConflictDoUpdate({
      target: [materialViews.userId, materialViews.materialId],
      set: { viewedAt: new Date() },
    });
}

export async function getLastViewedMaterials(userId: number, limit = 4) {
  const all = await getMaterialsForUser(userId);
  const views = await db
    .select({ materialId: materialViews.materialId, viewedAt: materialViews.viewedAt })
    .from(materialViews)
    .where(eq(materialViews.userId, userId))
    .orderBy(desc(materialViews.viewedAt))
    .limit(limit);
  const byId = new Map(all.map((m) => [m.id, m]));
  return views.map((v) => byId.get(v.materialId)).filter((m): m is MaterialCardData => !!m);
}

export type GradeRow = {
  id: number;
  title: string;
  titleAr: string;
  kind: string;
  score: number;
  maxScore: number;
  gradedAt: Date;
  subject: { id: number; name: string; nameAr: string; color: string; icon: string };
};

export async function getGradesForUser(userId: number) {
  await ensureSeeded();
  const rows = await db.query.grades.findMany({
    where: eq(grades.userId, userId),
    with: { subject: true },
    orderBy: [desc(grades.gradedAt)],
  });
  const list: GradeRow[] = rows;
  const totalScore = list.reduce((a, g) => a + g.score, 0);
  const totalMax = list.reduce((a, g) => a + g.maxScore, 0);
  const overall = totalMax ? Math.round((totalScore / totalMax) * 100) : null;

  const bySubjectMap = new Map<number, { subject: GradeRow["subject"]; score: number; max: number; count: number }>();
  for (const g of list) {
    const cur = bySubjectMap.get(g.subject.id) ?? { subject: g.subject, score: 0, max: 0, count: 0 };
    cur.score += g.score;
    cur.max += g.maxScore;
    cur.count += 1;
    bySubjectMap.set(g.subject.id, cur);
  }
  const bySubject = [...bySubjectMap.values()]
    .map((s) => ({ ...s, percent: s.max ? Math.round((s.score / s.max) * 100) : 0 }))
    .sort((a, b) => b.percent - a.percent);

  return { list, overall, bySubject, best: bySubject[0] ?? null };
}

export async function getDashboardData(userId: number) {
  const [allTasks, viewed, materialsList, gradesData] = await Promise.all([
    getTasksForUser(userId),
    getLastViewedMaterials(userId, 4),
    getMaterialsForUser(userId),
    getGradesForUser(userId),
  ]);
  const active = allTasks.filter((t) => t.status !== "done");
  const upcoming = [...active].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 4);
  return {
    upcoming,
    activeCount: active.length,
    doneCount: allTasks.filter((t) => t.status === "done").length,
    viewed,
    myMaterials: materialsList.filter((m) => m.purchased),
    newMaterials: materialsList.filter((m) => m.isNew && !m.purchased).slice(0, 3),
    overall: gradesData.overall,
  };
}

export type TaskDetail = TaskRow & {
  isClosed: boolean;
  maxScore: number;
  attachmentUrl: string | null;
  attachmentStoragePath: string | null;
  quizQuestions: TaskQuizQuestion[] | null;
  submission: {
    id: number;
    fileName: string;
    note: string;
    submittedAt: Date;
    score: number | null;
    gradedAt: Date | null;
    maxScore: number;
  } | null;
};

export async function getTaskById(userId: number, taskId: number): Promise<TaskDetail | null> {
  await ensureSeeded();
  const [row, me] = await Promise.all([
    db.query.tasks.findFirst({ where: eq(tasks.id, taskId), with: { subject: true } }),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
  ]);
  if (!row || !me) return null;
  if (me.role === "student" && !taskAppliesToStudent(row, me)) {
    return null;
  }
  const [prog, submission] = await Promise.all([
    db.query.taskProgress.findFirst({ where: and(eq(taskProgress.taskId, taskId), eq(taskProgress.userId, userId)) }),
    db.query.taskSubmissions.findFirst({ where: and(eq(taskSubmissions.taskId, taskId), eq(taskSubmissions.userId, userId)) }),
  ]);
  const status = (prog?.status ?? "todo") as TaskStatus;
  return {
    id: row.id,
    title: row.title,
    titleAr: row.titleAr,
    description: row.description,
    descriptionAr: row.descriptionAr,
    dueDate: row.dueDate,
    subject: row.subject,
    status,
    progress: prog?.progress ?? 0,
    overdue: status !== "done" && row.dueDate.getTime() < Date.now() - DAY,
    taskType: row.taskType,
    attachmentName: row.attachmentName,
    attachmentUrl: row.attachmentUrl,
    attachmentStoragePath: row.attachmentStoragePath,
    quizQuestions: row.quizQuestions ?? null,
    hasSubmission: !!submission,
    isPersonal: row.targetStudentId === userId,
    hasQuiz: Boolean(row.quizQuestions && row.quizQuestions.length > 0),
    isClosed: row.status === "closed",
    maxScore: row.maxScore,
    submission: submission
      ? {
          id: submission.id,
          fileName: submission.fileName,
          note: submission.note,
          submittedAt: submission.submittedAt,
          score: submission.score,
          gradedAt: submission.gradedAt,
          maxScore: row.maxScore,
        }
      : null,
  };
}

export async function getUnreadMessageCount(userId: number, role = "student") {
  await ensureSeeded();
  if (role === "teacher") {
    const [row] = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(messages)
      .where(and(sql`${messages.senderId} = ${messages.studentId}`, sql`${messages.readAt} is null`));
    return row?.n ?? 0;
  }
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(messages)
    .where(
      and(
        eq(messages.studentId, userId),
        sql`${messages.senderId} <> ${userId}`,
        eq(messages.recipientType, "student"),
        sql`${messages.readAt} is null`,
      ),
    );
  return row?.n ?? 0;
}

export type CertificateData = {
  studentName: string;
  studentCode: string;
  materialTitle: string;
  materialTitleAr: string;
  subjectName: string;
  subjectNameAr: string;
  subjectIcon: string;
  lessonsCompleted: number;
  lessonsTotal: number;
  averageGrade: number | null;
  issuedBy: string;
};

export async function getCertificateData(userId: number, slug: string): Promise<CertificateData | null> {
  await ensureSeeded();
  const [material, me, teacher] = await Promise.all([
    getMaterialBySlug(slug, userId),
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.users.findFirst({ where: eq(users.role, "teacher") }),
  ]);
  if (!material || !me) return null;
  const completed = material.lessons.filter((l) => material.doneSet.has(l.id)).length;
  const graded = await db
    .select({ score: grades.score, max: grades.maxScore })
    .from(grades)
    .innerJoin(lessons, eq(lessons.id, grades.lessonId))
    .where(and(eq(grades.userId, userId), eq(lessons.materialId, material.id)));
  const totalScore = graded.reduce((a, g) => a + g.score, 0);
  const totalMax = graded.reduce((a, g) => a + g.max, 0);
  return {
    studentName: me.fullName,
    studentCode: me.studentCode,
    materialTitle: material.title,
    materialTitleAr: material.titleAr,
    subjectName: material.subject.name,
    subjectNameAr: material.subject.nameAr,
    subjectIcon: material.subject.icon,
    lessonsCompleted: completed,
    lessonsTotal: material.lessons.length,
    averageGrade: totalMax ? Math.round((totalScore / totalMax) * 100) : null,
    issuedBy: teacher?.fullName ?? "in science",
  };
}

export async function getRecentTaskGrades(userId: number, limit = 4) {
  await ensureSeeded();
  const rows = await db
    .select({
      taskId: taskSubmissions.taskId,
      score: taskSubmissions.score,
      gradedAt: taskSubmissions.gradedAt,
      taskTitle: tasks.title,
      taskTitleAr: tasks.titleAr,
      maxScore: tasks.maxScore,
      subjectIcon: subjects.icon,
      subjectName: subjects.name,
      subjectNameAr: subjects.nameAr,
    })
    .from(taskSubmissions)
    .innerJoin(tasks, eq(tasks.id, taskSubmissions.taskId))
    .innerJoin(subjects, eq(subjects.id, tasks.subjectId))
    .where(and(eq(taskSubmissions.userId, userId), sql`${taskSubmissions.score} is not null`))
    .orderBy(desc(taskSubmissions.gradedAt))
    .limit(limit);
  return rows.map((r) => ({
    taskId: r.taskId,
    score: r.score ?? 0,
    maxScore: r.maxScore,
    percent: Math.round(((r.score ?? 0) / r.maxScore) * 100),
    gradedAt: r.gradedAt,
    title: r.taskTitle,
    titleAr: r.taskTitleAr,
    subjectIcon: r.subjectIcon,
    subjectName: r.subjectName,
    subjectNameAr: r.subjectNameAr,
  }));
}

export async function getGradeInsights(userId: number) {
  const [gradesData, allTasks] = await Promise.all([getGradesForUser(userId), getTasksForUser(userId)]);
  const monthAgo = Date.now() - 30 * DAY;
  const monthGrades = gradesData.list.filter((g) => new Date(g.gradedAt).getTime() >= monthAgo);
  const score = monthGrades.reduce((a, g) => a + g.score, 0);
  const max = monthGrades.reduce((a, g) => a + g.maxScore, 0);
  const buckets = new Array<number>(10).fill(0);
  for (const g of monthGrades) {
    const p = g.maxScore ? (g.score / g.maxScore) * 100 : 0;
    buckets[Math.min(9, Math.floor(p / 10))]++;
  }
  const avgOf = (kind: string) => {
    const items = monthGrades.filter((g) => g.kind === kind);
    const s = items.reduce((a, g) => a + g.score, 0);
    const m = items.reduce((a, g) => a + g.maxScore, 0);
    return m ? Math.round((s / m) * 100) : null;
  };
  return {
    overall: max ? Math.round((score / max) * 100) : null,
    score,
    max,
    count: monthGrades.length,
    buckets,
    quizzesAvg: avgOf("quiz"),
    examsAvg: avgOf("exam"),
    incomplete: allTasks.filter((t) => t.status !== "done").length,
    totalTasks: allTasks.length,
  };
}
