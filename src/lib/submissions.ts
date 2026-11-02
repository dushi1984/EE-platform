import { db } from "@/db";
import { taskProgress, taskSubmissions, tasks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function saveTaskSubmission(
  userId: number,
  taskId: number,
  input: { fileName: string; fileData: string | null; note: string },
) {
  const now = new Date();
  const [submission] = await db
    .insert(taskSubmissions)
    .values({
      userId,
      taskId,
      fileName: input.fileName.slice(0, 120),
      note: input.note.slice(0, 500),
      fileData: input.fileData,
      submittedAt: now,
    })
    .onConflictDoUpdate({
      target: [taskSubmissions.userId, taskSubmissions.taskId],
      set: {
        fileName: input.fileName.slice(0, 120),
        note: input.note.slice(0, 500),
        fileData: input.fileData,
        score: null,
        gradedAt: null,
        submittedAt: now,
      },
    })
    .returning();

  await db
    .insert(taskProgress)
    .values({ userId, taskId, status: "done", progress: 100 })
    .onConflictDoUpdate({
      target: [taskProgress.userId, taskProgress.taskId],
      set: { status: "done", progress: 100, updatedAt: now },
    });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return submission;
}

export async function removeTaskSubmission(userId: number, taskId: number) {
  await db
    .delete(taskSubmissions)
    .where(and(eq(taskSubmissions.userId, userId), eq(taskSubmissions.taskId, taskId)));
  await db
    .update(taskProgress)
    .set({ status: "in_progress", progress: 50, updatedAt: new Date() })
    .where(and(eq(taskProgress.userId, userId), eq(taskProgress.taskId, taskId)));
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function getOpenTask(taskId: number) {
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task || task.status === "closed") return null;
  return task;
}
