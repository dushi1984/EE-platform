import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { taskSubmissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { parseDataUrl } from "@/lib/dataurl";
import { downloadFromFilesBucket, guessMimeType, parseGoogleDriveUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const inline = new URL(req.url).searchParams.get("inline") === "1";

  const sub = await db.query.taskSubmissions.findFirst({
    where: eq(taskSubmissions.id, Number(id)),
    with: { user: true, task: true },
  });
  if (!sub) return new NextResponse("Not found", { status: 404 });
  if (user.role !== "teacher" && sub.userId !== user.id) return new NextResponse("Forbidden", { status: 403 });

  const name = sub.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "submission";
  const disp = inline ? "inline" : "attachment";

  if (sub.fileStoragePath) {
    const cloud = await downloadFromFilesBucket(sub.fileStoragePath);
    if (cloud) {
      const mime = guessMimeType(name, sub.fileMime || cloud.contentType);
      return new NextResponse(new Uint8Array(cloud.buffer), {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `${disp}; filename="${name}"`,
        },
      });
    }
  }

  if (sub.fileUrl) {
    const drive = parseGoogleDriveUrl(sub.fileUrl);
    return NextResponse.redirect(drive ? (inline ? drive.previewUrl : drive.downloadUrl) : sub.fileUrl);
  }

  const uploaded = parseDataUrl(sub.fileData);
  if (uploaded) {
    return new NextResponse(new Uint8Array(uploaded.buffer), {
      headers: { "Content-Type": uploaded.mime, "Content-Disposition": `${disp}; filename="${name}"` },
    });
  }
  const text = [
    `Submission for: ${sub.task.title}`,
    `Student: ${sub.user.fullName} (ID: ${sub.user.studentCode})`,
    `Submitted: ${sub.submittedAt.toISOString()}`,
    `File: ${sub.fileName}`,
    "",
    sub.note || "(No note)",
  ].join("\n");
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `${disp}; filename="${name}.txt"`,
    },
  });
}
