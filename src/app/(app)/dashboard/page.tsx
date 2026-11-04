import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { getDashboardData } from "@/lib/queries";
import { TopBar } from "@/components/shell/TopBar";
import {
  Badge,
  Card,
  EmptyState,
  ForwardArrow,
  Icon,
  ProgressBar,
  SectionTitle,
  SubHeading,
  SubjectBadge,
  type IconName,
} from "@/components/ui";
import { MaterialThumb } from "@/components/MaterialCard";
import { TeacherDashboard } from "@/components/teacher/TeacherDashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "teacher") return <TeacherDashboard />;
  const { t, locale } = await getI18n();
  const data = await getDashboardData(user.id);

  // Pick the primary in-progress material for the Resume Card
  const activeMaterial = data.myMaterials.find((m) => m.percent < 100) || data.myMaterials[0] || data.viewed[0];

  return (
    <>
      <TopBar title={t("dashboard.title")} />

      {/* Joyful Student Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-600 via-blue-600 to-sky-500 p-6 text-white shadow-xl shadow-navy-900/15 sm:p-7">
        {/* Playful vector ambient accents */}
        <div aria-hidden className="pointer-events-none absolute -end-8 -top-10 h-44 w-44 rounded-full bg-sun-400/20 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-12 start-1/3 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute end-8 top-6 hidden text-white/15 md:block">
          <Icon name="atom" className="h-24 w-24" />
        </div>

        <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-50 ring-1 ring-white/20 backdrop-blur-sm">
              <Icon name="sparkles" className="h-3.5 w-3.5 text-sun-400" />
              {locale === "ar" ? "الفصل الدراسي الأول 2026" : "Academic Term 2026"}
            </span>
            <h2 className="mt-2.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {locale === "ar"
                ? `مرحباً بعودتك، ${user.fullName.split(" ")[0]}`
                : `Welcome back, ${user.fullName.split(" ")[0]}!`}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-blue-50/95">
              {locale === "ar"
                ? "واصل تقدمك في المواد العلمية وأكمل مهامك لهذا الأسبوع."
                : "Keep up the momentum in your science courses and stay on top of your weekly tasks."}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 self-stretch sm:self-auto">
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sun-400 px-4 py-2.5 text-sm font-extrabold text-navy-900 shadow-md transition hover:bg-sun-500 active:scale-95"
            >
              <Icon name="clipboard" className="h-4 w-4" />
              {locale === "ar" ? "عرض المهام" : "My Tasks"}
            </Link>
            <Link
              href="/materials"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
            >
              <Icon name="flask" className="h-4 w-4" />
              {locale === "ar" ? "تصفح المواد" : "Browse"}
            </Link>
          </div>
        </div>
      </div>

      {/* Colorful Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label={t("dashboard.overview.active")}
          value={String(data.activeCount)}
          icon="clipboard"
          tone="bg-gradient-to-br from-sky-100 to-blue-100 text-sky-700 ring-1 ring-sky-200/80 dark:from-sky-500/20 dark:to-blue-500/15 dark:text-sky-300 dark:ring-sky-400/25"
        />
        <Stat
          label={t("dashboard.overview.done")}
          value={String(data.doneCount)}
          icon="tasks"
          tone="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 ring-1 ring-emerald-200/80 dark:from-emerald-500/20 dark:to-teal-500/15 dark:text-emerald-300 dark:ring-emerald-400/25"
        />
        <Stat
          label={t("dashboard.overview.materials")}
          value={String(data.myMaterials.length)}
          icon="book"
          tone="bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 ring-1 ring-violet-200/80 dark:from-violet-500/20 dark:to-purple-500/15 dark:text-violet-300 dark:ring-violet-400/25"
        />
        <Stat
          label={t("dashboard.overview.average")}
          value={data.overall == null ? "—" : `${data.overall}%`}
          badge={data.overall && data.overall >= 85 ? "A" : data.overall && data.overall >= 75 ? "B" : undefined}
          icon="trophy"
          tone="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 ring-1 ring-amber-200/80 dark:from-amber-500/20 dark:to-orange-500/15 dark:text-amber-300 dark:ring-amber-400/25"
        />
      </div>

      {/* Active Material Spotlight */}
      {activeMaterial && (
        <Card className="overflow-hidden border-2 border-blue-500/20 bg-gradient-to-br from-white via-sky-50/30 to-amber-50/30 p-5 dark:from-slate-900 dark:to-slate-800/80">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl shadow-xs">
                <MaterialThumb
                  url={activeMaterial.thumbnailUrl}
                  title={tr(locale, activeMaterial.title, activeMaterial.titleAr)}
                />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Icon name="sparkles" className="h-3.5 w-3.5" />
                  {locale === "ar" ? "متابعة الدراسة" : "Continue Learning"}
                </span>
                <h3 className="truncate text-lg font-extrabold text-slate-900 dark:text-white">
                  {tr(locale, activeMaterial.title, activeMaterial.titleAr)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeMaterial.completedLessons}/{activeMaterial.lessonCount} {t("common.lessons")} {t("materials.complete")}
                </p>
              </div>
            </div>

            <div className="flex w-full items-center justify-between gap-4 md:w-auto md:justify-end">
              <div className="hidden w-32 sm:block">
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>{t("materials.progress")}</span>
                  <span>{activeMaterial.percent}%</span>
                </div>
                <ProgressBar percent={activeMaterial.percent} />
              </div>
              <Link
                href={`/materials/${activeMaterial.slug}`}
                className="inline-flex items-center gap-2 rounded-xl bg-navy-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-navy-500/20 transition hover:bg-navy-600 active:scale-95"
              >
                <span>{locale === "ar" ? "متابعة الدرس" : "Resume Lesson"}</span>
                <ForwardArrow />
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Tasks */}
      <section className="space-y-3">
        <SectionTitle
          action={
            <Link href="/tasks" className="text-sm font-semibold text-navy-500 hover:underline dark:text-sky-300">
              {t("common.viewAll")} <ForwardArrow />
            </Link>
          }
        >
          {t("dashboard.tasks")}
        </SectionTitle>
        {data.upcoming.length === 0 ? (
          <EmptyState icon="sparkles" title={t("dashboard.noTasks")} />
        ) : (
          <div className="space-y-3">
            {data.upcoming.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="block">
                <Card className="relative p-5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                  <div className="absolute end-5 top-4 flex items-center gap-1.5">
                    {task.isPersonal && (
                      <Badge tone="personal">{locale === "ar" ? "مخصص لك" : "Personal"}</Badge>
                    )}
                    <Badge tone={task.overdue ? "overdue" : task.status}>
                      {task.overdue ? t("tasks.overdue") : t(`status.${task.status}`)}
                    </Badge>
                  </div>
                  <p className="pe-32 text-xl font-bold text-slate-900 dark:text-white">
                    {tr(locale, task.title, task.titleAr)}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <SubjectBadge icon={task.subject.icon} name={task.subject.name} size="xs" />
                    <span>{tr(locale, task.subject.name, task.subject.nameAr)}</span>
                    {task.hasQuiz && (
                      <Badge tone="todo">
                        <Icon name="quiz" className="h-3 w-3" />
                        {locale === "ar" ? "اختبار تفاعلي" : "Quiz"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {t("common.date")}{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {fmtDate(locale, task.dueDate)}
                    </span>
                  </p>
                  {task.status === "in_progress" && (
                    <ProgressBar percent={task.progress} className="mt-3 max-w-xs" />
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-navy-500 dark:text-sky-300">
                    <span className="inline-flex items-center gap-1">
                      {t("tasks.openDetails")} <ForwardArrow />
                    </span>
                    {task.attachmentName && (
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Icon name="file" className="h-3.5 w-3.5" />
                        {t("tasks.attachment")}
                      </span>
                    )}
                    {task.hasSubmission && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Icon name="check" className="h-3.5 w-3.5" />
                        {t("tasks.submitted")}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Materials */}
      <section className="space-y-3">
        <SectionTitle
          action={
            <Link href="/materials" className="text-sm font-semibold text-navy-500 hover:underline dark:text-sky-300">
              {t("common.viewAll")} <ForwardArrow />
            </Link>
          }
        >
          {t("dashboard.materials")}
        </SectionTitle>
        <SubHeading>{t("dashboard.lastViewed")}</SubHeading>
        <Card className="p-4">
          {data.viewed.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-slate-600 dark:text-slate-300">{t("dashboard.noViewed")}</p>
              <Link
                href="/materials"
                className="mt-4 inline-block rounded-lg bg-navy-500 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-600"
              >
                {t("dashboard.browse")}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {data.viewed.map((m) => {
                const title = tr(locale, m.title, m.titleAr);
                return (
                  <Link
                    key={m.id}
                    href={`/materials/${m.slug}`}
                    className="group overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md dark:ring-slate-700"
                  >
                    <div className="aspect-[2/1] overflow-hidden">
                      <MaterialThumb
                        url={m.thumbnailUrl}
                        title={title}
                        className="transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 font-semibold text-slate-900 dark:text-white">{title}</p>
                      <p className="text-xs text-slate-500">{tr(locale, m.subject.name, m.subject.nameAr)}</p>
                      {m.purchased ? (
                        <div className="mt-2 flex items-center gap-2">
                          <ProgressBar percent={m.percent} />
                          <span className="text-xs text-slate-500">{m.percent}%</span>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs font-semibold text-blue-600">
                          {t("materials.buy")} <ForwardArrow />
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
  badge,
}: {
  label: string;
  value: string;
  icon: IconName;
  tone: string;
  badge?: string;
}) {
  return (
    <Card className="flex items-center gap-3.5 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-extrabold leading-tight text-slate-900 dark:text-white">{value}</p>
          {badge && (
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {badge}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
