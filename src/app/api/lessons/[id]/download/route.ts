import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons, purchases } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { downloadFromFilesBucket, guessMimeType, parseGoogleDriveUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, Number(id)), with: { material: true } });
  if (!lesson) return new NextResponse("Not found", { status: 404 });

  const owned =
    user.role === "teacher" ||
    lesson.material.priceCents === 0 ||
    (await db.query.purchases.findFirst({
      where: and(eq(purchases.userId, user.id), eq(purchases.materialId, lesson.materialId)),
    }));
  if (!owned) return new NextResponse("Forbidden", { status: 403 });

  if (lesson.material.storagePath) {
    const cloud = await downloadFromFilesBucket(lesson.material.storagePath);
    if (cloud) {
      const safeName = (lesson.material.fileName || `${lesson.material.slug}.pdf`).replace(/[^a-zA-Z0-9._-]/g, "_");
      const mime = guessMimeType(safeName, lesson.material.mimeType || cloud.contentType);
      return new NextResponse(new Uint8Array(cloud.buffer), {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename="${safeName}"`,
        },
      });
    }
  }

  if (lesson.material.fileUrl) {
    const drive = parseGoogleDriveUrl(lesson.material.fileUrl);
    if (drive) {
      return NextResponse.redirect(drive.downloadUrl);
    }
  }

  const file = [
    `${lesson.material.title} — ${lesson.title}`,
    `in science · ${user.fullName} (ID: ${user.studentCode})`,
    "",
    "=".repeat(48),
    "",
    lesson.content || "No content.",
  ].join("\n");
  const safe = lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `lesson-${lesson.id}`;

  return new NextResponse(file, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safe}.md"`,
    },
  });
}
