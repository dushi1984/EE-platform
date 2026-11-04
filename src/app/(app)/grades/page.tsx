import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { canAccessStudentPage, firstAllowedPath, getAccessPolicy } from "@/lib/access";
import { getGradeInsights, getGradesForUser } from "@/lib/queries";
import { TopBar } from "@/components/shell/TopBar";
import { Badge, Card, EmptyState, ProgressBar, SectionTitle, SubjectBadge } from "@/components/ui";
import { PageAccessNotice } from "@/components/PageAccessNotice";

export const metadata: Metadata = { title: "Grades" };

const kindTone = { quiz: "todo", exam: "in_progress", assignment: "done" } as const;

export default async function GradesPage() {
  const [user, policy, { t, locale }] = await Promise.all([
    getCurrentUser(),
    getAccessPolicy(),
    getI18n(),
  ]);
  if (!user) redirect("/login");
  if (user.role === "teacher") redirect("/dashboard");
  if (!canAccessStudentPage(user, "grades", policy)) {
    return (
      <>
        <TopBar title={t("grades.title")} />
        <PageAccessNotice locale={locale} backHref={firstAllowedPath(user, policy)} />
      </>
    );
  }
  const [data, insights] = await Promise.all([getGradesForUser(user.id), getGradeInsights(user.id)]);

  const kindLabel = (k: string) => (k === "exam" ? t("grades.type.exam") : k === "assignment" ? t("grades.type.assignment") : t("grades.type.quiz"));
  const colorFor = (p: number) => (p >= 85 ? "bg-green-500" : p >= 70 ? "bg-navy-500 dark:bg-sky-400" : p >= 50 ? "bg-yellow-500" : "bg-red-500");

  const pct = insights.overall ?? 0;
  const R = 70;
  const CIRC = 2 * Math.PI * R;
  const maxBucket = Math.max(1, ...insights.buckets);

  return (
    <>
      <TopBar title={t("grades.title")} />

      <SectionTitle center>{t("grades.insights")}</SectionTitle>

      {/* Student performance */}
      <Card className="overflow-hidden !rounded-3xl p-5 sm:p-6">
        <h2 className="border-b-2 border-slate-200 pb-2 text-lg font-bold text-slate-900 dark:border-slate-700 dark:text-white">
          <span className="border-b-2 border-navy-500 pb-2 dark:border-sky-400">{t("grades.performance")}</span>
        </h2>

        {insights.count === 0 ? (
          <EmptyState icon="grades" title={t("grades.empty")} />
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]">
            {/* Overall average donut */}
            <div className="flex flex-col items-center rounded-2xl bg-violet-600 px-6 py-7 text-white shadow-lg shadow-violet-500/25">
              <p className="text-lg font-bold">{t("grades.overall")}</p>
              <div className="relative mt-4">
                <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
                  <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="16" />
                  <circle
                    cx="90"
                    cy="90"
                    r={R}
                    fill="none"
                    stroke="#fff"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={CIRC - (CIRC * pct) / 100}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-4xl font-extrabold">{pct} %</p>
                    <p className="mt-1 text-sm text-violet-100">{t("grades.scoreOf", { score: insights.score, max: insights.max })}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Distribution + mini stats */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm text-slate-500">{t("grades.distribution")}</p>
                <div className="mt-3 flex h-36 items-end justify-between gap-1.5" dir="ltr">
                  {insights.buckets.map((count, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${i * 10}–${i * 10 + 10}%: ${count}`}>
                      <span className="text-[10px] font-semibold text-slate-400">{count > 0 ? count : ""}</span>
                      <div
                        className="w-full rounded-t bg-green-300 dark:bg-green-500/70"
                        style={{ height: `${Math.max(count > 0 ? 8 : 2, (count / maxBucket) * 100)}%` }}
                      />
                      <span className="text-[10px] text-slate-400">{(i + 1) * 10}</span>
                    </div>
                  ))}
                  <span className="pb-5 text-xs text-slate-400">{t("grades.gradeAxis")}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-sm leading-snug text-slate-500">{t("grades.incompleteTasks")}</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {insights.incomplete}
                    <span className="text-sm font-medium text-slate-500">{t("grades.ofTasks", { total: insights.totalTasks })}</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-sm leading-snug text-slate-500">{t("grades.quizzesAvg")}</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {insights.quizzesAvg ?? "—"}
                    {insights.quizzesAvg != null && <span className="text-lg">%</span>}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-sm leading-snug text-slate-500">{t("grades.examsAvg")}</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {insights.examsAvg ?? "—"}
                    {insights.examsAvg != null && <span className="text-lg">%</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {data.list.length > 0 && (
        <>
          <section className="space-y-3">
            <SectionTitle>{t("grades.bySubject")}</SectionTitle>
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.bySubject.map((s) => (
                <div key={s.subject.id} className="flex items-center gap-4 px-5 py-4">
                  <SubjectBadge icon={s.subject.icon} name={s.subject.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{tr(locale, s.subject.name, s.subject.nameAr)}</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.percent}%</p>
                    </div>
                    <ProgressBar percent={s.percent} className="mt-2" color={colorFor(s.percent)} />
                    <p className="mt-1 text-xs text-slate-500">
                      {s.score}/{s.max} · {s.count} {t("grades.assessments").toLowerCase()}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          </section>

          <section className="space-y-3">
            <SectionTitle>{t("grades.all")}</SectionTitle>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-slate-500 dark:text-slate-400">
                      <th className="px-5 py-3 text-start font-semibold">{t("grades.assessment")}</th>
                      <th className="px-4 py-3 text-start font-semibold">{t("grades.subject")}</th>
                      <th className="px-4 py-3 text-start font-semibold">{t("grades.type")}</th>
                      <th className="px-4 py-3 text-start font-semibold">{t("grades.score")}</th>
                      <th className="px-4 py-3 text-start font-semibold">{t("grades.date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.list.map((g) => {
                      const p = Math.round((g.score / g.maxScore) * 100);
                      return (
                        <tr key={g.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{tr(locale, g.title, g.titleAr)}</td>
                          <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                            <span className="inline-flex items-center gap-2">
                              <SubjectBadge icon={g.subject.icon} name={g.subject.name} size="xs" />
                              <span>{tr(locale, g.subject.name, g.subject.nameAr)}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge tone={kindTone[g.kind as keyof typeof kindTone] ?? "neutral"}>{kindLabel(g.kind)}</Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="w-14 font-semibold text-slate-900 dark:text-white">
                                {g.score}/{g.maxScore}
                              </span>
                              <ProgressBar percent={p} className="w-24" color={colorFor(p)} />
                              <span className="text-xs text-slate-500">{p}%</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-slate-600 dark:text-slate-300">{fmtDate(locale, g.gradedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </>
      )}
    </>
  );
}
