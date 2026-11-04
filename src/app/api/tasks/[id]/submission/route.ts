import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  MAX_UPLOAD_BYTES,
  getOpenTask,
  removeTaskSubmission,
  saveTaskSubmission,
} from "@/lib/submissions";
import { guessMimeType, uploadBufferToFilesBucket } from "@/lib/storage";
import { notifyTeachers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (user.role === "teacher") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const taskId = Number(id);
  const task = await getOpenTask(taskId, user);
  if (!task) {
    return NextResponse.json({ ok: false, error: "task_not_found_or_closed" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const note = String(form.get("note") ?? "").trim();
  const storagePathIn = String(form.get("storagePath") ?? "").trim() || null;
  const fileNameIn = String(form.get("fileName") ?? "").trim() || null;
  const mimeTypeIn = String(form.get("mimeType") ?? "").trim() || null;
  const fileUrlIn = String(form.get("fileUrl") ?? "").trim() || null;
  const file = form.get("file");

  let fileName: string;
  let fileStoragePath: string | null = storagePathIn;
  let fileMime: string | null = mimeTypeIn;
  let fileData: string | null = null;
  const fileUrl: string | null = fileUrlIn && /^https?:\/\//i.test(fileUrlIn) ? fileUrlIn : null;

  if (storagePathIn && fileNameIn) {
    fileName = fileNameIn;
    fileMime = guessMimeType(fileNameIn, mimeTypeIn);
  } else if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, error: "file_too_big", maxBytes: MAX_UPLOAD_BYTES },
        { status: 413 },
      );
    }
    fileName = file.name || `submission-${taskId}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadBufferToFilesBucket("submissions", fileName, buffer, file.type);
    if (uploaded) {
      fileStoragePath = uploaded.storagePath;
      fileMime = uploaded.mimeType;
    } else {
      const mime = file.type || "application/octet-stream";
      fileData = `data:${mime};base64,${buffer.toString("base64")}`;
    }
  } else if (fileUrl) {
    fileName = fileNameIn || "Google Drive Submission";
  } else if (note) {
    fileName = `solution-task-${taskId}.txt`;
    const body = `Student: ${user.fullName} (${user.studentCode})\nTask: ${task.title} (#${taskId})\n\n${note}`;
    const buffer = Buffer.from(body, "utf-8");
    const uploaded = await uploadBufferToFilesBucket("submissions", fileName, buffer, "text/plain; charset=utf-8");
    if (uploaded) {
      fileStoragePath = uploaded.storagePath;
      fileMime = uploaded.mimeType;
    } else {
      fileData = `data:text/plain;charset=utf-8,${encodeURIComponent(body)}`;
    }
  } else {
    return NextResponse.json({ ok: false, error: "no_file_or_note" }, { status: 400 });
  }

  try {
    const submission = await saveTaskSubmission(user.id, taskId, {
      fileName,
      fileData,
      fileUrl,
      fileStoragePath,
      fileMime,
      note,
    });

    await notifyTeachers({
      kind: "submission",
      title: `${user.fullName} submitted: ${task.title}`,
      titleAr: `سلّم ${user.fullName} حل المهمة: ${task.titleAr || task.title}`,
      body: fileName,
      bodyAr: fileName,
      href: `/tasks?task=${taskId}&tab=toGrade`,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      submission: {
        id: submission.id,
        fileName: submission.fileName,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    console.error("submission save failed", error);
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await removeTaskSubmission(user.id, Number(id));
  return NextResponse.json({ ok: true });
}
