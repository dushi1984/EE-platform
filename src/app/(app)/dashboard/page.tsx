import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { getDashboardData, getRecentTaskGrades } from "@/lib/queries";
import { TopBar } from "@/components/shell/TopBar";
import { Badge, Card, EmptyState, ProgressBar, SectionTitle, SubHeading } from "@/components/ui";
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

      {/* Student Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-600 via-navy-500 to-blue-700 p-6 text-white shadow-xl shadow-navy-900/10">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-100 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-sun-400 animate-pulse" />
              {locale === "ar" ? "الفصل الدراسي الأول 2026" : "Academic Term 2026"}
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              {locale === "ar" ? `مرحباً بعودتك، ${user.fullName.split(" ")[0]}` : `Welcome back, ${user.fullName.split(" ")[0]}!`}
            </h2>
            <p className="mt-1 text-sm text-blue-100/90 max-w-xl">
              {locale === "ar"
                ? "واصل تقدمك في المواد العلمية وأكمل مهامك لهذا الأسبوع."
                : "Keep up the momentum in your science courses and stay on top of your weekly tasks."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <Link
              href="/tasks"
              className="rounded-xl bg-sun-400 px-4 py-2.5 text-sm font-extrabold text-navy-800 shadow-md transition hover:bg-sun-500 active:scale-95"
            >
              {locale === "ar" ? "عرض المهام" : "My Tasks"}
            </Link>
            <Link
              href="/materials"
              className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
            >
              {locale === "ar" ? "تصفح المواد" : "Browse"}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label={t("dashboard.overview.active")} value={String(data.activeCount)} icon="📝" />
        <Stat label={t("dashboard.overview.done")} value={String(data.doneCount)} icon="✅" />
        <Stat label={t("dashboard.overview.materials")} value={String(data.myMaterials.length)} icon="📚" />
        <Stat
          label={t("dashboard.overview.average")}
          value={data.overall == null ? "—" : `${data.overall}%`}
          badge={data.overall && data.overall >= 85 ? "A" : data.overall && data.overall >= 75 ? "B" : undefined}
          icon="🏆"
        />
      </div>

      {/* Active Material Spotlight */}
      {activeMaterial && (
        <Card className="p-5 overflow-hidden border-2 border-blue-500/20 bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-900 dark:to-slate-800/80">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                <MaterialThumb
                  url={activeMaterial.thumbnailUrl}
                  title={tr(locale, activeMaterial.title, activeMaterial.titleAr)}
                />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
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

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <div className="w-32 hidden sm:block">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  <span>{t("materials.progress")}</span>
                  <span>{activeMaterial.percent}%</span>
                </div>
                <ProgressBar percent={activeMaterial.percent} />
              </div>
              <Link
                href={`/materials/${activeMaterial.slug}`}
                className="inline-flex items-center gap-2 rounded-xl bg-navy-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-navy-500/20 hover:bg-navy-600 transition active:scale-95"
              >
                <span>{locale === "ar" ? "متابعة الدرس" : "Resume Lesson"}</span>
                <span>→</span>
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
              {t("common.viewAll")} →
            </Link>
          }
        >
          {t("dashboard.tasks")}
        </SectionTitle>
        {data.upcoming.length === 0 ? (
          <EmptyState icon="🎉" title={t("dashboard.noTasks")} />
        ) : (
          <div className="space-y-3">
            {data.upcoming.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="block">
                <Card className="relative p-5 transition hover:shadow-md sm:p-6">
                  <div className="absolute end-5 top-4">
                    <Badge tone={task.overdue ? "overdue" : task.status}>
                      {task.overdue ? t("tasks.overdue") : t(`status.${task.status}`)}
                    </Badge>
                  </div>
                  <p className="pe-28 text-xl font-bold text-slate-900 dark:text-white">
                    {tr(locale, task.title, task.titleAr)}
                  </p>
                  <p className="mt-1 text-base text-slate-700 dark:text-slate-300">
                    {task.subject.icon} {tr(locale, task.subject.name, task.subject.nameAr)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t("common.date")}{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {fmtDate(locale, task.dueDate)}
                    </span>
                  </p>
                  {task.status === "in_progress" && (
                    <ProgressBar percent={task.progress} className="mt-3 max-w-xs" />
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs font-semibold text-navy-500 dark:text-sky-300">
                    <span>{t("tasks.openDetails")} →</span>
                    {task.attachmentName && <span>📎 {t("tasks.attachment")}</span>}
                    {task.hasSubmission && <span className="text-green-600">✓ {t("tasks.submitted")}</span>}
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
              {t("common.viewAll")} →
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
                    className="group overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:shadow-md dark:ring-slate-700"
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
                        <p className="mt-2 text-xs font-semibold text-blue-600">{t("materials.buy")} →</p>
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
  badge,
}: {
  label: string;
  value: string;
  icon: string;
  badge?: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-500/10 text-xl dark:bg-white/10">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold leading-tight text-slate-900 dark:text-white">{value}</p>
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
