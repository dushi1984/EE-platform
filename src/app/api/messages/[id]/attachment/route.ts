import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { parseDataUrl } from "@/lib/dataurl";
import { downloadFromFilesBucket, guessMimeType } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const message = await db.query.messages.findFirst({ where: eq(messages.id, Number(id)) });
  if (!message || !message.attachmentName) return new NextResponse("Not found", { status: 404 });
  if (user.role !== "teacher" && message.studentId !== user.id) return new NextResponse("Forbidden", { status: 403 });

  const name = message.attachmentName.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (message.attachmentStoragePath) {
    const cloud = await downloadFromFilesBucket(message.attachmentStoragePath);
    if (cloud) {
      const mime = guessMimeType(name, message.attachmentMime || cloud.contentType);
      return new NextResponse(new Uint8Array(cloud.buffer), {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename="${name}"`,
        },
      });
    }
  }

  if (!message.attachmentData) return new NextResponse("Not found", { status: 404 });
  const parsed = parseDataUrl(message.attachmentData);
  if (!parsed) return new NextResponse("Invalid attachment", { status: 422 });
  return new NextResponse(new Uint8Array(parsed.buffer), {
    headers: {
      "Content-Type": parsed.mime,
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
