import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { purchases } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const p = await db.query.purchases.findFirst({ where: eq(purchases.id, Number(id)), with: { user: true, material: true } });
  if (!p) return new NextResponse("Not found", { status: 404 });
  if (user.role !== "teacher" && p.userId !== user.id) return new NextResponse("Forbidden", { status: 403 });

  const receipt = [
    "in science — PAYMENT RECEIPT",
    "=".repeat(40),
    `Receipt #: ${String(p.id).padStart(6, "0")}`,
    `Date: ${p.purchasedAt.toISOString().slice(0, 10)}`,
    `Student: ${p.user.fullName} (ID: ${p.user.studentCode})`,
    `Item: ${p.material.title}`,
    `Amount: ${(p.pricePaidCents / 100).toFixed(2)} EGP`,
    `Method: ${p.paymentMethod}`,
    `Status: ${p.status.toUpperCase()}`,
    "=".repeat(40),
    "Thank you for learning with in science.",
  ].join("\n");

  return new NextResponse(receipt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="receipt-${String(p.id).padStart(6, "0")}.txt"`,
    },
  });
}
