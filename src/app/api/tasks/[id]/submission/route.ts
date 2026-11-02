import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  MAX_UPLOAD_BYTES,
  getOpenTask,
  removeTaskSubmission,
  saveTaskSubmission,
} from "@/lib/submissions";

export const dynamic = "force-dynamic";

/**
 * Real file-upload endpoint for task submissions.
 *
 * Previously the file was base64-encoded into a hidden form field and pushed
 * through a React Server Action. That path is fragile (envelope size ceiling,
 * stale action IDs after rebuilds → Next asks for a full page reload).
 * A plain multipart POST to a route handler has none of those problems and
 * lets us report progress and inline errors.
 */
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
  const task = await getOpenTask(taskId);
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
  const file = form.get("file");

  let fileName: string;
  let fileData: string | null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, error: "file_too_big", maxBytes: MAX_UPLOAD_BYTES },
        { status: 413 },
      );
    }
    fileName = file.name || `submission-${taskId}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "application/octet-stream";
    fileData = `data:${mime};base64,${buffer.toString("base64")}`;
  } else if (note) {
    // Text-only answer: keep previous behaviour of materialising it as a file.
    fileName = `solution-task-${taskId}.txt`;
    const body = `Student: ${user.fullName} (${user.studentCode})\nTask ID: ${taskId}\n\n${note}`;
    fileData = `data:text/plain;charset=utf-8,${encodeURIComponent(body)}`;
  } else {
    return NextResponse.json({ ok: false, error: "no_file_or_note" }, { status: 400 });
  }

  try {
    const submission = await saveTaskSubmission(user.id, taskId, { fileName, fileData, note });
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
