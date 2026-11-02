import Link from "next/link";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { taskTypeLabel, tt } from "@/lib/i18n-teacher";
import { getTaskSubmissionRows, getTeacherTasks } from "@/lib/queries-teacher";
import { toggleTaskStatusAction } from "@/lib/teacher-actions";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, Card, Icon } from "@/components/ui";
import { GradeInput } from "./GradeInput";
import { DownloadButton } from "@/components/TaskSubmissionForm";

export async function TeacherTasksView({ taskId, tab }: { taskId?: string; tab?: string }) {
  await requireTeacher();
  const { t, locale } = await getI18n();
  const c = tt(locale);
  const list = await getTeacherTasks();
  const selected = list.find((x) => String(x.id) === taskId) ?? list[0] ?? null;
  const detail = selected ? await getTaskSubmissionRows(selected.id) : null;
  const activeTab = tab === "toGrade" || tab === "late" ? tab : "graded";
  const rows = detail?.rows.filter((r) => (activeTab === "graded" ? r.isGraded : activeTab === "toGrade" ? r.isToGrade : r.isLate)) ?? [];
  const tabs = [
    { key: "graded", label: c.graded },
    { key: "toGrade", label: c.toGrade },
    { key: "late", label: c.late },
  ];

  return (
    <>
      <TopBar title={t("tasks.title")} />

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <th className="px-5 py-4 text-start font-semibold">{c.title}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.type}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.dueDate}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.submissions}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        {c.noTasks}
                      </td>
                    </tr>
                  )}
                  {list.map((row) => {
                    const on = selected?.id === row.id;
                    const href = `/tasks?task=${row.id}`;
                    const cell = "block px-3 py-4";
                    return (
                      <tr key={row.id} className={`border-t border-slate-100 transition dark:border-slate-800 ${on ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        <td>
                          <Link href={href} className="block px-5 py-4 font-bold text-slate-900 dark:text-white">
                            {tr(locale, row.title, row.titleAr)}
                          </Link>
                        </td>
                        <td>
                          <Link href={href} className={`${cell} font-bold text-navy-400 dark:text-sky-300`}>
                            {taskTypeLabel(locale, row.taskType)}
                            {row.termName && (
                              <span className="block text-[11px] font-semibold text-slate-400">
                                {locale === "ar" && row.termNameAr ? row.termNameAr : row.termName}
                              </span>
                            )}
                          </Link>
                        </td>
                        <td>
                          <Link href={href} className={`${cell} whitespace-nowrap text-slate-500`}>
                            {fmtDate(locale, row.dueDate)}
                          </Link>
                        </td>
                        <td>
                          <Link href={href} className={`${cell} text-slate-600 dark:text-slate-300`}>
                            {row.submitted}/{row.total}
                          </Link>
                        </td>
                        <td>
                          <Link href={href} className={cell}>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                row.status === "open" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                              }`}
                            >
                              {row.status === "open" ? c.open : c.closed}
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <Link href="/tasks/new" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
              <Icon name="assign" className="h-6 w-6" />
              {c.assignTask}
            </Link>
            <div className="flex items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-200" />
                {c.open}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-200" />
                {c.closed}
              </span>
            </div>
          </Card>
        </div>

        {/* Submissions panel */}
        <Card className="overflow-hidden">
          {!selected || !detail ? (
            <p className="p-6 text-center text-sm text-slate-500">{c.selectTask}</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 pt-3 dark:border-slate-700">
                <h2 className="max-w-[12rem] truncate border-b-2 border-navy-500 pb-2 text-sm font-bold text-slate-900 dark:text-white">
                  {tr(locale, selected.title, selected.titleAr)}
                </h2>
                <form action={toggleTaskStatusAction}>
                  <input type="hidden" name="taskId" value={selected.id} />
                  <button className="rounded-md px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800">
                    {selected.status === "open" ? c.closeTask : c.reopenTask}
                  </button>
                </form>
              </div>

              <div className="flex gap-2 px-4 py-3">
                {tabs.map((tb) => (
                  <Link
                    key={tb.key}
                    href={`/tasks?task=${selected.id}&tab=${tb.key}`}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${activeTab === tb.key ? "bg-blue-100 text-slate-900 dark:bg-blue-500/20 dark:text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                  >
                    {tb.label}
                  </Link>
                ))}
              </div>

              <div className="flex items-center justify-between bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 dark:bg-slate-800">
                <span>{c.studentName}</span>
                <span>{c.score}</span>
              </div>
              <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">{c.noSubmissionsHere}</li>}
                {rows.map((r) => (
                  <li key={r.user.id} className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={r.user.fullName} src={r.user.avatarUrl} size={34} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">{r.user.fullName.split(" ").slice(0, 2).join(" ")}</p>
                        {r.submittedAt ? (
                          <p className="text-[10px] text-slate-400">{fmtDate(locale, r.submittedAt)}{r.isLate ? ` · ${c.late}` : ""}</p>
                        ) : (
                          <p className="text-[10px] font-semibold text-red-500">{c.notSubmitted}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <GradeInput taskId={selected.id} userId={r.user.id} initial={r.score} max={detail.task.maxScore} />
                      {r.submissionId && (
                        <DownloadButton url={`/api/submissions/${r.submissionId}/download`} label="" compact />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
