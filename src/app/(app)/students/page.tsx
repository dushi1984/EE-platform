import Link from "next/link";
import type { Metadata } from "next";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fill, timeAgo, tt } from "@/lib/i18n-teacher";
import { getStudentRows, getStudentTrend } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, Card, ForwardArrow, Icon, ProgressBar } from "@/components/ui";
import { StatusPill } from "@/components/teacher/StatusPill";
import { TrendChart } from "@/components/teacher/TrendChart";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireTeacher();
  const { s } = await searchParams;
  const { locale } = await getI18n();
  const c = tt(locale);
  const rows = await getStudentRows();
  const selected = rows.find((r) => String(r.id) === s) ?? rows[0] ?? null;
  const trend = selected ? await getStudentTrend(selected.id) : [];
  const months = trend.map((p) => new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { month: "short" }).format(p.date));
  const known = trend.map((p) => p.pct).filter((p): p is number => p !== null);
  const latest = known.length ? known[known.length - 1] : null;
  const delta = known.length > 1 ? known[known.length - 1] - known[known.length - 2] : null;

  return (
    <>
      <TopBar title={c.navStudents} />

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link
              href="/students/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 active:scale-95"
            >
              <Icon name="plus" className="h-5 w-5" />
              {c.addStudent}
            </Link>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <th className="w-12 px-4 py-4" />
                    <th className="px-2 py-4 text-start font-semibold">{c.studentName}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.avgGrades}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.openTasks}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.lastActivity}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.status}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                        {c.noStudents}
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => {
                    const on = selected?.id === r.id;
                    const href = `/students?s=${r.id}`;
                    return (
                      <tr key={r.id} className={`border-t border-slate-100 transition dark:border-slate-800 ${on ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        <td className="px-4 py-3">
                          <Link href={href} aria-label={r.fullName} className={`grid h-5 w-5 place-items-center rounded border-2 ${on ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : "border-slate-400"}`}>
                            {on && <Icon name="check" className="h-3.5 w-3.5" />}
                          </Link>
                        </td>
                        <td className="px-2 py-3">
                          <Link href={href} className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-100">
                            <Avatar name={r.fullName} src={r.avatarUrl} size={38} />
                            <span className="max-w-[9rem] leading-tight">{r.fullName.split(" ").slice(0, 2).join(" ")}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          {r.avgGrade === null ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div className="w-28">
                              <span className="text-sm font-bold text-navy-400 dark:text-sky-300">{r.avgGrade}%</span>
                              <ProgressBar percent={r.avgGrade} className="mt-1 !h-1.5" />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">{r.openTasks}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-500">{r.lastActivity ? timeAgo(locale, r.lastActivity) : c.never}</td>
                        <td className="px-3 py-3">
                          <StatusPill status={r.status} locale={locale} />
                        </td>
                        <td className="px-3 py-3">
                          <Link href={`/students/${r.id}`} className="font-semibold text-slate-500 underline hover:text-blue-600">
                            {c.view}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="flex flex-wrap items-center gap-5 text-sm font-bold">
              <span className="text-slate-500">{fill(c.studentsSelected, { n: selected ? 1 : 0 })}</span>
              <Link href={selected ? `/students/${selected.id}/message` : "/students"} className="inline-flex items-center gap-2 text-blue-600 hover:underline">
                <Icon name="mail" className="h-6 w-6" />
                {c.message}
              </Link>
              <Link href={selected ? `/tasks/new?student=${selected.id}` : "/tasks/new"} className="inline-flex items-center gap-2 text-blue-600 hover:underline">
                <Icon name="assign" className="h-6 w-6" />
                {c.assignTask}
              </Link>
            </div>
            <div className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-yellow-200" />{c.idle}</p>
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-200" />{c.active}</p>
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-200" />{c.inactive}</p>
            </div>
          </Card>
        </div>

        {/* Overview */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 px-4 pt-3 dark:border-slate-700">
            <h2 className="inline-block border-b-2 border-navy-500 pb-1.5 text-sm font-bold text-slate-900 dark:text-white">{c.overview}</h2>
          </div>
          {selected ? (
            <div className="p-4">
              <div className="flex flex-col items-center text-center">
                <Avatar name={selected.fullName} src={selected.avatarUrl} size={104} className="bg-slate-100" />
                <p className="mt-3 font-bold text-slate-900 dark:text-white">{selected.fullName}</p>
                <p className="text-sm text-slate-500">
                  {c.student} · {selected.grade}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  [selected.avgGrade ?? "—", c.avgGrades],
                  [selected.doneTasks, c.tasksDone],
                  [selected.openTasks, c.openTasks],
                ].map(([v, l]) => (
                  <div key={String(l)} className="rounded-xl bg-slate-100 px-1 py-3 dark:bg-slate-800">
                    <p className="text-xl font-extrabold text-slate-900 dark:text-white">{v}</p>
                    <p className="text-[10px] font-semibold leading-tight text-slate-500">{l}</p>
                  </div>
                ))}
              </div>
              <h3 className="mt-5 text-sm font-bold text-slate-900 dark:text-white">{c.gradeTrend}</h3>
              <div className="mt-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{latest ?? "—"}</p>
                    <p className="text-[10px] text-slate-400">{c.last6Months}</p>
                  </div>
                  {delta !== null && (
                    <span className={`text-xs font-bold ${delta >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {delta >= 0 ? "↗ +" : "↘ "}
                      {delta}%
                    </span>
                  )}
                </div>
                <TrendChart points={trend.map((p) => p.pct)} labels={months} empty={c.noTrend} />
              </div>
              <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Link
                  href={`/students/${selected.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-navy-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-600"
                >
                  {c.studentProfile} <ForwardArrow />
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/students/${selected.id}/message`}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300"
                  >
                    <Icon name="mail" className="h-4 w-4" />
                    {c.message}
                  </Link>
                  <Link
                    href={`/tasks/new?student=${selected.id}`}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Icon name="assign" className="h-4 w-4" />
                    {c.assignTask}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">{c.noStudents}</p>
          )}
        </Card>
      </div>
    </>
  );
}
