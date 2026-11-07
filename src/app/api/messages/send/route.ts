import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { canAccessStudentPage, getAccessPolicy, normalizeAccountStatus } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { MAX_UPLOAD_BYTES } from "@/lib/submissions";
import { guessMimeType, uploadBufferToFilesBucket } from "@/lib/storage";
import { notifyTeachers, notifyUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (user.role === "student") {
    const policy = await getAccessPolicy();
    if (normalizeAccountStatus(user.accountStatus) === "blocked" || !canAccessStudentPage(user, "messages", policy)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
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

  const storagePathIn = String(form.get("storagePath") ?? "").trim() || null;
  const fileNameIn = String(form.get("fileName") ?? "").trim() || null;
  const mimeTypeIn = String(form.get("mimeType") ?? "").trim() || null;
  const file = form.get("file");

  let attachmentName: string | null = fileNameIn;
  let attachmentStoragePath: string | null = storagePathIn;
  let attachmentMime: string | null = mimeTypeIn;
  let attachmentData: string | null = null;

  if (storagePathIn && fileNameIn) {
    attachmentMime = guessMimeType(fileNameIn, mimeTypeIn);
  } else if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, error: "file_too_big" }, { status: 413 });
    }
    attachmentName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadBufferToFilesBucket("messages", file.name, buffer, file.type);
    if (uploaded) {
      attachmentStoragePath = uploaded.storagePath;
      attachmentMime = uploaded.mimeType;
    } else {
      attachmentData = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    }
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
    attachmentStoragePath,
    attachmentMime,
  });

  if (user.role === "teacher") {
    await notifyUsers([studentId], {
      kind: "message",
      title: `New message from ${user.fullName}`,
      titleAr: `رسالة جديدة من ${user.fullName}`,
      body: body.slice(0, 160),
      bodyAr: body.slice(0, 160),
      href: "/messages",
    }).catch(() => {});
  } else {
    await notifyTeachers({
      kind: "message",
      title: `New message from ${user.fullName}`,
      titleAr: `رسالة جديدة من ${user.fullName}`,
      body: body.slice(0, 160),
      bodyAr: body.slice(0, 160),
      href: "/messages",
    }).catch(() => {});
  }

  revalidatePath("/messages");
  revalidatePath(`/students/${studentId}/message`);
  return NextResponse.json({ ok: true });
}
