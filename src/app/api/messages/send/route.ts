import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { MAX_UPLOAD_BYTES } from "@/lib/submissions";

export const dynamic = "force-dynamic";

/**
 * Send a message with an optional file attachment, for both roles:
 * - teacher → { studentId, recipientType: student|parent, body, file? }
 * - student → { body, file? } (the teacher is Mrs. Fatma by convention)
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const body = String(form.get("body") ?? "").trim();
  if (!body) {
    return NextResponse.json({ ok: false, error: "message_required" }, { status: 400 });
  }

  const file = form.get("file");
  let attachmentName: string | null = null;
  let attachmentData: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, error: "file_too_big" }, { status: 413 });
    }
    attachmentName = file.name;
    attachmentData = `data:${file.type || "application/octet-stream"};base64,${Buffer.from(
      await file.arrayBuffer(),
    ).toString("base64")}`;
  }

  let senderId: number;
  let studentId: number;
  let recipientType: "student" | "parent";

  if (user.role === "teacher") {
    senderId = user.id;
    studentId = Number(form.get("studentId"));
    recipientType = String(form.get("recipientType")) === "parent" ? "parent" : "student";
    const student = await db.query.users.findFirst({ where: eq(users.id, studentId) });
    if (!student || student.role !== "student") {
      return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 404 });
    }
  } else {
    senderId = user.id;
    studentId = user.id;
    recipientType = "student";
  }

  await db.insert(messages).values({
    senderId,
    studentId,
    recipientType,
    body: body.slice(0, 5000),
    attachmentName,
    attachmentData,
  });

  revalidatePath("/messages");
  revalidatePath(`/students/${studentId}/message`);
  return NextResponse.json({ ok: true });
}
