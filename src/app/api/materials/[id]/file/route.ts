import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { materials, purchases } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { downloadFromFilesBucket, guessMimeType, parseGoogleDriveUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const material = await db.query.materials.findFirst({
    where: eq(materials.id, Number(id)),
    with: { lessons: true },
  });
  if (!material) return new NextResponse("Not found", { status: 404 });

  const owned =
    user.role === "teacher" ||
    material.priceCents === 0 ||
    Boolean(
      await db.query.purchases.findFirst({
        where: and(eq(purchases.userId, user.id), eq(purchases.materialId, material.id)),
      }),
    );
  if (!owned) return new NextResponse("Forbidden", { status: 403 });

  const inline = req.nextUrl.searchParams.get("inline") === "1";

  if (material.storagePath) {
    const cloud = await downloadFromFilesBucket(material.storagePath);
    if (cloud) {
      const safeName = (material.fileName || `${material.slug}.pdf`).replace(/[^a-zA-Z0-9._-]/g, "_");
      const mime = guessMimeType(safeName, material.mimeType || cloud.contentType);
      return new NextResponse(new Uint8Array(cloud.buffer), {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
        },
      });
    }
  }

  if (material.fileUrl) {
    const drive = parseGoogleDriveUrl(material.fileUrl);
    return NextResponse.redirect(drive ? (inline ? drive.previewUrl : drive.downloadUrl) : material.fileUrl);
  }

  const firstLesson = material.lessons[0];
  const body = [
    `${material.title}`,
    `in science · ${user.fullName} (ID: ${user.studentCode})`,
    "",
    "=".repeat(48),
    "",
    firstLesson?.content || material.description || "No content.",
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${material.slug}.md"`,
    },
  });
}
