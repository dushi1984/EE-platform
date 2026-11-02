import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { taskTypeLabel, tt } from "@/lib/i18n-teacher";
import { getTaskById } from "@/lib/queries";
import { TopBar } from "@/components/shell/TopBar";
import { Badge, Card, CrumbSep, ForwardArrow, Icon, ProgressBar, SectionTitle } from "@/components/ui";
import { TaskActions } from "@/components/TaskActions";
import { DownloadButton, RemoveSubmissionButton, SubmissionForm } from "@/components/TaskSubmissionForm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Task" };
  const task = await getTaskById(user.id, Number(id));
  return { title: task ? `${task.title} · Tasks` : "Task" };
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "teacher") redirect(`/tasks?task=${id}`);
  const { t, locale } = await getI18n();
  const task = await getTaskById(user.id, Number(id));
  if (!task) notFound();

  const title = tr(locale, task.title, task.titleAr);

  return (
    <>
      <TopBar title={t("tasks.title")} />

      <SectionTitle
        center
        action={null}
      >
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
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("tasks.info")}</h2>
          <TaskActions taskId={task.id} status={task.status} progress={task.progress} />
        </div>
        <dl>
          <Row label={t("tasks.taskTitle")} value={title} bold />
          <Row label={t("tasks.taskType")} value={`${task.subject.icon} ${taskTypeLabel(locale, task.taskType)}`} />
          <Row label={t("tasks.dueDate")} value={fmtDate(locale, task.dueDate)} />
          <Row label={t("tasks.description")} value={tr(locale, task.description, task.descriptionAr) || "—"} />
          {task.submission?.score !== null && task.submission?.score !== undefined ? (
            <div className="flex flex-col gap-3 bg-blue-50/60 px-5 py-4 dark:bg-blue-500/10 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500 text-white">
                  <Icon name="grades" className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-500">{locale === "ar" ? "الدرجة التي حصلت عليها" : "Grade received"}</p>
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
                <Link href="/grades" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-600 shadow-sm hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-300">
                  {t("grades.title")} <ForwardArrow />
                </Link>
              </div>
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
      <Card className="overflow-hidden">
        <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-slate-900 dark:border-slate-700 dark:text-white">
          {t("tasks.attachment")}
        </h2>
        <div className="px-5 py-4">
          {task.attachmentName ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <Icon name="file" className="h-6 w-6 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-slate-200">
                {task.attachmentName}
              </span>
              <DownloadButton url={`/api/tasks/${task.id}/attachment`} label={t("tasks.download")} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t("tasks.noAttachment")}</p>
          )}
        </div>
      </Card>

      {/* Submission */}
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
                  {task.submission.note && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{task.submission.note}</p>}
                </div>
                <RemoveSubmissionButton taskId={task.id} />
              </div>
            </div>
          ) : null}
          <div>
            {task.submission && <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t("tasks.resubmit")}</p>}
            {task.isClosed ? (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{tt(locale).taskClosedNote}</p>
            ) : (
              <SubmissionForm taskId={task.id} />
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className={`text-sm sm:max-w-[60%] sm:text-end ${bold ? "font-bold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>
        {value}
      </dd>
    </div>
  );
}
