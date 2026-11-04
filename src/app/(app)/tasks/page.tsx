import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr, type Locale, type Translator } from "@/lib/i18n";
import {
  canAccessStudentPage,
  canAccessTaskContent,
  canSubmitTasks,
  firstAllowedPath,
  getAccessPolicy,
  normalizeAccountStatus,
} from "@/lib/access";
import { getAllSubjects, getTasksForUser, getVisitorTasks, splitTasks, type TaskRow } from "@/lib/queries";
import { TopBar } from "@/components/shell/TopBar";
import { Badge, Card, Icon, ProgressBar, SectionTitle, SubjectBadge, SubjectGlyph } from "@/components/ui";
import { TaskActions } from "@/components/TaskActions";
import { PageAccessNotice } from "@/components/PageAccessNotice";
import { TeacherTasksView } from "@/components/teacher/TeacherTasksView";

export const metadata: Metadata = { title: "Tasks" };

const filters = ["all", "todo", "in_progress", "done"] as const;
type Filter = (typeof filters)[number];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; subject?: string; task?: string; tab?: string }>;
}) {
  const [user, policy, { status, subject, task, tab }, { t, locale }] = await Promise.all([
    getCurrentUser(),
    getAccessPolicy(),
    searchParams,
    getI18n(),
  ]);

  if (user?.role === "teacher") return <TeacherTasksView taskId={task} tab={tab} />;

  if (!user && !canAccessStudentPage(null, "tasks", policy)) {
    redirect("/login?next=/tasks");
  }
  if (user && !canAccessStudentPage(user, "tasks", policy)) {
    return (
      <>
        <TopBar title={t("tasks.title")} />
        <PageAccessNotice locale={locale} backHref={firstAllowedPath(user, policy)} />
      </>
    );
  }

  const filter: Filter = (filters as readonly string[]).includes(status ?? "") ? (status as Filter) : "all";
  const [rawTasks, subjects] = await Promise.all([
    user ? getTasksForUser(user.id) : getVisitorTasks(),
    getAllSubjects(),
  ]);

  const accessible = rawTasks.filter((x) => canAccessTaskContent(user, x, policy));
  const hiddenForApproval = user && normalizeAccountStatus(user.accountStatus) === "pending"
    ? rawTasks.length - accessible.length
    : 0;
  const canMutate = Boolean(user && canSubmitTasks(user, policy));

  const subjectFiltered =
    subject && subject !== "all"
      ? accessible.filter((x) => x.subject.name.toLowerCase() === subject.toLowerCase())
      : accessible;

  const { week, archive } = user ? splitTasks(subjectFiltered) : { week: subjectFiltered, archive: [] };
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

      {hiddenForApproval > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          <Icon name="lock" className="h-4 w-4 shrink-0" />
          <span>
            {locale === "ar"
              ? `يوجد ${hiddenForApproval} مهام إضافية لصفك ستُفتح فور موافقة المعلم على حسابك.`
              : `${hiddenForApproval} additional class task${hiddenForApproval === 1 ? "" : "s"} will unlock once your teacher approves your account.`}
          </span>
        </div>
      )}

      <section className="space-y-3">
        <SectionTitle>{!user ? (locale === "ar" ? "مهام متاحة للزوار" : "Preview Tasks") : t("tasks.thisWeek")}</SectionTitle>

        {/* Filter bars */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          {user ? (
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <Link
                  key={f}
                  href={
                    f === "all"
                      ? `/tasks${subject ? `?subject=${subject}` : ""}`
                      : `/tasks?status=${f}${subject ? `&subject=${subject}` : ""}`
                  }
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
          ) : (
            <div />
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-slate-600 dark:text-slate-300">
            <Link
              href={`/tasks${filter !== "all" ? `?status=${filter}` : ""}`}
              className={`rounded-lg px-2.5 py-1.5 transition ${
                !subject || subject === "all"
                  ? "bg-navy-500 font-bold text-white"
                  : "bg-white hover:text-slate-900 dark:bg-slate-800"
              }`}
            >
              {locale === "ar" ? "كل المواد" : "All subjects"}
            </Link>
            {subjects.map((s) => (
              <Link
                key={s.id}
                href={`/tasks?subject=${s.name.toLowerCase()}${filter !== "all" ? `&status=${filter}` : ""}`}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition ${
                  subject?.toLowerCase() === s.name.toLowerCase()
                    ? "bg-navy-500 font-bold text-white"
                    : "bg-white hover:text-slate-900 dark:bg-slate-800"
                }`}
              >
                <SubjectGlyph icon={s.icon} name={s.name} className="h-3.5 w-3.5" />
                <span>{locale === "ar" ? s.nameAr : s.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <TaskTable
          rows={weekFiltered}
          locale={locale}
          t={t}
          emptyText={t("tasks.empty")}
          canMutate={canMutate}
          isVisitor={!user}
        />
      </section>

      {user && (
        <section className="space-y-3">
          <SectionTitle>{t("tasks.archive")}</SectionTitle>
          <TaskTable
            rows={archive}
            locale={locale}
            t={t}
            emptyText={t("tasks.emptyArchive")}
            archive
            canMutate={canMutate}
            isVisitor={false}
          />
        </section>
      )}
    </>
  );
}

function TaskTable({
  rows,
  locale,
  t,
  emptyText,
  archive = false,
  canMutate = true,
  isVisitor = false,
}: {
  rows: TaskRow[];
  locale: Locale;
  t: Translator;
  emptyText: string;
  archive?: boolean;
  canMutate?: boolean;
  isVisitor?: boolean;
}) {
  return (
    <Card>
      <div className="overflow-x-auto [scrollbar-gutter:stable]">
        <table className="w-full min-w-[640px] text-start text-sm">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400">
              <th className="px-5 py-3 text-start font-semibold">{t("tasks.task")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("tasks.dueDate")}</th>
              {!isVisitor && <th className="px-4 py-3 text-start font-semibold">{t("tasks.progress")}</th>}
              <th className="px-4 py-3 text-start font-semibold">{t("tasks.status")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={isVisitor ? 4 : 5} className="px-5 py-10 text-center text-slate-500">
                  {emptyText}
                </td>
              </tr>
            )}
            {rows.map((task) => {
              const missed = archive && task.status !== "done";
              const tone = isVisitor ? "todo" : missed ? "missed" : task.overdue ? "overdue" : task.status;
              const label = isVisitor
                ? locale === "ar"
                  ? "معاينة"
                  : "Preview"
                : missed
                  ? t("tasks.missed")
                  : task.overdue
                    ? t("tasks.overdue")
                    : t(`status.${task.status}`);
              return (
                <tr key={task.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-bold text-slate-900 hover:text-navy-500 hover:underline dark:text-white dark:hover:text-sky-300"
                      >
                        {tr(locale, task.title, task.titleAr)}
                      </Link>
                      {task.isPersonal && (
                        <Badge tone="personal">{locale === "ar" ? "خاص بك" : "Personal"}</Badge>
                      )}
                      {task.hasQuiz && (
                        <Badge tone="todo">
                          <Icon name="quiz" className="h-3 w-3" />
                          {locale === "ar" ? "اختبار" : "Quiz"}
                        </Badge>
                      )}
                      {task.hasSubmission && (
                        <span
                          className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                          title={t("tasks.submitted")}
                        >
                          <Icon name="check" className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {tr(locale, task.description, task.descriptionAr)}
                      </p>
                    )}
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <SubjectBadge icon={task.subject.icon} name={task.subject.name} size="xs" />
                      <span>{tr(locale, task.subject.name, task.subject.nameAr)}</span>
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-600 dark:text-slate-300">
                    {fmtDate(locale, task.dueDate)}
                  </td>
                  {!isVisitor && (
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar percent={task.progress} className="w-28 sm:w-36" />
                        <span className="w-9 text-xs text-slate-500">{task.progress}%</span>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3.5">
                    <Badge tone={tone}>{label}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-end">
                    {canMutate ? (
                      <TaskActions taskId={task.id} status={task.status} progress={task.progress} />
                    ) : (
                      <Link
                        href={`/tasks/${task.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-navy-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-sky-300"
                      >
                        {t("tasks.openDetails")}
                      </Link>
                    )}
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
