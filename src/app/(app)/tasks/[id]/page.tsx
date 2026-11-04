import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { taskTypeLabel, tt } from "@/lib/i18n-teacher";
import { getTaskById } from "@/lib/queries";
import { parseGoogleDriveUrl } from "@/lib/storage";
import { TopBar } from "@/components/shell/TopBar";
import { Badge, Card, CrumbSep, ForwardArrow, Icon, ProgressBar, SectionTitle, SubjectBadge } from "@/components/ui";
import { TaskActions } from "@/components/TaskActions";
import { TaskQuizRunner } from "@/components/TaskQuizRunner";
import { DownloadButton, RemoveSubmissionButton, SubmissionForm } from "@/components/TaskSubmissionForm";
import { TeacherTaskPreviewView } from "@/components/teacher/TeacherTaskPreviewView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Task" };
  if (user.role === "teacher") {
    const t = await db.query.tasks.findFirst({ where: eq(tasks.id, Number(id)) });
    return { title: t ? `${t.title} · Task Preview` : "Task Preview" };
  }
  const task = await getTaskById(user.id, Number(id));
  return { title: task ? `${task.title} · Tasks` : "Task" };
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ student?: string; tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "teacher") {
    return (
      <TeacherTaskPreviewView
        taskId={Number(id)}
        focusStudentId={sp.student ? Number(sp.student) : null}
        tab={sp.tab}
      />
    );
  }

  const { t, locale } = await getI18n();
  const task = await getTaskById(user.id, Number(id));
  if (!task) notFound();

  const title = tr(locale, task.title, task.titleAr);
  const driveAttachment = parseGoogleDriveUrl(task.attachmentUrl);
  const hasQuiz = Array.isArray(task.quizQuestions) && task.quizQuestions.length > 0;

  return (
    <>
      <TopBar title={t("tasks.title")} />

      <SectionTitle center action={null}>
        <span className="flex items-center gap-2 text-xl">
          <Link href="/tasks" className="font-medium text-navy-500 hover:underline dark:text-sky-300">
            {t("tasks.title")}
          </Link>
          <CrumbSep />
          <span className="max-w-[40vw] truncate">{title}</span>
        </span>
      </SectionTitle>

      {/* Task information */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("tasks.info")}</h2>
            {task.isPersonal && (
              <Badge tone="personal">{locale === "ar" ? "مخصص لك" : "Assigned to you"}</Badge>
            )}
            {task.submission?.checkedAt && (
              <Badge tone="done">
                <Icon name="check" className="h-3 w-3" />
                {locale === "ar" ? "تمت المراجعة" : "Checked by Teacher"}
              </Badge>
            )}
          </div>
          <TaskActions taskId={task.id} status={task.status} progress={task.progress} />
        </div>
        <dl>
          <Row label={t("tasks.taskTitle")} value={title} bold />
          <Row
            label={t("tasks.taskType")}
            value={
              <span className="inline-flex items-center gap-2">
                <SubjectBadge icon={task.subject.icon} name={task.subject.name} size="xs" />
                <span>{tr(locale, task.subject.name, task.subject.nameAr)}</span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold">{taskTypeLabel(locale, task.taskType)}</span>
              </span>
            }
          />
          <Row label={t("tasks.dueDate")} value={fmtDate(locale, task.dueDate)} />
          <Row label={t("tasks.description")} value={tr(locale, task.description, task.descriptionAr) || "—"} />
          {task.submission?.score !== null && task.submission?.score !== undefined ? (
            <div className="flex flex-col gap-3 bg-blue-50/60 px-5 py-4 dark:bg-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500 text-white">
                  <Icon name="trophy" className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {locale === "ar" ? "الدرجة التي حصلت عليها" : "Grade received"}
                  </p>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white" dir="ltr">
                    {task.submission.score} / {task.submission.maxScore}
                    <span className="ms-2 text-sm font-bold text-blue-600">
                      ({Math.round((task.submission.score / task.submission.maxScore) * 100)}%)
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {task.submission.gradedAt && (
                  <span className="text-xs text-slate-500">
                    {locale === "ar" ? "تم التقييم" : "Graded"} {fmtDate(locale, task.submission.gradedAt)}
                  </span>
                )}
                <Link
                  href="/grades"
                  className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-600 shadow-sm hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-300"
                >
                  {t("grades.title")} <ForwardArrow />
                </Link>
              </div>
            </div>
          ) : null}

          {task.submission?.teacherFeedback ? (
            <div className="border-t border-emerald-100 bg-emerald-50/70 px-5 py-4 dark:border-emerald-900/40 dark:bg-emerald-500/10">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <Icon name="check" className="h-4 w-4" />
                {locale === "ar" ? "ملاحظات المعلم وتصحيح المهمة" : "Teacher Correction & Feedback"}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
                {task.submission.teacherFeedback}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-sm text-slate-500">{t("tasks.status")}</dt>
            <dd className="flex items-center gap-3">
              <ProgressBar percent={task.progress} className="w-32 sm:w-44" />
              <Badge tone={task.overdue ? "overdue" : task.status}>
                {task.overdue ? t("tasks.overdue") : t(`status.${task.status}`)}
              </Badge>
            </dd>
          </div>
        </dl>
      </Card>

      {/* Attachment */}
      {(task.attachmentName || task.attachmentUrl || !hasQuiz) && (
        <Card className="overflow-hidden">
          <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-slate-900 dark:border-slate-700 dark:text-white">
            {t("tasks.attachment")}
          </h2>
          <div className="px-5 py-4">
            {task.attachmentName || task.attachmentUrl ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-navy-600 shadow-xs dark:bg-slate-900 dark:text-sky-300">
                  <Icon name={driveAttachment ? "drive" : "file"} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                    {task.attachmentName || "Document"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {driveAttachment
                      ? "Google Drive"
                      : task.attachmentStoragePath
                        ? locale === "ar"
                          ? "سحابة Supabase (files)"
                          : "Supabase Cloud (files)"
                        : ""}
                  </p>
                </div>
                {driveAttachment ? (
                  <a
                    href={driveAttachment.viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-600"
                  >
                    <Icon name="drive" className="h-4 w-4" />
                    {locale === "ar" ? "فتح في Google Drive" : "Open in Drive"}
                  </a>
                ) : (
                  <DownloadButton url={`/api/tasks/${task.id}/attachment`} label={t("tasks.download")} />
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t("tasks.noAttachment")}</p>
            )}
          </div>
        </Card>
      )}

      {/* Interactive Quiz OR File/Text Submission */}
      {hasQuiz ? (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
              <Icon name="quiz" className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {locale === "ar" ? "أسئلة الاختبار التفاعلي" : "Interactive Quiz"}
            </h2>
          </div>
          <div className="p-5">
            <TaskQuizRunner
              taskId={task.id}
              questions={task.quizQuestions!}
              maxScore={task.maxScore}
              disabled={task.isClosed}
            />
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-slate-900 dark:border-slate-700 dark:text-white">
            {task.submission ? t("tasks.submitted") : t("tasks.uploadFile")}
          </h2>
          <div className="space-y-4 px-5 py-5">
            {task.submission ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-500/10">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-green-500 text-white">
                    <Icon name="check" className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900 dark:text-white">{task.submission.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {t("tasks.submittedOn")} {fmtDate(locale, task.submission.submittedAt)}
                    </p>
                    {task.submission.note && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{task.submission.note}</p>
                    )}
                  </div>
                  <RemoveSubmissionButton taskId={task.id} />
                </div>
              </div>
            ) : null}
            <div>
              {task.submission && (
                <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t("tasks.resubmit")}</p>
              )}
              {task.isClosed ? (
                <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {tt(locale).taskClosedNote}
                </p>
              ) : (
                <SubmissionForm taskId={task.id} />
              )}
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

function Row({ label, value, bold = false }: { label: string; value: ReactNode; bold?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className={`text-sm sm:max-w-[65%] sm:text-end ${bold ? "font-bold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>
        {value}
      </dd>
    </div>
  );
}
