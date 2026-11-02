import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { taskSubmissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { parseDataUrl } from "@/lib/dataurl";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const sub = await db.query.taskSubmissions.findFirst({ where: eq(taskSubmissions.id, Number(id)), with: { user: true, task: true } });
  if (!sub) return new NextResponse("Not found", { status: 404 });
  // Teachers can read every submission; students only their own
  if (user.role !== "teacher" && sub.userId !== user.id) return new NextResponse("Forbidden", { status: 403 });

  const name = sub.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "submission";
  const uploaded = parseDataUrl(sub.fileData);
  if (uploaded) {
    return new NextResponse(new Uint8Array(uploaded.buffer), {
      headers: { "Content-Type": uploaded.mime, "Content-Disposition": `attachment; filename="${name}"` },
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
    headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.txt"` },
  });
}
