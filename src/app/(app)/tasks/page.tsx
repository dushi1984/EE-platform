import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr, type Locale, type Translator } from "@/lib/i18n";
import { getAllSubjects, getTasksForUser, splitTasks, type TaskRow } from "@/lib/queries";
import { TopBar } from "@/components/shell/TopBar";
import { Badge, Card, ProgressBar, SectionTitle } from "@/components/ui";
import { TaskActions } from "@/components/TaskActions";
import { TeacherTasksView } from "@/components/teacher/TeacherTasksView";

export const metadata: Metadata = { title: "Tasks" };

const filters = ["all", "todo", "in_progress", "done"] as const;
type Filter = (typeof filters)[number];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; subject?: string; task?: string; tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { status, subject, task, tab } = await searchParams;
  if (user.role === "teacher") return <TeacherTasksView taskId={task} tab={tab} />;
  const filter: Filter = (filters as readonly string[]).includes(status ?? "") ? (status as Filter) : "all";
  const { t, locale } = await getI18n();

  const [all, subjects] = await Promise.all([getTasksForUser(user.id), getAllSubjects()]);
  const subjectFiltered = subject && subject !== "all" ? all.filter((x) => x.subject.name.toLowerCase() === subject.toLowerCase()) : all;
  const { week, archive } = splitTasks(subjectFiltered);
  const weekFiltered = filter === "all" ? week : week.filter((x) => x.status === filter);

  const chipLabel: Record<Filter, string> = {
    all: t("tasks.all"),
    todo: t("tasks.todo"),
    in_progress: t("tasks.inProgress"),
    done: t("tasks.done"),
  };

  return (
    <>
      <TopBar title={t("tasks.title")} />

      <section className="space-y-3">
        <SectionTitle>{t("tasks.thisWeek")}</SectionTitle>

        {/* Filter bars */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Link
                key={f}
                href={f === "all" ? `/tasks${subject ? `?subject=${subject}` : ""}` : `/tasks?status=${f}${subject ? `&subject=${subject}` : ""}`}
                className={`rounded-xl px-4 py-2 text-sm shadow-sm transition ${
                  filter === f
                    ? "bg-slate-900 font-bold text-white dark:bg-white dark:text-slate-900"
                    : "bg-white text-slate-800 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {chipLabel[f]}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto pb-1">
            <Link
              href={`/tasks${filter !== "all" ? `?status=${filter}` : ""}`}
              className={`rounded-lg px-2.5 py-1.5 transition ${!subject || subject === "all" ? "bg-navy-500 text-white font-bold" : "bg-white dark:bg-slate-800 hover:text-slate-900"}`}
            >
              {locale === "ar" ? "كل المواد" : "All subjects"}
            </Link>
            {subjects.map((s) => (
              <Link
                key={s.id}
                href={`/tasks?subject=${s.name.toLowerCase()}${filter !== "all" ? `&status=${filter}` : ""}`}
                className={`rounded-lg px-2.5 py-1.5 whitespace-nowrap transition ${
                  subject?.toLowerCase() === s.name.toLowerCase()
                    ? "bg-navy-500 text-white font-bold"
                    : "bg-white dark:bg-slate-800 hover:text-slate-900"
                }`}
              >
                {s.icon} {locale === "ar" ? s.nameAr : s.name}
              </Link>
            ))}
          </div>
        </div>

        <TaskTable rows={weekFiltered} locale={locale} t={t} emptyText={t("tasks.empty")} />
      </section>

      <section className="space-y-3">
        <SectionTitle>{t("tasks.archive")}</SectionTitle>
        <TaskTable rows={archive} locale={locale} t={t} emptyText={t("tasks.emptyArchive")} archive />
      </section>
    </>
  );
}

function TaskTable({
  rows,
  locale,
  t,
  emptyText,
  archive = false,
}: {
  rows: TaskRow[];
  locale: Locale;
  t: Translator;
  emptyText: string;
  archive?: boolean;
}) {
  return (
    <Card>
      <div className="overflow-x-auto [scrollbar-gutter:stable]">
        <table className="w-full min-w-[640px] text-start text-sm">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400">
              <th className="px-5 py-3 text-start font-semibold">{t("tasks.task")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("tasks.dueDate")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("tasks.progress")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("tasks.status")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  {emptyText}
                </td>
              </tr>
            )}
            {rows.map((task) => {
              const missed = archive && task.status !== "done";
              const tone = missed ? "missed" : task.overdue ? "overdue" : task.status;
              const label = missed ? t("tasks.missed") : task.overdue ? t("tasks.overdue") : t(`status.${task.status}`);
              return (
                <tr key={task.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/tasks/${task.id}`} className="font-bold text-slate-900 hover:text-navy-500 hover:underline dark:text-white dark:hover:text-sky-300">
                        {tr(locale, task.title, task.titleAr)}
                      </Link>
                      {task.hasSubmission && (
                        <span
                          className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          title={t("tasks.submitted")}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="line-clamp-1 text-xs text-slate-500 mt-0.5">
                        {tr(locale, task.description, task.descriptionAr)}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {task.subject.icon} {tr(locale, task.subject.name, task.subject.nameAr)}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-600 dark:text-slate-300">
                    {fmtDate(locale, task.dueDate)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <ProgressBar percent={task.progress} className="w-28 sm:w-36" />
                      <span className="w-9 text-xs text-slate-500">{task.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={tone}>{label}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-end">
                    <TaskActions taskId={task.id} status={task.status} progress={task.progress} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
