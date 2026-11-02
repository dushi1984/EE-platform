import { db } from "@/db";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import { grades, lessons, materials, messages, purchases, quizQuestions, subjects, taskProgress, taskSubmissions, tasks, users } from "@/db/schema";
import { hashPassword } from "@/lib/session";

export const TEACHER_CODE = "T1000";
export const TEACHER_PASSWORD = "password123";

const DAY = 24 * 60 * 60 * 1000;
const ago = (d: number) => new Date(Date.now() - d * DAY);
const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`;
const TEACHER_IMG = "https://images.pexels.com/photos/8199174/pexels-photo-8199174.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const roster = [
  { name: "Ahmed Hassan Ali Mahmoud", grade: "Grade 10", pct: 88, done: 9, last: 0 },
  { name: "Mariam Khaled Ibrahim Saad", grade: "Grade 10", pct: 76, done: 7, last: 1 },
  { name: "Omar Tarek Mostafa Nabil", grade: "Grade 11", pct: 52, done: 5, last: 4 },
  { name: "Nour Mohamed Adel Fawzy", grade: "Grade 11", pct: 93, done: 11, last: 0 },
  { name: "Youssef Samir Hany Kamal", grade: "Grade 12", pct: 41, done: 3, last: 12 },
  { name: "Salma Ayman Gamal Reda", grade: "Grade 12", pct: 67, done: 6, last: 2 },
  { name: "Karim Walid Sherif Anwar", grade: "Grade 10", pct: 29, done: 1, last: 20 },
];

const materialMeta: Record<string, { kind: string; size: string; published?: boolean }> = {
  "chemistry-fundamentals": { kind: "video", size: "148 MB" },
  "organic-chemistry-essentials": { kind: "pdf", size: "20.9 MB", published: false },
  "physics-mechanics": { kind: "video", size: "212 MB" },
  "electricity-and-magnetism": { kind: "video", size: "176 MB" },
  "biology-cells-and-genetics": { kind: "pdf", size: "14.2 MB" },
  "calculus-basics": { kind: "pdf", size: "9.6 MB" },
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

let done = false;
let running: Promise<void> | null = null;

export async function seedTeacherData() {
  if (done) return;
  if (running) return running;
  running = (async () => {
    let teacher = await db.query.users.findFirst({ where: eq(users.studentCode, TEACHER_CODE) });
    if (!teacher) {
      await run();
      teacher = await db.query.users.findFirst({ where: eq(users.studentCode, TEACHER_CODE) });
    }
    if (teacher) await ensureWelcomeMessage(teacher.id);
    await ensureAllLessonsHaveQuizzes();
    done = true;
  })().finally(() => {
    running = null;
  });
  return running;
}

async function ensureAllLessonsHaveQuizzes() {
  const allLessons = await db.query.lessons.findMany({ with: { questions: true } });
  const toInsert: (typeof quizQuestions.$inferInsert)[] = [];
  for (const l of allLessons) {
    if (l.questions.length < 3) {
      const needed = 3 - l.questions.length;
      const bank = [
        {
          question: `Which statement best summarizes the core principle of "${l.title}"?`,
          options: [
            `Understanding and applying the fundamental laws of ${l.title} to solve scientific problems`,
            "Ignoring experimental measurements and units",
            "Assuming variables never interact",
            "Relying on guesswork instead of evidence",
          ],
          correctIndex: 0,
          explanation: `${l.title} builds on quantitative relationships and experimental verification.`,
        },
        {
          question: `When solving an exam problem on "${l.title}", what should be your first step?`,
          options: [
            "Skip writing down the given quantities",
            "Identify the knowns, unknowns, units, and governing equation or principle",
            "Guess the largest number in the question",
            "Change all constants randomly",
          ],
          correctIndex: 1,
          explanation: "Listing known quantities with proper SI units prevents common calculation errors.",
        },
        {
          question: `How can you verify that your final result in "${l.title}" is physically reasonable?`,
          options: [
            "Check dimensional consistency (units) and limiting cases",
            "Never check the units",
            "Erase all intermediate steps",
            "Divide by zero",
          ],
          correctIndex: 0,
          explanation: "Dimensional analysis and checking limiting cases are essential scientific habits.",
        },
      ];
      for (let i = 0; i < needed; i++) {
        toInsert.push({
          lessonId: l.id,
          ...bank[i],
        });
      }
    }
  }
  if (toInsert.length > 0) {
    await db.insert(quizQuestions).values(toInsert);
  }
}

async function ensureWelcomeMessage(teacherId: number) {
  const student = await db.query.users.findFirst({ where: eq(users.studentCode, "12345") });
  if (!student) return;
  const existing = await db.query.messages.findFirst({
    where: and(eq(messages.senderId, teacherId), eq(messages.studentId, student.id)),
  });
  if (!existing) {
    await db.insert(messages).values({
      senderId: teacherId,
      studentId: student.id,
      recipientType: "student",
      body: "Welcome to in science, Fatma! Your materials, tasks, grades and messages are all available in your student portal. Keep learning!",
    });
  }
}

async function run() {
  const pw = hashPassword(TEACHER_PASSWORD);

  await db
    .insert(users)
    .values({
      fullName: "Mrs. Fatma Salah",
      email: "teacher@anything.com",
      phone: "01155550000",
      parentPhone: "",
      studentCode: TEACHER_CODE,
      passwordHash: pw,
      qrToken: "TEACHER-DEMO-2026",
      avatarUrl: TEACHER_IMG,
      role: "teacher",
      grade: "Staff",
      lastLoginAt: new Date(),
    })
    .onConflictDoNothing();

  // Materials: type, size, status and "updated" timestamps
  let i = 0;
  for (const [slug, m] of Object.entries(materialMeta)) {
    await db
      .update(materials)
      .set({ kind: m.kind, fileSize: m.size, published: m.published ?? true, updatedAt: ago(2 + i * 3) })
      .where(eq(materials.slug, slug));
    i++;
  }

  const allTasks = await db.select().from(tasks).orderBy(asc(tasks.dueDate));
  await db.update(tasks).set({ status: "closed" }).where(lt(tasks.dueDate, ago(10)));
  const taskState = allTasks.map((t) => ({ ...t, closed: t.dueDate.getTime() < ago(10).getTime() }));
  const subjectRows = await db.select().from(subjects).orderBy(asc(subjects.id));

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.studentCode, "12345"));

  const inserted = await db
    .insert(users)
    .values(
      roster.map((r, idx) => ({
        fullName: r.name,
        email: `student${idx + 1}@anything.com`,
        phone: `0100000${String(1000 + idx)}`,
        parentPhone: `0120000${String(2000 + idx)}`,
        studentCode: `S2026${idx + 1}`,
        passwordHash: pw,
        qrToken: `STUDENT-QR-${idx + 1}-2026`,
        avatarUrl: avatar(r.name.split(" ")[0] + idx),
        grade: r.grade,
        lastLoginAt: ago(r.last),
      })),
    )
    .onConflictDoNothing()
    .returning();

  const progressRows: (typeof taskProgress.$inferInsert)[] = [];
  const submissionRows: (typeof taskSubmissions.$inferInsert)[] = [];
  const gradeRows: (typeof grades.$inferInsert)[] = [];

  inserted.forEach((u, sIdx) => {
    const r = roster[sIdx];
    taskState.forEach((t, tIdx) => {
      const visible = true;
      if (!visible) return;
      const isDone = tIdx < r.done;
      progressRows.push({
        userId: u.id,
        taskId: t.id,
        status: isDone ? "done" : tIdx === r.done ? "in_progress" : "todo",
        progress: isDone ? 100 : tIdx === r.done ? 40 : 0,
        updatedAt: ago(Math.max(r.last, 0) + (tIdx % 3)),
      });
      if (isDone) {
        const isLate = (sIdx + tIdx) % 5 === 0;
        const graded = (sIdx + tIdx) % 3 !== 0;
        const score = graded ? clamp(r.pct + ((tIdx * 7 + sIdx * 3) % 21) - 10, 35, 100) : null;
        const submittedAt = new Date(t.dueDate.getTime() + (isLate ? 1 : -1) * DAY);
        submissionRows.push({
          userId: u.id,
          taskId: t.id,
          fileName: `${u.studentCode.toLowerCase()}-task-${t.id}.pdf`,
          note: "",
          score,
          gradedAt: graded ? new Date(submittedAt.getTime() + DAY) : null,
          submittedAt,
        });
        if (score !== null) {
          gradeRows.push({
            userId: u.id,
            subjectId: t.subjectId,
            taskId: t.id,
            title: t.title,
            titleAr: t.titleAr,
            kind: t.taskType === "quiz" ? "quiz" : "assignment",
            score,
            maxScore: 100,
            gradedAt: new Date(submittedAt.getTime() + DAY),
          });
        }
      }
    });

    // Six months of quiz / exam history for the grade-trend chart
    for (let m = 0; m < 6; m++) {
      for (let j = 0; j < 2; j++) {
        const wiggle = ((sIdx * 13 + m * 7 + j * 5) % 15) - 7;
        const p = clamp(r.pct - Math.round(m * 1.5) + wiggle, 20, 100);
        const max = j === 0 ? 20 : 50;
        gradeRows.push({
          userId: u.id,
          subjectId: subjectRows[(sIdx + m + j) % subjectRows.length].id,
          title: `${j === 0 ? "Quiz" : "Exam"} ${6 - m}`,
          titleAr: `${j === 0 ? "اختبار قصير" : "امتحان"} ${6 - m}`,
          kind: j === 0 ? "quiz" : "exam",
          score: Math.round((max * p) / 100),
          maxScore: max,
          gradedAt: ago(m * 30 + 6 + j * 11),
        });
      }
    }
  });

  if (progressRows.length) await db.insert(taskProgress).values(progressRows).onConflictDoNothing();
  if (submissionRows.length) await db.insert(taskSubmissions).values(submissionRows).onConflictDoNothing();
  if (gradeRows.length) await db.insert(grades).values(gradeRows);

  // Payments with different methods and statuses
  const paidMaterials = await db.select().from(materials).where(gt(materials.priceCents, 0)).orderBy(asc(materials.id));
  const methods = ["instapay", "card", "wallet"];
  const purchaseRows: (typeof purchases.$inferInsert)[] = [];
  inserted.forEach((u, sIdx) => {
    const count = (sIdx % 3) + 1;
    for (let k = 0; k < count; k++) {
      const m = paidMaterials[(sIdx + k) % paidMaterials.length];
      const status = (sIdx + k) % 7 === 0 ? "pending" : (sIdx + k) % 11 === 3 ? "failed" : "paid";
      purchaseRows.push({
        userId: u.id,
        materialId: m.id,
        pricePaidCents: m.priceCents,
        paymentMethod: methods[(sIdx + k) % 3],
        status,
        purchasedAt: ago(((sIdx * 5 + k * 9) % 40) + 1),
      });
    }
  });
  if (purchaseRows.length) await db.insert(purchases).values(purchaseRows).onConflictDoNothing();
}
