import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { gradeLabel, taskTypeLabel, tt } from "@/lib/i18n-teacher";
import { getTaskSubmissionRows } from "@/lib/queries-teacher";
import { parseGoogleDriveUrl } from "@/lib/storage";
import { TopBar } from "@/components/shell/TopBar";
import {
  Avatar,
  BackArrow,
  Badge,
  Card,
  CrumbSep,
  Icon,
  SectionTitle,
  SubjectBadge,
} from "@/components/ui";
import { GradeInput } from "./GradeInput";
import {
  QuickCheckToggle,
  StudentTaskReviewCard,
  StudentTaskStatusSelect,
  TaskOpenStatusButton,
} from "./TeacherTaskReviewControls";
import { DownloadButton } from "@/components/TaskSubmissionForm";

export async function TeacherTaskPreviewView({
  taskId,
  focusStudentId,
  tab,
}: {
  taskId: number;
  focusStudentId?: number | null;
  tab?: string;
}) {
  await requireTeacher();
  const { locale } = await getI18n();
  const c = tt(locale);
  const detail = await getTaskSubmissionRows(taskId);
  if (!detail) notFound();

  const { task, rows } = detail;
  const title = tr(locale, task.title, task.titleAr);
  const driveAttachment = parseGoogleDriveUrl(task.attachmentUrl);
  const hasQuiz = Array.isArray(task.quizQuestions) && task.quizQuestions.length > 0;

  const focusedRow = focusStudentId
    ? rows.find((r) => r.user.id === focusStudentId) ?? null
    : rows.length === 1 && task.targetStudentId
      ? rows[0]
      : null;

  const activeTab =
    tab === "toGrade" || tab === "checked" || tab === "graded" || tab === "late"
      ? tab
      : "all";

  const filteredRows = rows.filter((r) => {
    if (activeTab === "toGrade") return r.isToGrade;
    if (activeTab === "checked") return r.isChecked;
    if (activeTab === "graded") return r.isGraded;
    if (activeTab === "late") return r.isLate;
    return true;
  });

  const audienceLabel = task.targetStudent
    ? locale === "ar"
      ? `طالب محدد: ${task.targetStudent.fullName}`
      : `Personal: ${task.targetStudent.fullName}`
    : task.targetClass
      ? locale === "ar"
        ? `فصل: ${task.targetClass.nameAr || task.targetClass.name} (${task.targetClass.level.nameAr})`
        : `Class: ${task.targetClass.name} (${task.targetClass.level.name})`
      : task.targetGrade === "all"
        ? c.allStudents
        : gradeLabel(locale, task.targetGrade);

  const tabs = [
    { key: "all", label: `${locale === "ar" ? "الكل" : "All"} (${rows.length})` },
    { key: "toGrade", label: `${c.toGrade} (${rows.filter((r) => r.isToGrade).length})` },
    {
      key: "checked",
      label: `${locale === "ar" ? "تمت مراجعتها" : "Checked"} (${rows.filter((r) => r.isChecked).length})`,
    },
    { key: "graded", label: `${c.graded} (${rows.filter((r) => r.isGraded).length})` },
    { key: "late", label: `${c.late} (${rows.filter((r) => r.isLate).length})` },
  ];

  return (
    <>
      <TopBar title={locale === "ar" ? "معاينة وتصحيح المهمة" : "Task Preview & Manual Correction"} />

      <SectionTitle
        action={
          <div className="flex flex-wrap items-center gap-2">
            {focusStudentId ? (
              <Link
                href={`/students/${focusStudentId}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <BackArrow />
                {locale === "ar" ? "العودة لملف الطالب" : "Back to Student Profile"}
              </Link>
            ) : (
              <Link
                href={`/tasks?task=${task.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <BackArrow /> {c.backToTasks}
              </Link>
            )}
            <TaskOpenStatusButton taskId={task.id} initialStatus={task.status} />
          </div>
        }
      >
        <span className="inline-flex flex-wrap items-center gap-2">
          <Link href={`/tasks?task=${task.id}`} className="font-medium text-blue-600 hover:underline dark:text-sky-400">
            {locale === "ar" ? "المهام" : "Tasks"}
          </Link>
          <CrumbSep />
          <span>{title}</span>
        </span>
      </SectionTitle>

      {/* 1. Full Teacher Preview of Assigned Task */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50/60 px-5 py-4 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <SubjectBadge icon={task.subject.icon} name={task.subject.name} size="md" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">{title}</h1>
                <Badge tone={task.targetStudentId ? "personal" : "todo"}>{audienceLabel}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                {tr(locale, task.subject.name, task.subject.nameAr)} · {taskTypeLabel(locale, task.taskType)} ·{" "}
                {locale === "ar" ? "الدرجة العظمى:" : "Max Score:"} {task.maxScore} ·{" "}
                {locale === "ar" ? "موعد التسليم:" : "Due:"} {fmtDate(locale, task.dueDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="rounded-xl bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
              {c.submissions}: {rows.filter((r) => r.isSubmitted).length}/{rows.length}
            </span>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              {locale === "ar" ? "تعليمات ووصف المهمة كما تظهر للطالب" : "Student-Facing Instructions & Description"}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {tr(locale, task.description, task.descriptionAr) ||
                (locale === "ar" ? "لا يوجد وصف مضاف لهذه المهمة." : "No description provided for this task.")}
            </p>
          </div>

          {/* Attachment Preview */}
          {(task.attachmentName || task.attachmentUrl) && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-navy-600 shadow-xs dark:bg-slate-900 dark:text-sky-300">
                    <Icon name={driveAttachment ? "drive" : "file"} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {task.attachmentName || "Task Attachment"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {driveAttachment
                        ? "Google Drive"
                        : task.attachmentStoragePath
                          ? "Supabase Cloud (files)"
                          : locale === "ar"
                            ? "مرفق المهمة"
                            : "Task Resource"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {driveAttachment ? (
                    <a
                      href={driveAttachment.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-600"
                    >
                      <Icon name="drive" className="h-4 w-4" />
                      {locale === "ar" ? "فتح في Google Drive" : "Open in Drive"}
                    </a>
                  ) : (
                    <DownloadButton
                      url={`/api/tasks/${task.id}/attachment`}
                      label={locale === "ar" ? "تنزيل المرفق" : "Download Attachment"}
                    />
                  )}
                </div>
              </div>

              {driveAttachment && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700">
                  <iframe
                    src={driveAttachment.previewUrl}
                    title={task.attachmentName || title}
                    className="h-[340px] w-full"
                    allow="autoplay"
                  />
                </div>
              )}
            </div>
          )}

          {/* Quiz Questions + Teacher Answer Key Preview */}
          {hasQuiz && task.quizQuestions && (
            <div className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-600 text-white">
                  <Icon name="quiz" className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {locale === "ar"
                    ? `معاينة أسئلة الاختبار ومفتاح الإجابة (${task.quizQuestions.length} أسئلة)`
                    : `Interactive Quiz Preview & Answer Key (${task.quizQuestions.length} questions)`}
                </h2>
              </div>
              <ol className="space-y-3">
                {task.quizQuestions.map((q, idx) => (
                  <li
                    key={q.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">
                      {idx + 1}. {q.question}
                    </p>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt, optIdx) => {
                        const correct = optIdx === q.correctIndex;
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                              correct
                                ? "border-emerald-400 bg-emerald-50 font-bold text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-200"
                                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            <span>{opt}</span>
                            {correct && <Icon name="check" className="h-4 w-4 text-emerald-600" />}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <p className="mt-2 text-xs text-slate-500">
                        {locale === "ar" ? "التفسير:" : "Explanation:"} {q.explanation}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </Card>

      {/* 2. Focused Student Manual Correction Card (when opened from Student Profile or ?student=<id>) */}
      {focusedRow && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
              <Avatar name={focusedRow.user.fullName} src={focusedRow.user.avatarUrl} size={32} />
              <span>
                {locale === "ar"
                  ? `التصحيح اليدوي والمراجعة للطالب: ${focusedRow.user.fullName}`
                  : `Manual Check & Correction: ${focusedRow.user.fullName}`}
              </span>
            </h2>
            <Link
              href={`/students/${focusedRow.user.id}`}
              className="text-xs font-bold text-blue-600 hover:underline dark:text-sky-400"
            >
              {locale === "ar" ? "فتح الملف الشخصي للطالب" : "Open Student Profile"}
            </Link>
          </div>
          <StudentTaskReviewCard
            defaultExpanded
            showFullPageLink={false}
            item={{
              task: {
                id: task.id,
                title: task.title,
                titleAr: task.titleAr,
                description: task.description,
                descriptionAr: task.descriptionAr,
                taskType: task.taskType,
                status: task.status,
                maxScore: task.maxScore,
                dueDate: task.dueDate,
                attachmentName: task.attachmentName,
                attachmentUrl: task.attachmentUrl,
                quizQuestions: task.quizQuestions ?? null,
                subject: task.subject,
              },
              userId: focusedRow.user.id,
              studentName: focusedRow.user.fullName,
              isPersonal: task.targetStudentId === focusedRow.user.id,
              studentStatus: focusedRow.studentStatus,
              submission: focusedRow.submissionId
                ? {
                    id: focusedRow.submissionId,
                    fileName: focusedRow.fileName || "submission",
                    fileUrl: focusedRow.fileUrl,
                    note: focusedRow.note,
                    teacherFeedback: focusedRow.teacherFeedback,
                    checkedAt: focusedRow.checkedAt,
                    quizAnswers: focusedRow.quizAnswers,
                    submittedAt: focusedRow.submittedAt!,
                    score: focusedRow.score,
                    gradedAt: focusedRow.gradedAt,
                  }
                : null,
            }}
          />
        </section>
      )}

      {/* 3. All Assigned Students — Status, Check & Manual Correction Table */}
      {rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {locale === "ar"
                ? "إجابات الطلاب وحالات التنفيذ والتصحيح اليدوي"
                : "Assigned Students — Submissions, Status & Manual Grading"}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {tabs.map((tb) => (
                <Link
                  key={tb.key}
                  href={`/tasks/${task.id}?tab=${tb.key}${focusStudentId ? `&student=${focusStudentId}` : ""}`}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    activeTab === tb.key
                      ? "bg-navy-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {tb.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <th className="px-5 py-3 text-start font-bold">{c.studentName}</th>
                  <th className="px-3 py-3 text-start font-bold">
                    {locale === "ar" ? "تسليم الطالب / الملاحظات" : "Submission / Answer"}
                  </th>
                  <th className="px-3 py-3 text-start font-bold">{c.status}</th>
                  <th className="px-3 py-3 text-start font-bold">
                    {locale === "ar" ? "المراجعة" : "Check"}
                  </th>
                  <th className="px-3 py-3 text-start font-bold">{c.score}</th>
                  <th className="px-5 py-3 text-end font-bold">
                    {locale === "ar" ? "تصحيح تفصيلي" : "Inspect"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                      {c.noSubmissionsHere}
                    </td>
                  </tr>
                )}
                {filteredRows.map((r) => {
                  const isFocused = focusStudentId === r.user.id;
                  return (
                    <tr
                      key={r.user.id}
                      className={
                        isFocused
                          ? "bg-blue-50/70 dark:bg-sky-500/10"
                          : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      }
                    >
                      <td className="px-5 py-3.5">
                        <Link href={`/students/${r.user.id}`} className="flex items-center gap-2.5 group">
                          <Avatar name={r.user.fullName} src={r.user.avatarUrl} size={34} />
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-blue-600 group-hover:underline dark:text-white">
                              {r.user.fullName}
                            </p>
                            <p className="text-[11px] text-slate-500" dir="ltr">
                              #{r.user.studentCode} · {gradeLabel(locale, r.user.grade)}
                            </p>
                          </div>
                        </Link>
                      </td>

                      <td className="max-w-[260px] px-3 py-3.5">
                        {r.submissionId ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {r.fileName}
                              </span>
                              <DownloadButton url={`/api/submissions/${r.submissionId}/download`} label="" compact />
                            </div>
                            {r.note && (
                              <p className="line-clamp-2 text-xs text-slate-500">{r.note}</p>
                            )}
                            {r.teacherFeedback && (
                              <p className="line-clamp-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                {locale === "ar" ? "ملاحظة المعلم:" : "Feedback:"} {r.teacherFeedback}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-rose-500">{c.notSubmitted}</span>
                        )}
                      </td>

                      <td className="px-3 py-3.5">
                        <StudentTaskStatusSelect
                          taskId={task.id}
                          userId={r.user.id}
                          initialStatus={r.studentStatus}
                          compact
                        />
                      </td>

                      <td className="px-3 py-3.5">
                        <QuickCheckToggle
                          taskId={task.id}
                          userId={r.user.id}
                          initialChecked={r.isChecked}
                          compact
                        />
                      </td>

                      <td className="px-3 py-3.5">
                        <GradeInput
                          taskId={task.id}
                          userId={r.user.id}
                          initial={r.score}
                          max={task.maxScore}
                        />
                      </td>

                      <td className="px-5 py-3.5 text-end">
                        <Link
                          href={`/tasks/${task.id}?student=${r.user.id}&tab=${activeTab}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-sky-500/15 dark:text-sky-300"
                        >
                          <Icon name="eye" className="h-3.5 w-3.5" />
                          {locale === "ar" ? "معاينة وتصحيح" : "Preview & Correct"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
