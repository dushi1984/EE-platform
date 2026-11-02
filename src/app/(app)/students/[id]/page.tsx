import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { taskTypeLabel, tt } from "@/lib/i18n-teacher";
import { getStudentDetail, getStudentTrend } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, Badge, Card, Icon, ProgressBar, SectionTitle } from "@/components/ui";
import { StatusPill } from "@/components/teacher/StatusPill";
import { TrendChart } from "@/components/teacher/TrendChart";

export const metadata: Metadata = { title: "Student Profile" };

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const { locale } = await getI18n();
  const c = tt(locale);
  const detail = await getStudentDetail(Number(id));
  if (!detail) notFound();
  const { student, fullUser } = detail;
  const trend = await getStudentTrend(student.id);
  const months = trend.map((p) => new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { month: "short" }).format(p.date));

  return (
    <>
      <TopBar title={c.navStudents} />
      <SectionTitle
        action={
          <Link href="/students" className="text-sm font-bold text-blue-600 hover:underline">
            ← {c.backToStudents}
          </Link>
        }
      >
        {c.studentProfile}
      </SectionTitle>

      <div className="grid items-start gap-5 lg:grid-cols-[300px_1fr]">
        <Card className="p-6 text-center">
          <Avatar name={student.fullName} src={student.avatarUrl} size={120} className="mx-auto" />
          <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">{student.fullName}</h1>
          <p className="text-sm text-slate-500">{student.grade} · {student.studentCode}</p>
          <div className="mt-3"><StatusPill status={student.status} locale={locale} /></div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              [student.avgGrade ?? "—", c.avgGrades],
              [student.doneTasks, c.tasksDone],
              [student.openTasks, c.openTasks],
            ].map(([v, l]) => (
              <div key={String(l)} className="rounded-xl bg-slate-100 px-1 py-3 dark:bg-slate-800">
                <p className="text-xl font-extrabold text-slate-900 dark:text-white">{v}</p>
                <p className="text-[10px] font-semibold leading-tight text-slate-500">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            <Link href={`/students/${student.id}/message`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">
              <Icon name="mail" className="h-5 w-5" /> {c.message}
            </Link>
            <Link href={`/tasks/new?student=${student.id}`} className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:hover:bg-blue-500/10">
              <Icon name="assign" className="h-5 w-5" /> {c.assignTask}
            </Link>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.contactInfo}</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Info label="Email" value={fullUser.email || "—"} />
              <Info label={locale === "ar" ? "رقم الهاتف" : "Phone"} value={fullUser.phone || "—"} />
              <Info label={c.dateOfBirth} value={fullUser.dateOfBirth ? fmtDate(locale, fullUser.dateOfBirth) : "—"} />
              <Info label={c.parentName} value={fullUser.parentName || "—"} />
              <Info label={c.parentPhone} value={fullUser.parentPhone || "—"} />
              <Info label={c.lastLogin} value={fullUser.lastLoginAt ? fmtDate(locale, fullUser.lastLoginAt) : c.never} />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.academicSummary}</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_240px]">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{c.taskProgress}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{student.progressPct}%</span>
                </div>
                <ProgressBar percent={student.progressPct} className="mt-2 !h-3" />
                <p className="mt-2 text-xs text-slate-500">{student.doneTasks}/{student.totalTasks} {c.tasksDone}</p>
              </div>
              <div>
                <TrendChart points={trend.map((p) => p.pct)} labels={months} empty={c.noTrend} />
              </div>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-slate-900 dark:border-slate-700 dark:text-white">{c.recentGrades}</h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {detail.recentGrades.length === 0 && <li className="p-6 text-center text-sm text-slate-500">{c.noRecentGrades}</li>}
                {detail.recentGrades.map((g) => {
                  const pct = Math.round((g.score / g.maxScore) * 100);
                  return (
                    <li key={g.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="text-xl">{g.subject.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{tr(locale, g.title, g.titleAr)}</p>
                        <p className="text-xs text-slate-500">{fmtDate(locale, g.gradedAt)}</p>
                      </div>
                      <span className={`font-extrabold ${pct >= 70 ? "text-green-600" : "text-red-500"}`}>{pct}%</span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card className="overflow-hidden">
              <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-slate-900 dark:border-slate-700 dark:text-white">{c.recentTasks}</h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {detail.recentTasks.length === 0 && <li className="p-6 text-center text-sm text-slate-500">{c.noRecentTasks}</li>}
                {detail.recentTasks.map(({ task, progress, submission }) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{tr(locale, task.title, task.titleAr)}</p>
                      <p className="text-xs text-slate-500">{taskTypeLabel(locale, task.taskType)} · {fmtDate(locale, task.dueDate)}</p>
                    </div>
                    <Badge tone={submission?.score !== null && submission?.score !== undefined ? "done" : progress?.status === "done" ? "in_progress" : "todo"}>
                      {submission?.score !== null && submission?.score !== undefined ? `${submission.score}/${task.maxScore}` : progress?.status ?? "todo"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-all font-semibold text-slate-900 dark:text-white" dir="auto">{value}</dd>
    </div>
  );
}
