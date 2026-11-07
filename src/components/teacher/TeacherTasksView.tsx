import Link from "next/link";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { gradeLabel, taskTypeLabel, tt } from "@/lib/i18n-teacher";
import { getTaskSubmissionRows, getTeacherTasks } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, Badge, Card, Icon, SubjectBadge } from "@/components/ui";
import { GradeInput } from "./GradeInput";
import {
  QuickCheckToggle,
  StudentTaskStatusSelect,
  TaskOpenStatusButton,
} from "./TeacherTaskReviewControls";
import { DownloadButton } from "@/components/TaskSubmissionForm";

export async function TeacherTasksView({ taskId, tab }: { taskId?: string; tab?: string }) {
  await requireTeacher();
  const { t, locale } = await getI18n();
  const c = tt(locale);
  const list = await getTeacherTasks();
  const selected = list.find((x) => String(x.id) === taskId) ?? list[0] ?? null;
  const detail = selected ? await getTaskSubmissionRows(selected.id) : null;

  const activeTab =
    tab === "toGrade" || tab === "graded" || tab === "late" ? tab : "all";
  const rows =
    detail?.rows.filter((r) =>
      activeTab === "graded"
        ? r.isGraded
        : activeTab === "toGrade"
          ? r.isToGrade
          : activeTab === "late"
            ? r.isLate
            : true,
    ) ?? [];

  const tabs = [
    { key: "all", label: locale === "ar" ? "الكل" : "All" },
    { key: "toGrade", label: c.toGrade },
    { key: "graded", label: c.graded },
    { key: "late", label: c.late },
  ];

  return (
    <>
      <TopBar title={t("tasks.title")} />

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_430px]">
        <div className="space-y-3">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <th className="px-5 py-4 text-start font-semibold">{c.title}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.type}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.dueDate}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.submissions}</th>
                    <th className="px-3 py-4 text-start font-semibold">{c.status}</th>
                    <th className="px-4 py-4 text-end font-semibold">
                      {locale === "ar" ? "معاينة وتصحيح" : "Preview"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        {c.noTasks}
                      </td>
                    </tr>
                  )}
                  {list.map((row) => {
                    const on = selected?.id === row.id;
                    const href = `/tasks?task=${row.id}`;
                    const cell = "block px-3 py-4";
                    const audienceText = row.targetStudentName
                      ? locale === "ar"
                        ? `خاص: ${row.targetStudentName}`
                        : `Student: ${row.targetStudentName}`
                      : row.targetClassName
                        ? locale === "ar"
                          ? row.targetClassNameAr || row.targetClassName
                          : row.targetClassName
                        : row.targetGrade === "all"
                          ? c.allStudents
                          : gradeLabel(locale, row.targetGrade);

                    return (
                      <tr
                        key={row.id}
                        className={`border-t border-slate-100 transition dark:border-slate-800 ${
                          on
                            ? "bg-blue-50 dark:bg-blue-500/10"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <td>
                          <Link href={href} className="block px-5 py-4 font-bold text-slate-900 dark:text-white">
                            <span className="inline-flex items-center gap-2">
                              <SubjectBadge icon={row.subject.icon} name={row.subject.name} size="xs" />
                              <span>{tr(locale, row.title, row.titleAr)}</span>
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge tone={row.targetStudentId ? "personal" : "todo"}>
                                {audienceText}
                              </Badge>
                              {row.hasQuiz && (
                                <Badge tone="in_progress">
                                  <Icon name="quiz" className="h-3 w-3" />
                                  {locale === "ar" ? "اختبار" : "Quiz"}
                                </Badge>
                              )}
                            </span>
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
                          <Link href={href} className={`${cell} font-semibold text-slate-600 dark:text-slate-300`}>
                            {row.submitted}/{row.total}
                          </Link>
                        </td>
                        <td className="px-3 py-4">
                          <TaskOpenStatusButton taskId={row.id} initialStatus={row.status} compact />
                        </td>
                        <td className="px-4 py-4 text-end">
                          <Link
                            href={`/tasks/${row.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-sky-500/15 dark:text-sky-300"
                          >
                            <Icon name="eye" className="h-3.5 w-3.5" />
                            {locale === "ar" ? "معاينة وتصحيح" : "Preview"}
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
            <div>
              <Link href="/tasks/new" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline dark:text-sky-400">
                <Icon name="assign" className="h-5 w-5" />
                {locale === "ar"
                  ? "إسناد مهمة لفصل أو لكل الطلاب"
                  : "Assign Task to Classes or All Students"}
              </Link>
              <p className="mt-0.5 text-xs text-slate-500">
                {locale === "ar"
                  ? "لإسناد مهمة لطالب محدد فقط، افتح ملفه الشخصي من صفحة الطلاب."
                  : "To assign to a specific student, open their profile in Students."}
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                {c.open}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                {c.closed}
              </span>
            </div>
          </Card>
        </div>

        {/* Selected Task Preview, Status & Manual Correction Panel */}
        <Card className="overflow-hidden">
          {!selected || !detail ? (
            <p className="p-6 text-center text-sm text-slate-500">{c.selectTask}</p>
          ) : (
            <>
              <div className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-extrabold text-slate-900 dark:text-white">
                      {tr(locale, selected.title, selected.titleAr)}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {taskTypeLabel(locale, selected.taskType)} · {locale === "ar" ? "الدرجة:" : "Max:"}{" "}
                      {selected.maxScore}
                    </p>
                  </div>
                  <TaskOpenStatusButton taskId={selected.id} initialStatus={selected.status} compact />
                </div>

                {/* Task Preview Snippet */}
                {selected.description && (
                  <p className="line-clamp-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {tr(locale, selected.description, selected.descriptionAr)}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {(selected.attachmentName || selected.attachmentUrl) ? (
                    <DownloadButton
                      url={`/api/tasks/${selected.id}/attachment`}
                      label={selected.attachmentName || (locale === "ar" ? "مرفق المهمة" : "Attachment")}
                      compact
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      {selected.hasQuiz
                        ? locale === "ar"
                          ? "تحتوي على أسئلة اختبار تفاعلية"
                          : "Includes interactive quiz questions"
                        : ""}
                    </span>
                  )}

                  <Link
                    href={`/tasks/${selected.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-navy-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-600"
                  >
                    <Icon name="eye" className="h-3.5 w-3.5" />
                    {locale === "ar" ? "معاينة المهمة والتصحيح الكامل" : "Full Preview & Manual Correct"}
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 px-4 py-3">
                {tabs.map((tb) => (
                  <Link
                    key={tb.key}
                    href={`/tasks?task=${selected.id}&tab=${tb.key}`}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      activeTab === tb.key
                        ? "bg-blue-100 text-slate-900 dark:bg-blue-500/20 dark:text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {tb.label}
                  </Link>
                ))}
              </div>

              <div className="flex items-center justify-between bg-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-500 dark:bg-slate-800">
                <span>{c.studentName}</span>
                <span>{locale === "ar" ? "الحالة · المراجعة · الدرجة" : "Status · Check · Score"}</span>
              </div>

              <ul className="max-h-[540px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {rows.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-slate-500">{c.noSubmissionsHere}</li>
                )}
                {rows.map((r) => (
                  <li key={r.user.id} className="space-y-2.5 px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/tasks/${selected.id}?student=${r.user.id}`}
                        className="flex min-w-0 items-center gap-2.5 group"
                      >
                        <Avatar name={r.user.fullName} src={r.user.avatarUrl} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold leading-tight text-slate-800 group-hover:text-blue-600 group-hover:underline dark:text-slate-100">
                            {r.user.fullName.split(" ").slice(0, 2).join(" ")}
                          </p>
                          {r.submittedAt ? (
                            <p className="text-[10px] text-slate-400">
                              {fmtDate(locale, r.submittedAt)}
                              {r.isLate ? ` · ${c.late}` : ""}
                            </p>
                          ) : (
                            <p className="text-[10px] font-semibold text-rose-500">{c.notSubmitted}</p>
                          )}
                        </div>
                      </Link>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {r.submissionId && (
                          <DownloadButton
                            url={`/api/submissions/${r.submissionId}/download`}
                            label=""
                            compact
                          />
                        )}
                        <Link
                          href={`/tasks/${selected.id}?student=${r.user.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-sky-500/15 dark:text-sky-300"
                          title={locale === "ar" ? "معاينة وتصحيح يدوي" : "Preview & manual correction"}
                        >
                          <Icon name="eye" className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>

                    {r.note && (
                      <p className="line-clamp-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                        {r.note}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <StudentTaskStatusSelect
                          taskId={selected.id}
                          userId={r.user.id}
                          initialStatus={r.studentStatus}
                          compact
                        />
                        <QuickCheckToggle
                          taskId={selected.id}
                          userId={r.user.id}
                          initialChecked={r.isChecked}
                          compact
                        />
                      </div>
                      <GradeInput
                        taskId={selected.id}
                        userId={r.user.id}
                        initial={r.score}
                        max={detail.task.maxScore}
                      />
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
