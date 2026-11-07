import { db } from "@/db";
import { taskProgress, taskSubmissions, tasks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { deleteFromFilesBucket, MAX_CLOUD_FILE_BYTES } from "@/lib/storage";
import { taskAppliesToStudent } from "@/lib/queries";

export const MAX_UPLOAD_BYTES = MAX_CLOUD_FILE_BYTES;

export async function saveTaskSubmission(
  userId: number,
  taskId: number,
  input: {
    fileName: string;
    fileData?: string | null;
    fileUrl?: string | null;
    fileStoragePath?: string | null;
    fileMime?: string | null;
    note: string;
  },
) {
  const existing = await db.query.taskSubmissions.findFirst({
    where: and(eq(taskSubmissions.userId, userId), eq(taskSubmissions.taskId, taskId)),
  });
  if (existing?.fileStoragePath && existing.fileStoragePath !== input.fileStoragePath) {
    await deleteFromFilesBucket(existing.fileStoragePath);
  }

  const now = new Date();
  const [submission] = await db
    .insert(taskSubmissions)
    .values({
      userId,
      taskId,
      fileName: input.fileName.slice(0, 160),
      note: input.note.slice(0, 1000),
      fileData: input.fileData ?? null,
      fileUrl: input.fileUrl ?? null,
      fileStoragePath: input.fileStoragePath ?? null,
      fileMime: input.fileMime ?? null,
      submittedAt: now,
    })
    .onConflictDoUpdate({
      target: [taskSubmissions.userId, taskSubmissions.taskId],
      set: {
        fileName: input.fileName.slice(0, 160),
        note: input.note.slice(0, 1000),
        fileData: input.fileData ?? null,
        fileUrl: input.fileUrl ?? null,
        fileStoragePath: input.fileStoragePath ?? null,
        fileMime: input.fileMime ?? null,
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
  const existing = await db.query.taskSubmissions.findFirst({
    where: and(eq(taskSubmissions.userId, userId), eq(taskSubmissions.taskId, taskId)),
  });
  if (existing?.fileStoragePath) {
    await deleteFromFilesBucket(existing.fileStoragePath);
  }
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

export async function getOpenTask(taskId: number, student?: { id: number; grade: string }) {
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task || task.status === "closed") return null;
  if (student && !taskAppliesToStudent(task, student)) return null;
  return task;
}
