import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { academicLevels, academicTerms, tasks, users, type TaskQuizQuestion } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { GRADES, TASK_TYPES } from "@/lib/i18n-teacher";
import { MAX_UPLOAD_BYTES } from "@/lib/submissions";
import { guessMimeType, uploadBufferToFilesBucket } from "@/lib/storage";
import { notifyStudentsForAudience } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim();
  const titleAr = String(form.get("titleAr") ?? "").trim() || title;
  const description = String(form.get("description") ?? "").trim();
  const audience = String(form.get("audience") ?? "all").trim();
  const taskType = String(form.get("taskType") ?? "assignment").trim();
  const dueRaw = String(form.get("dueDate") ?? "").trim();
  const subjectId = Number(form.get("subjectId")) || 1;
  const termIdRaw = Number(form.get("termId")) || null;
  const maxScoreRaw = Number(form.get("maxScore"));
  const maxScore = Number.isFinite(maxScoreRaw) && maxScoreRaw >= 1 && maxScoreRaw <= 1000 ? Math.round(maxScoreRaw) : 100;

  if (title.length < 3) {
    return NextResponse.json({ ok: false, error: "title_short" }, { status: 400 });
  }
  if (!(TASK_TYPES as readonly string[]).includes(taskType)) {
    return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
  }
  const due = new Date(`${dueRaw}T23:59:00`);
  if (!dueRaw || Number.isNaN(due.getTime())) {
    return NextResponse.json({ ok: false, error: "invalid_due" }, { status: 400 });
  }

  // Parse cloud storage fields or direct multipart upload or Google Drive URL
  let attachmentName: string | null = String(form.get("attachmentName") ?? "").trim() || null;
  let attachmentStoragePath: string | null = String(form.get("storagePath") ?? "").trim() || null;
  let attachmentMime: string | null = String(form.get("attachmentMime") ?? "").trim() || null;
  const attachmentUrl: string | null = String(form.get("attachmentUrl") ?? "").trim() || null;

  if (attachmentUrl && !/^https?:\/\//i.test(attachmentUrl)) {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }
  if (attachmentUrl && !attachmentName) {
    attachmentName = "Google Drive Document";
  }

  const file = form.get("file");
  if (file instanceof File && file.size > 0 && !attachmentStoragePath) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, error: "file_too_big" }, { status: 413 });
    }
    const uploaded = await uploadBufferToFilesBucket(
      "tasks",
      file.name,
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );
    if (uploaded) {
      attachmentName = file.name.slice(0, 160);
      attachmentStoragePath = uploaded.storagePath;
      attachmentMime = uploaded.mimeType;
    }
  }
  if (attachmentName && !attachmentMime) {
    attachmentMime = guessMimeType(attachmentName, null);
  }

  // Parse optional interactive quiz questions for quiz tasks
  let quizQuestions: TaskQuizQuestion[] | null = null;
  const quizRaw = String(form.get("quizQuestions") ?? "").trim();
  if (quizRaw) {
    try {
      const parsed = JSON.parse(quizRaw);
      if (Array.isArray(parsed)) {
        const cleaned: TaskQuizQuestion[] = parsed
          .map((item, idx) => {
            const qText = String(item?.question ?? "").trim();
            const opts = Array.isArray(item?.options)
              ? item.options.map((o: unknown) => String(o ?? "").trim()).filter(Boolean)
              : [];
            const correctIndex = Math.max(0, Math.min(opts.length - 1, Number(item?.correctIndex) || 0));
            const explanation = String(item?.explanation ?? "").trim() || undefined;
            return { id: idx + 1, question: qText, options: opts, correctIndex, explanation };
          })
          .filter((q) => q.question.length >= 2 && q.options.length >= 2);
        if (cleaned.length > 0) quizQuestions = cleaned;
      }
    } catch {
      // ignore invalid quiz JSON
    }
  }

  // Resolve audience: specific student (`student:<id>`), grade level, or all students
  let targetGrade = "all";
  let targetStudentId: number | null = null;

  if (audience.startsWith("student:")) {
    const sid = Number(audience.slice("student:".length));
    const student = sid ? await db.query.users.findFirst({ where: eq(users.id, sid) }) : null;
    if (!student || student.role !== "student") {
      return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 404 });
    }
    targetStudentId = student.id;
    targetGrade = student.grade;
  } else {
    const knownLevels = await db.select().from(academicLevels);
    const validGrades = new Set<string>([...GRADES, ...knownLevels.map((l) => l.name)]);
    targetGrade = audience === "all" || validGrades.has(audience) ? audience : "all";
  }

  const termExists = termIdRaw
    ? await db.query.academicTerms.findFirst({ where: eq(academicTerms.id, termIdRaw) })
    : null;

  const [created] = await db
    .insert(tasks)
    .values({
      title,
      titleAr,
      description,
      descriptionAr: description,
      subjectId,
      taskType,
      attachmentName,
      attachmentBody: "",
      attachmentUrl,
      attachmentStoragePath,
      attachmentMime,
      quizQuestions,
      dueDate: due,
      targetGrade,
      targetStudentId,
      maxScore,
      termId: termExists ? termExists.id : null,
      status: "open",
    })
    .returning();

  const isQuiz = taskType === "quiz";
  await notifyStudentsForAudience(
    { targetStudentId, targetGrade },
    {
      kind: isQuiz ? "quiz" : "task",
      title: targetStudentId
        ? isQuiz
          ? `Personal quiz assigned: ${title}`
          : `Personal task assigned: ${title}`
        : isQuiz
          ? `New quiz: ${title}`
          : `New ${taskType}: ${title}`,
      titleAr: targetStudentId
        ? isQuiz
          ? `اختبار قصير مخصص لك: ${titleAr}`
          : `مهمة مخصصة لك: ${titleAr}`
        : isQuiz
          ? `اختبار قصير جديد: ${titleAr}`
          : `مهمة جديدة: ${titleAr}`,
      body: description || `Due ${due.toLocaleDateString("en-GB")}`,
      bodyAr: description || `موعد التسليم ${due.toLocaleDateString("ar-EG")}`,
      href: `/tasks/${created.id}`,
    },
  ).catch(() => {});

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (targetStudentId) {
    revalidatePath(`/students/${targetStudentId}`);
  }
  return NextResponse.json({ ok: true, taskId: created.id, targetStudentId });
}
