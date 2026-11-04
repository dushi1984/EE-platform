"use server";

import { db } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  academicClasses,
  academicLevels,
  academicTerms,
  grades,
  lessons,
  materials,
  messages,
  purchases,
  quizQuestions,
  subjects,
  taskProgress,
  taskSubmissions,
  tasks,
  users,
} from "@/db/schema";
import { requireTeacher } from "./roles";
import { generateQrToken, getCurrentUser, hashPassword, sessionPath } from "./session";
import { getLocale } from "./i18n-server";
import { GRADES, TASK_TYPES, tt } from "./i18n-teacher";
import { deleteFromFilesBucket, FILES_BUCKET, guessMimeType, uploadBufferToFilesBucket } from "./storage";
import { notifyAllStudents, notifyStudentsForAudience, notifyUsers } from "./notifications";

export type TeacherActionState = {
  error?: string;
  success?: string;
  studentCode?: string;
  temporaryPassword?: string;
  redirectTo?: string;
} | null;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clean = (v: string) => v.replace(/[\s\-()]/g, "");

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "material"
  );
}

/* ---------- Tasks ---------- */

export async function assignTaskAction(_prev: TeacherActionState, fd: FormData): Promise<TeacherActionState> {
  await requireTeacher();
  const c = tt(await getLocale());
  const title = str(fd, "title");
  const description = str(fd, "description");
  const audience = str(fd, "audience");
  const taskType = str(fd, "taskType");
  const dueRaw = str(fd, "dueDate");
  const subjectId = Number(fd.get("subjectId"));
  const fileName = str(fd, "fileName");
  const fileData = str(fd, "fileData");

  if (title.length < 3) return { error: c.taskTitleShort };
  if (!(TASK_TYPES as readonly string[]).includes(taskType)) return { error: c.typeRequired };
  const due = new Date(`${dueRaw}T23:59:00`);
  if (!dueRaw || Number.isNaN(due.getTime())) return { error: c.dueRequired };
  if (fileData.length > 3_000_000) return { error: c.fileTooBig };

  let targetGrade = "all";
  let targetClassId: number | null = null;
  let targetStudentId: number | null = null;
  const fromProfile = str(fd, "fromProfile") === "1";

  if (audience.startsWith("student:")) {
    if (!fromProfile) return { error: c.assignTask };
    const sid = Number(audience.slice("student:".length));
    const st = sid ? await db.query.users.findFirst({ where: eq(users.id, sid) }) : null;
    if (st && st.role === "student") {
      targetStudentId = st.id;
      targetGrade = st.grade;
    }
  } else if (audience.startsWith("class:")) {
    const cid = Number(audience.slice("class:".length));
    const cls = cid
      ? await db.query.academicClasses.findFirst({
          where: eq(academicClasses.id, cid),
          with: { level: true },
        })
      : null;
    if (cls) {
      targetClassId = cls.id;
      targetGrade = cls.level.name;
    }
  } else {
    const knownLevels = await db.select().from(academicLevels);
    const validGrades = new Set<string>([...GRADES, ...knownLevels.map((l) => l.name)]);
    targetGrade = audience === "all" || validGrades.has(audience) ? audience : "all";
  }

  const [created] = await db
    .insert(tasks)
    .values({
      title,
      titleAr: title,
      description,
      descriptionAr: description,
      subjectId: subjectId || 1,
      taskType,
      attachmentName: fileName && fileData ? fileName.slice(0, 120) : null,
      attachmentBody: fileName && fileData ? fileData : "",
      dueDate: due,
      targetGrade,
      targetClassId,
      targetStudentId,
      status: "open",
    })
    .returning();

  await notifyStudentsForAudience(
    { targetStudentId, targetClassId, targetGrade },
    {
      kind: taskType === "quiz" ? "quiz" : "task",
      title: targetStudentId ? `Assigned to you: ${title}` : `New ${taskType}: ${title}`,
      titleAr: targetStudentId ? `مهمة خاصة لك: ${title}` : `مهمة جديدة: ${title}`,
      body: description || `Due ${due.toLocaleDateString("en-GB")}`,
      bodyAr: description || `تاريخ التسليم ${due.toLocaleDateString("ar-EG")}`,
      href: `/tasks/${created.id}`,
    },
  ).catch(() => {});

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${created.id}`);
  revalidatePath("/dashboard");
  if (targetStudentId) revalidatePath(`/students/${targetStudentId}`);
  return {
    success: c.assignTask,
    redirectTo: await sessionPath(
      targetStudentId ? `/tasks/${created.id}?student=${targetStudentId}` : `/tasks?task=${created.id}`,
    ),
  };
}

export async function toggleTaskStatusAction(fd: FormData) {
  await requireTeacher();
  const id = Number(fd.get("taskId"));
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!task) return;
  await db
    .update(tasks)
    .set({ status: task.status === "open" ? "closed" : "open" })
    .where(eq(tasks.id, id));
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/students");
  if (task.targetStudentId) revalidatePath(`/students/${task.targetStudentId}`);
  revalidatePath("/dashboard");
}

export async function setTaskOpenStatusAction(taskId: number, nextStatus: "open" | "closed") {
  await requireTeacher();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) return { ok: false };
  const status = nextStatus === "closed" ? "closed" : "open";
  await db.update(tasks).set({ status }).where(eq(tasks.id, taskId));
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/students");
  if (task.targetStudentId) revalidatePath(`/students/${task.targetStudentId}`);
  revalidatePath("/dashboard");
  return { ok: true, status };
}

export async function setStudentTaskStatusAction(
  taskId: number,
  userId: number,
  status: "todo" | "in_progress" | "done",
) {
  await requireTeacher();
  const cleanStatus: "todo" | "in_progress" | "done" =
    status === "done" || status === "in_progress" ? status : "todo";
  const progress = cleanStatus === "done" ? 100 : cleanStatus === "in_progress" ? 50 : 0;
  const now = new Date();

  await db
    .insert(taskProgress)
    .values({ userId, taskId, status: cleanStatus, progress, updatedAt: now })
    .onConflictDoUpdate({
      target: [taskProgress.userId, taskProgress.taskId],
      set: { status: cleanStatus, progress, updatedAt: now },
    });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/students");
  revalidatePath(`/students/${userId}`);
  revalidatePath("/dashboard");
  return { ok: true, status: cleanStatus, progress };
}

export async function toggleSubmissionCheckedAction(taskId: number, userId: number, checked: boolean) {
  await requireTeacher();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) return { ok: false };
  const now = new Date();

  const sub = await db.query.taskSubmissions.findFirst({
    where: and(eq(taskSubmissions.taskId, taskId), eq(taskSubmissions.userId, userId)),
  });

  if (sub) {
    await db
      .update(taskSubmissions)
      .set({ checkedAt: checked ? now : null })
      .where(eq(taskSubmissions.id, sub.id));
  } else if (checked) {
    await db.insert(taskSubmissions).values({
      userId,
      taskId,
      fileName: `checked-task-${taskId}.txt`,
      note: "Checked manually by instructor",
      checkedAt: now,
      submittedAt: now,
    });
  }

  if (checked) {
    await db
      .insert(taskProgress)
      .values({ userId, taskId, status: "done", progress: 100, updatedAt: now })
      .onConflictDoUpdate({
        target: [taskProgress.userId, taskProgress.taskId],
        set: { status: "done", progress: 100, updatedAt: now },
      });

    await notifyUsers([userId], {
      kind: "task",
      title: `Task checked: ${task.title}`,
      titleAr: `تمت مراجعة مهمتك: ${task.titleAr || task.title}`,
      body: "Your instructor checked your work.",
      bodyAr: "قام المعلم بمراجعة عملك وتأكيده.",
      href: `/tasks/${taskId}`,
    }).catch(() => {});
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/students");
  revalidatePath(`/students/${userId}`);
  revalidatePath("/dashboard");
  return { ok: true, checked };
}

export async function reviewStudentTaskAction(input: {
  taskId: number;
  userId: number;
  score: number | null;
  teacherFeedback: string;
  checked: boolean;
  studentStatus: "todo" | "in_progress" | "done";
}) {
  await requireTeacher();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, input.taskId) });
  if (!task) return { ok: false };
  const now = new Date();

  const hasScore = input.score !== null && input.score !== undefined && Number.isFinite(input.score);
  const clampedScore = hasScore ? Math.min(task.maxScore, Math.max(0, Math.round(Number(input.score)))) : null;
  const feedback = (input.teacherFeedback || "").trim().slice(0, 2000);
  const finalStatus: "todo" | "in_progress" | "done" =
    input.studentStatus === "done" || input.studentStatus === "in_progress" ? input.studentStatus : "todo";
  const progress = finalStatus === "done" ? 100 : finalStatus === "in_progress" ? 50 : 0;

  await db
    .insert(taskProgress)
    .values({ userId: input.userId, taskId: task.id, status: finalStatus, progress, updatedAt: now })
    .onConflictDoUpdate({
      target: [taskProgress.userId, taskProgress.taskId],
      set: { status: finalStatus, progress, updatedAt: now },
    });

  const sub = await db.query.taskSubmissions.findFirst({
    where: and(eq(taskSubmissions.taskId, task.id), eq(taskSubmissions.userId, input.userId)),
  });

  if (sub) {
    await db
      .update(taskSubmissions)
      .set({
        score: clampedScore !== null ? clampedScore : sub.score,
        gradedAt: clampedScore !== null ? now : sub.gradedAt,
        teacherFeedback: feedback,
        checkedAt: input.checked ? sub.checkedAt ?? now : null,
      })
      .where(eq(taskSubmissions.id, sub.id));
  } else if (clampedScore !== null || feedback || input.checked) {
    await db.insert(taskSubmissions).values({
      userId: input.userId,
      taskId: task.id,
      fileName: `manual-review-task-${task.id}.txt`,
      note: "Reviewed manually by instructor",
      score: clampedScore,
      gradedAt: clampedScore !== null ? now : null,
      teacherFeedback: feedback,
      checkedAt: input.checked ? now : null,
      submittedAt: now,
    });
  }

  if (clampedScore !== null) {
    const existing = await db.query.grades.findFirst({
      where: and(eq(grades.userId, input.userId), eq(grades.taskId, task.id)),
    });
    if (existing) {
      await db
        .update(grades)
        .set({ score: clampedScore, maxScore: task.maxScore, gradedAt: now })
        .where(eq(grades.id, existing.id));
    } else {
      await db.insert(grades).values({
        userId: input.userId,
        subjectId: task.subjectId,
        taskId: task.id,
        title: task.title,
        titleAr: task.titleAr,
        kind: task.taskType === "quiz" ? "quiz" : "assignment",
        score: clampedScore,
        maxScore: task.maxScore,
        gradedAt: now,
      });
    }
  }

  if (clampedScore !== null || feedback || input.checked) {
    await notifyUsers([input.userId], {
      kind: clampedScore !== null ? "grade" : "task",
      title:
        clampedScore !== null
          ? `Task corrected & graded: ${task.title}`
          : `Task checked by teacher: ${task.title}`,
      titleAr:
        clampedScore !== null
          ? `تم تصحيح وتقييم مهمتك: ${task.titleAr || task.title}`
          : `تمت مراجعة مهمتك: ${task.titleAr || task.title}`,
      body:
        clampedScore !== null
          ? `Score: ${clampedScore}/${task.maxScore}${feedback ? ` — "${feedback.slice(0, 120)}"` : ""}`
          : feedback || "Your instructor reviewed your task.",
      bodyAr:
        clampedScore !== null
          ? `الدرجة: ${clampedScore}/${task.maxScore}${feedback ? ` — "${feedback.slice(0, 120)}"` : ""}`
          : feedback || "قام المعلم بمراجعة مهمتك.",
      href: `/tasks/${task.id}`,
    }).catch(() => {});
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${task.id}`);
  revalidatePath("/students");
  revalidatePath(`/students/${input.userId}`);
  revalidatePath("/grades");
  revalidatePath("/dashboard");
  return { ok: true, score: clampedScore, checked: input.checked, status: finalStatus };
}

export async function gradeSubmissionAction(taskId: number, userId: number, score: number) {
  await requireTeacher();
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task || !Number.isFinite(score)) return { ok: false };
  const s = Math.min(task.maxScore, Math.max(0, Math.round(score)));
  const now = new Date();

  const sub = await db.query.taskSubmissions.findFirst({
    where: and(eq(taskSubmissions.taskId, taskId), eq(taskSubmissions.userId, userId)),
  });

  if (sub) {
    await db.update(taskSubmissions).set({ score: s, gradedAt: now }).where(eq(taskSubmissions.id, sub.id));
  } else {
    await db.insert(taskSubmissions).values({
      userId,
      taskId,
      fileName: `graded-task-${taskId}.txt`,
      note: "Graded directly by instructor",
      score: s,
      gradedAt: now,
      submittedAt: now,
    });
    await db
      .insert(taskProgress)
      .values({ userId, taskId, status: "done", progress: 100 })
      .onConflictDoUpdate({
        target: [taskProgress.userId, taskProgress.taskId],
        set: { status: "done", progress: 100, updatedAt: now },
      });
  }

  const existing = await db.query.grades.findFirst({ where: and(eq(grades.userId, userId), eq(grades.taskId, taskId)) });
  if (existing) {
    await db.update(grades).set({ score: s, maxScore: task.maxScore, gradedAt: now }).where(eq(grades.id, existing.id));
  } else {
    await db.insert(grades).values({
      userId,
      subjectId: task.subjectId,
      taskId,
      title: task.title,
      titleAr: task.titleAr,
      kind: task.taskType === "quiz" ? "quiz" : "assignment",
      score: s,
      maxScore: task.maxScore,
      gradedAt: now,
    });
  }

  await notifyUsers([userId], {
    kind: "grade",
    title: `Task graded: ${task.title}`,
    titleAr: `تم تقييم مهمتك: ${task.titleAr || task.title}`,
    body: `You scored ${s} out of ${task.maxScore}.`,
    bodyAr: `حصلت على ${s} من ${task.maxScore}.`,
    href: `/tasks/${taskId}`,
  }).catch(() => {});

  revalidatePath("/tasks");
  revalidatePath("/students");
  revalidatePath(`/students/${userId}`);
  revalidatePath("/grades");
  return { ok: true, score: s };
}

/* ---------- Students ---------- */

export async function createStudentAction(_prev: TeacherActionState, fd: FormData): Promise<TeacherActionState> {
  await requireTeacher();
  const locale = await getLocale();
  const ar = locale === "ar";
  const c = tt(locale);
  const fullName = str(fd, "fullName").replace(/\s+/g, " ");
  const emailRaw = str(fd, "email").toLowerCase();
  const phoneRaw = str(fd, "phone");
  const legacyContact = str(fd, "contact").toLowerCase();
  const parentName = str(fd, "parentName");
  const parentPhone = clean(str(fd, "parentPhone"));
  const grade = str(fd, "grade");
  const classIdRaw = Number(fd.get("classId")) || null;
  const dobRaw = str(fd, "dateOfBirth");
  let code = str(fd, "code").toUpperCase();
  let password = String(fd.get("password") ?? "");

  if (fullName.length < 3) return { error: ar ? "من فضلك أدخل اسم الطالب." : "Please enter the student's name." };
  const email = EMAIL_RE.test(emailRaw || legacyContact) ? (emailRaw || legacyContact) : null;
  const phoneCandidate = phoneRaw || (!email ? legacyContact : "");
  const phone = /^\+?\d{8,15}$/.test(clean(phoneCandidate)) ? clean(phoneCandidate) : null;
  if (!email && !phone) return { error: ar ? "أدخل هاتفاً أو بريداً صحيحاً." : "Enter a valid phone number or email." };
  if (parentPhone && !/^\+?\d{8,15}$/.test(parentPhone)) return { error: ar ? "رقم ولي الأمر غير صحيح." : "Enter a valid parent phone number." };

  if (!code) {
    const [last] = await db.select({ id: users.id }).from(users).orderBy(sql`${users.id} desc`).limit(1);
    code = `S${String((last?.id ?? 0) + 1).padStart(5, "0")}`;
  }
  if (!/^[A-Z0-9-]{4,12}$/.test(code)) return { error: ar ? "الكود من 4 إلى 12 حرفاً أو رقماً." : "Code must be 4–12 letters or digits." };
  if (!password) password = `Sci${Math.random().toString(36).slice(2, 8)}!`;
  if (password.length < 6) return { error: ar ? "كلمة المرور 6 أحرف على الأقل." : "Password must be at least 6 characters." };

  if (await db.query.users.findFirst({ where: eq(users.studentCode, code) })) return { error: ar ? "هذا الكود مستخدم بالفعل." : "That code is already in use." };
  const dup = await db.query.users.findFirst({ where: email ? eq(users.email, email) : eq(users.phone, phone!) });
  if (dup) return { error: ar ? "هذا الهاتف/البريد مسجل بالفعل." : "That phone/email is already registered." };

  const dateOfBirth = dobRaw ? new Date(`${dobRaw}T12:00:00Z`) : null;
  let resolvedGrade = (GRADES as readonly string[]).includes(grade) ? grade : "Grade 10";
  let classId: number | null = null;
  const knownLevels = await db.select().from(academicLevels);
  const levelNames = knownLevels.map((l) => l.name);
  if (levelNames.includes(grade)) resolvedGrade = grade;
  if (classIdRaw) {
    const cls = await db.query.academicClasses.findFirst({
      where: eq(academicClasses.id, classIdRaw),
      with: { level: true },
    });
    if (cls) {
      classId = cls.id;
      resolvedGrade = cls.level.name;
    }
  }
  const [createdStudent] = await db
    .insert(users)
    .values({
      fullName,
      email,
      phone,
      parentName,
      parentPhone,
      dateOfBirth: dateOfBirth && !Number.isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
      studentCode: code,
      passwordHash: hashPassword(password),
      qrToken: generateQrToken(),
      grade: resolvedGrade,
      classId,
    })
    .returning();

  await notifyUsers([createdStudent.id], {
    kind: "system",
    title: `Welcome to in science, ${fullName.split(" ")[0]}!`,
    titleAr: `مرحباً بك في منصة العلوم يا ${fullName.split(" ")[0]}!`,
    body: "Explore your study materials, complete interactive lessons, and track your grades.",
    bodyAr: "استكشف موادك الدراسية، تابع الدروس التفاعلية، وراقب تقدمك أولاً بأول.",
    href: "/materials",
  }).catch(() => {});

  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { success: c.studentCreated, studentCode: code, temporaryPassword: password };
}

/* ---------- Materials ---------- */

export async function saveMaterialAction(_prev: TeacherActionState, fd: FormData): Promise<TeacherActionState> {
  await requireTeacher();
  const c = tt(await getLocale());
  const id = Number(fd.get("id")) || null;
  const title = str(fd, "title");
  const titleAr = str(fd, "titleAr") || title;
  const description = str(fd, "description");
  const rawKind = str(fd, "kind");
  const kind = rawKind === "pdf" ? "pdf" : rawKind === "doc" ? "doc" : "video";
  const priceCents = Math.max(0, Math.round((Number(fd.get("price")) || 0) * 100));
  const published = str(fd, "status") !== "draft";
  const thumbnailUrl = str(fd, "thumbnailUrl") || null;
  const videoUrl = str(fd, "videoUrl") || null;
  const content = str(fd, "content") || `## ${title}\n\n${description || "Study the key concepts and complete the knowledge check quiz."}`;

  let storagePath = str(fd, "storagePath") || null;
  let fileName = str(fd, "fileName") || null;
  let mimeType = str(fd, "mimeType") || null;
  let fileUrl = str(fd, "fileUrl") || null; // Google Drive link or external document URL
  let fileSize = str(fd, "fileSize") || (kind === "video" ? "120 MB" : "");

  // Fallback direct server upload if a File was submitted in FormData
  const rawFile = fd.get("file");
  if (rawFile instanceof File && rawFile.size > 0 && !storagePath) {
    const uploaded = await uploadBufferToFilesBucket(
      "materials",
      rawFile.name,
      Buffer.from(await rawFile.arrayBuffer()),
      rawFile.type,
    );
    if (uploaded) {
      storagePath = uploaded.storagePath;
      fileName = rawFile.name;
      mimeType = uploaded.mimeType;
    }
  }
  if (fileName && !mimeType) {
    mimeType = guessMimeType(fileName, null);
  }

  const subjectId = Number(fd.get("subjectId")) || 1;
  const termIdRaw = Number(fd.get("termId")) || null;
  const termId = termIdRaw && (await db.query.academicTerms.findFirst({ where: eq(academicTerms.id, termIdRaw) })) ? termIdRaw : null;

  if (title.length < 3) return { error: c.titleShort };
  if (thumbnailUrl && !/^https?:\/\/|^\//i.test(thumbnailUrl)) return { error: "Cover image must be a valid URL." };
  if (fileUrl && !/^https?:\/\//i.test(fileUrl)) return { error: "Document link must start with https://" };

  let materialId = id;
  let finalSlug = "";
  let lessonId: number | null = null;
  let newlyPublished = false;

  if (id) {
    const existing = await db.query.materials.findFirst({ where: eq(materials.id, id) });
    if (!existing) return { error: "Material not found." };
    finalSlug = existing.slug;
    newlyPublished = !existing.published && published;
    if (storagePath && existing.storagePath && existing.storagePath !== storagePath) {
      await deleteFromFilesBucket(existing.storagePath);
    }
    await db
      .update(materials)
      .set({
        title,
        titleAr,
        description,
        descriptionAr: description,
        kind,
        priceCents,
        published,
        thumbnailUrl,
        subjectId,
        termId,
        fileSize: fileSize || existing.fileSize,
        fileUrl: fileUrl !== null ? fileUrl : existing.fileUrl,
        fileName: fileName || existing.fileName,
        storageBucket: FILES_BUCKET,
        storagePath: storagePath || existing.storagePath,
        mimeType: mimeType || existing.mimeType,
        updatedAt: new Date(),
      })
      .where(eq(materials.id, id));
    const first = await db.query.lessons.findFirst({ where: eq(lessons.materialId, id), orderBy: (l, { asc }) => [asc(l.position)] });
    if (first) {
      lessonId = first.id;
      await db
        .update(lessons)
        .set({ title, titleAr, ...(videoUrl ? { videoUrl } : {}), ...(content ? { content } : {}) })
        .where(eq(lessons.id, first.id));
    } else {
      const [insertedLesson] = await db
        .insert(lessons)
        .values({ materialId: id, title, titleAr, content, videoUrl, position: 1, durationMinutes: 15 })
        .returning();
      lessonId = insertedLesson.id;
    }
  } else {
    let slug = slugify(title);
    if (await db.query.materials.findFirst({ where: eq(materials.slug, slug) })) slug = `${slug}-${Date.now().toString(36)}`;
    finalSlug = slug;
    newlyPublished = published;
    const [row] = await db
      .insert(materials)
      .values({
        slug,
        title,
        titleAr,
        description,
        descriptionAr: description,
        kind,
        priceCents,
        published,
        thumbnailUrl,
        subjectId,
        termId,
        fileSize,
        fileUrl,
        fileName,
        storageBucket: FILES_BUCKET,
        storagePath,
        mimeType,
        isNew: true,
      })
      .returning();
    materialId = row.id;
    const [insertedLesson] = await db
      .insert(lessons)
      .values({ materialId: row.id, title, titleAr, content, videoUrl, position: 1, durationMinutes: 15 })
      .returning();
    lessonId = insertedLesson.id;
  }

  if (lessonId) {
    const qText = str(fd, "quizQuestion");
    const opt0 = str(fd, "quizOpt0");
    const opt1 = str(fd, "quizOpt1");
    const opt2 = str(fd, "quizOpt2");
    const opt3 = str(fd, "quizOpt3");
    const correctIdx = Math.min(3, Math.max(0, Number(fd.get("quizCorrect")) || 0));
    const opts = [opt0, opt1, opt2, opt3].filter(Boolean);
    if (qText && opts.length >= 2) {
      await db.insert(quizQuestions).values({
        lessonId,
        question: qText,
        options: opts,
        correctIndex: Math.min(opts.length - 1, correctIdx),
        explanation: "Review the lesson notes above for a full explanation.",
      });
    } else {
      const existingQuestions = await db.query.quizQuestions.findMany({ where: eq(quizQuestions.lessonId, lessonId) });
      if (existingQuestions.length === 0) {
        await db.insert(quizQuestions).values([
          {
            lessonId,
            question: `What is the main focus of "${title}"?`,
            options: [
              description ? description.slice(0, 80) : `Core principles and applications of ${title}`,
              "Unrelated historical literature",
              "Culinary preparation techniques",
              "None of the above",
            ],
            correctIndex: 0,
            explanation: `This lesson covers the fundamental concepts of ${title}.`,
          },
          {
            lessonId,
            question: `After studying "${title}", what is the best way to verify your understanding?`,
            options: [
              "Skip all practice problems",
              "Apply the formulas and concepts to worked examples and quizzes",
              "Memorize page numbers only",
              "Ignore experimental evidence",
            ],
            correctIndex: 1,
            explanation: "Active problem-solving and knowledge checks reinforce scientific concepts.",
          },
        ]);
      }
    }
  }

  if (newlyPublished && finalSlug) {
    await notifyAllStudents({
      kind: "material",
      title: `New study material: ${title}`,
      titleAr: `مادة دراسية جديدة: ${titleAr || title}`,
      body: description || "Open the library to explore this new lesson and files.",
      bodyAr: description || "افتح المكتبة لاستكشاف هذا الدرس الجديد والملفات المرفقة.",
      href: `/materials/${finalSlug}`,
    }).catch(() => {});
  }

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  return {
    success: c.save,
    redirectTo: await sessionPath(`/materials?m=${materialId}`),
  };
}

export async function toggleMaterialPublishAction(materialId: number) {
  await requireTeacher();
  const existing = await db.query.materials.findFirst({ where: eq(materials.id, materialId) });
  if (!existing) return { ok: false };
  const nextPublished = !existing.published;
  await db
    .update(materials)
    .set({ published: nextPublished, updatedAt: new Date() })
    .where(eq(materials.id, materialId));

  if (nextPublished) {
    await notifyAllStudents({
      kind: "material",
      title: `Published: ${existing.title}`,
      titleAr: `تم نشر مادة: ${existing.titleAr || existing.title}`,
      body: existing.description || "Now available in your study materials.",
      bodyAr: existing.descriptionAr || "متاحة الآن في مكتبة المواد الدراسية.",
      href: `/materials/${existing.slug}`,
    }).catch(() => {});
  }

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  return { ok: true, published: nextPublished };
}

export async function deleteMaterialAction(materialId: number) {
  await requireTeacher();
  const existing = await db.query.materials.findFirst({ where: eq(materials.id, materialId) });
  if (existing?.storagePath) {
    await deleteFromFilesBucket(existing.storagePath);
  }
  await db.delete(materials).where(eq(materials.id, materialId));
  revalidatePath("/materials");
  revalidatePath("/dashboard");
}

/* ---------- Payments ---------- */

export async function approvePaymentAction(purchaseId: number) {
  await requireTeacher();
  await db
    .update(purchases)
    .set({ status: "paid", purchasedAt: new Date() })
    .where(eq(purchases.id, purchaseId));
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/materials");
  return { ok: true };
}

/* ---------- Messages ---------- */

export async function sendMessageAction(_prev: TeacherActionState, fd: FormData): Promise<TeacherActionState> {
  const teacher = await requireTeacher();
  const c = tt(await getLocale());
  const studentId = Number(fd.get("studentId"));
  const body = str(fd, "body");
  const recipientType = str(fd, "recipientType") === "parent" ? "parent" : "student";
  const attachmentName = str(fd, "attachmentName");
  const attachmentData = str(fd, "attachmentData");
  if (!body) return { error: c.messageRequired };
  if (attachmentData.length > 3_000_000) return { error: c.fileTooBig };
  const student = await db.query.users.findFirst({ where: eq(users.id, studentId) });
  if (!student || student.role !== "student") return { error: "Student not found." };

  await db.insert(messages).values({
    senderId: teacher.id,
    studentId,
    recipientType,
    body: body.slice(0, 5000),
    attachmentName: attachmentName && attachmentData ? attachmentName.slice(0, 120) : null,
    attachmentData: attachmentName && attachmentData ? attachmentData : null,
  });

  await notifyUsers([studentId], {
    kind: "message",
    title: `New message from ${teacher.fullName}`,
    titleAr: `رسالة جديدة من ${teacher.fullName}`,
    body: body.slice(0, 160),
    bodyAr: body.slice(0, 160),
    href: "/messages",
  }).catch(() => {});

  revalidatePath(`/students/${studentId}/message`);
  revalidatePath("/messages");
  return { success: c.messageSent };
}

export async function markMessageReadAction(fd: FormData) {
  const current = await getCurrentUser();
  if (!current) return;
  const id = Number(fd.get("messageId"));
  const message = await db.query.messages.findFirst({ where: eq(messages.id, id) });
  if (!message) return;
  if (current.role !== "teacher" && message.studentId !== current.id) return;
  await db.update(messages).set({ readAt: new Date() }).where(eq(messages.id, id));
  revalidatePath("/messages");
}

/* ---------- Academic structure management ---------- */

const backToSettings = async (): Promise<never> => {
  redirect("/settings");
};

export async function createLevelAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name");
  const nameAr = str(fd, "nameAr") || name;
  if (name.length < 2) return;
  const [last] = await db.select({ s: sql<number>`coalesce(max(${academicLevels.sortOrder}),-1)`.mapWith(Number) }).from(academicLevels);
  await db.insert(academicLevels).values({ name, nameAr, sortOrder: (last?.s ?? -1) + 1 });
  revalidatePath("/settings");
  revalidatePath("/students");
  await backToSettings();
}

export async function deleteLevelAction(levelId: number) {
  await requireTeacher();
  await db.delete(academicLevels).where(eq(academicLevels.id, levelId));
  revalidatePath("/settings");
  revalidatePath("/students");
  return { ok: true };
}

export async function createTermAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name");
  const nameAr = str(fd, "nameAr") || name;
  if (name.length < 2) return;
  const [last] = await db.select({ s: sql<number>`coalesce(max(${academicTerms.sortOrder}),-1)`.mapWith(Number) }).from(academicTerms);
  await db.insert(academicTerms).values({ name, nameAr, sortOrder: (last?.s ?? -1) + 1, isActive: false });
  revalidatePath("/settings");
  await backToSettings();
}

export async function toggleTermActiveAction(termId: number) {
  await requireTeacher();
  await db.update(academicTerms).set({ isActive: false });
  await db.update(academicTerms).set({ isActive: true }).where(eq(academicTerms.id, termId));
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteTermAction(termId: number) {
  await requireTeacher();
  await db.delete(academicTerms).where(eq(academicTerms.id, termId));
  revalidatePath("/settings");
  return { ok: true };
}

export async function createClassAction(fd: FormData) {
  await requireTeacher();
  const levelId = Number(fd.get("levelId"));
  const name = str(fd, "name");
  const nameAr = str(fd, "nameAr") || name;
  if (!levelId || name.length < 1) return;
  await db.insert(academicClasses).values({ levelId, name, nameAr });
  revalidatePath("/settings");
  revalidatePath("/students");
  await backToSettings();
}

export async function deleteClassAction(classId: number) {
  await requireTeacher();
  await db.update(users).set({ classId: null }).where(eq(users.classId, classId));
  await db.delete(academicClasses).where(eq(academicClasses.id, classId));
  revalidatePath("/settings");
  revalidatePath("/students");
  return { ok: true };
}

export async function createSubjectAction(fd: FormData) {
  await requireTeacher();
  const name = str(fd, "name");
  const nameAr = str(fd, "nameAr") || name;
  const rawIcon = str(fd, "icon").toLowerCase();
  const validIcons = new Set(["chemistry", "physics", "biology", "mathematics", "science", "book"]);
  const icon = validIcons.has(rawIcon) ? rawIcon : "science";
  const color = str(fd, "color") || "indigo";
  if (name.length < 2) return;
  await db.insert(subjects).values({ name, nameAr, icon, color });
  revalidatePath("/settings");
  revalidatePath("/materials");
  revalidatePath("/tasks");
  await backToSettings();
}

export async function deleteSubjectAction(subjectId: number) {
  await requireTeacher();
  const [m] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(materials).where(eq(materials.subjectId, subjectId));
  if ((m?.n ?? 0) > 0) return { ok: false, reason: "in_use" };
  await db.delete(subjects).where(eq(subjects.id, subjectId));
  revalidatePath("/settings");
  return { ok: true };
}
