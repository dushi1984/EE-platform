import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users, type NotificationKind } from "@/db/schema";

export type NotificationPayload = {
  kind: NotificationKind;
  title: string;
  titleAr?: string;
  body?: string;
  bodyAr?: string;
  href?: string;
};

export async function notifyUsers(
  userIds: number[],
  payload: NotificationPayload,
  opts?: { respectTaskPref?: boolean },
) {
  const uniqueIds = Array.from(new Set(userIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueIds.length === 0) return;

  let finalIds = uniqueIds;
  if (opts?.respectTaskPref) {
    const rows = await db
      .select({ id: users.id, notifyTasks: users.notifyTasks })
      .from(users);
    const allowed = new Set(rows.filter((r) => r.notifyTasks).map((r) => r.id));
    finalIds = uniqueIds.filter((id) => allowed.has(id));
  }
  if (finalIds.length === 0) return;

  await db.insert(notifications).values(
    finalIds.map((userId) => ({
      userId,
      kind: payload.kind,
      title: payload.title.slice(0, 200),
      titleAr: (payload.titleAr || payload.title).slice(0, 200),
      body: (payload.body || "").slice(0, 500),
      bodyAr: (payload.bodyAr || payload.body || "").slice(0, 500),
      href: payload.href || "/dashboard",
    })),
  );
}

export async function notifyTeachers(payload: NotificationPayload) {
  const teachers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "teacher"));
  await notifyUsers(
    teachers.map((t) => t.id),
    payload,
  );
}

export async function notifyStudentsForAudience(
  audience: { targetStudentId?: number | null; targetGrade?: string },
  payload: NotificationPayload,
) {
  if (audience.targetStudentId) {
    await notifyUsers([audience.targetStudentId], payload, { respectTaskPref: true });
    return;
  }
  const allStudents = await db
    .select({ id: users.id, grade: users.grade, notifyTasks: users.notifyTasks })
    .from(users)
    .where(eq(users.role, "student"));

  const grade = audience.targetGrade || "all";
  const matching = allStudents
    .filter((s) => s.notifyTasks && (grade === "all" || s.grade === grade))
    .map((s) => s.id);

  await notifyUsers(matching, payload);
}

export async function notifyAllStudents(payload: NotificationPayload) {
  const allStudents = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "student"));
  await notifyUsers(
    allStudents.map((s) => s.id),
    payload,
  );
}

export async function getNotificationsForUser(userId: number, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export async function markNotificationRead(userId: number, notificationId: number) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
