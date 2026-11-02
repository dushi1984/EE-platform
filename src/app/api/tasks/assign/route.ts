import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { GRADES, TASK_TYPES } from "@/lib/i18n-teacher";
import { academicLevels, academicTerms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { MAX_UPLOAD_BYTES } from "@/lib/submissions";

export const dynamic = "force-dynamic";

/** Teacher task creation with an optional real file attachment (multipart). */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (user.role !== "teacher") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const audience = String(form.get("audience") ?? "all");
  const taskType = String(form.get("taskType") ?? "assignment");
  const dueRaw = String(form.get("dueDate") ?? "");
  const subjectId = Number(form.get("subjectId")) || 1;

  if (title.length < 3) {
    return NextResponse.json({ ok: false, error: "title_short" }, { status: 400 });
  }
  if (!(TASK_TYPES as readonly string[]).includes(taskType)) {
    return NextResponse.json({ ok: false, error: "type_required" }, { status: 400 });
  }
  const dueDate = new Date(`${dueRaw}T23:59:00`);
  if (!dueRaw || Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ ok: false, error: "due_required" }, { status: 400 });
  }
  const termIdRaw = Number(form.get("termId")) || null;
  const termId = termIdRaw && (await db.query.academicTerms.findFirst({ where: eq(academicTerms.id, termIdRaw) })) ? termIdRaw : null;
  const levelNames = (await db.select().from(academicLevels)).map((l) => l.name);
  const targetGrade =
    audience === "all" || levelNames.includes(audience) || (GRADES as readonly string[]).includes(audience) ? audience : "all";

  const file = form.get("file");
  let attachmentName: string | null = null;
  let attachmentBody = "";
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, error: "file_too_big" }, { status: 413 });
    }
    attachmentName = file.name;
    attachmentBody = `data:${file.type || "application/octet-stream"};base64,${Buffer.from(
      await file.arrayBuffer(),
    ).toString("base64")}`;
  }

  const [task] = await db
    .insert(tasks)
    .values({
      title,
      titleAr: title,
      description,
      descriptionAr: description,
      subjectId,
      taskType,
      attachmentName,
      attachmentBody,
      dueDate,
      targetGrade,
      termId,
      status: "open",
    })
    .returning();

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true, taskId: task.id });
}
