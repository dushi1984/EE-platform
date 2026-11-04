import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  createSignedUploadUrl,
  guessMimeType,
  MAX_CLOUD_FILE_BYTES,
  type StorageFolder,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

const TEACHER_FOLDERS = new Set<StorageFolder>(["materials", "tasks", "messages", "submissions"]);
const STUDENT_FOLDERS = new Set<StorageFolder>(["submissions", "messages"]);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { folder?: string; fileName?: string; mimeType?: string; sizeBytes?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const folder = body.folder as StorageFolder;
  const allowed = user.role === "teacher" ? TEACHER_FOLDERS : STUDENT_FOLDERS;
  if (!folder || !allowed.has(folder)) {
    return NextResponse.json({ ok: false, error: "forbidden_folder" }, { status: 403 });
  }

  const fileName = String(body.fileName ?? "document").trim();
  const sizeBytes = Number(body.sizeBytes ?? 0);
  if (sizeBytes > MAX_CLOUD_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "file_too_big", maxBytes: MAX_CLOUD_FILE_BYTES },
      { status: 413 },
    );
  }

  try {
    const signed = await createSignedUploadUrl(folder, fileName);
    if (!signed) {
      return NextResponse.json({ ok: false, error: "storage_not_configured" }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      bucket: signed.bucket,
      storagePath: signed.storagePath,
      uploadUrl: signed.uploadUrl,
      mimeType: guessMimeType(fileName, body.mimeType),
    });
  } catch (err) {
    console.error("signed upload url failed", err);
    return NextResponse.json({ ok: false, error: "sign_failed" }, { status: 500 });
  }
}
