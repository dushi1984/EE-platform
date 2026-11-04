import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const [items, unreadCount] = await Promise.all([
    getNotificationsForUser(user.id, 25),
    getUnreadNotificationCount(user.id),
  ]);
  return NextResponse.json({ ok: true, items, unreadCount });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (body.action === "read_all") {
    await markAllNotificationsRead(user.id);
  } else if (body.action === "read" && Number(body.id) > 0) {
    await markNotificationRead(user.id, Number(body.id));
  }
  revalidatePath("/notifications");
  const unreadCount = await getUnreadNotificationCount(user.id);
  return NextResponse.json({ ok: true, unreadCount });
}
