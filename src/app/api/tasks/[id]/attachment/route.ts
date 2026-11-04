import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { parseDataUrl } from "@/lib/dataurl";
import { downloadFromFilesBucket, guessMimeType, parseGoogleDriveUrl } from "@/lib/storage";
import { taskAppliesToStudent } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, Number(id)), with: { subject: true } });
  if (!task) return new NextResponse("Not found", { status: 404 });
  if (user.role === "student" && !taskAppliesToStudent(task, user)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const name = (task.attachmentName || `task-${task.id}-attachment.txt`).replace(/[^a-zA-Z0-9._-]/g, "_");

  if (task.attachmentStoragePath) {
    const cloud = await downloadFromFilesBucket(task.attachmentStoragePath);
    if (cloud) {
      const mime = guessMimeType(name, task.attachmentMime || cloud.contentType);
      return new NextResponse(new Uint8Array(cloud.buffer), {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename="${name}"`,
        },
      });
    }
  }

  if (task.attachmentUrl) {
    const drive = parseGoogleDriveUrl(task.attachmentUrl);
    return NextResponse.redirect(drive ? drive.downloadUrl : task.attachmentUrl);
  }

  const uploaded = parseDataUrl(task.attachmentBody);
  if (uploaded) {
    return new NextResponse(new Uint8Array(uploaded.buffer), {
      headers: {
        "Content-Type": uploaded.mime,
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  }

  const body = task.attachmentBody?.trim() || task.description || "No attachment content.";
  const file = [
    `in science — ${task.subject.name}`,
    `Task: ${task.title}`,
    `Due: ${new Date(task.dueDate).toLocaleDateString("en-GB")}`,
    `Student: ${user.fullName} (ID: ${user.studentCode})`,
    "",
    "=".repeat(48),
    "",
    body,
  ].join("\n");

  return new NextResponse(file, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
