"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";
import { fmtDate, tr } from "@/lib/i18n";
import { taskTypeLabel, tt } from "@/lib/i18n-teacher";
import { getClientSessionToken } from "@/lib/file-client";
import type { TaskQuizQuestion } from "@/db/schema";
import {
  reviewStudentTaskAction,
  setStudentTaskStatusAction,
  setTaskOpenStatusAction,
  toggleSubmissionCheckedAction,
} from "@/lib/teacher-actions";
import { Badge, Icon, SubjectBadge } from "@/components/ui";
import { DownloadButton } from "@/components/TaskSubmissionForm";
import { reloadWithSession } from "@/components/shell/Shell";

function withSessionQuery(url: string): string {
  const tok = getClientSessionToken();
  if (!tok) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}session=${encodeURIComponent(tok)}`;
}

/* ---------- Task Open / Closed Status Button ---------- */

export function TaskOpenStatusButton({
  taskId,
  initialStatus,
  compact = false,
}: {
  taskId: number;
  initialStatus: string;
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const c = tt(locale);
  const [status, setStatus] = useState<"open" | "closed">(
    initialStatus === "closed" ? "closed" : "open",
  );
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = status === "open" ? "closed" : "open";
    setStatus(next);
    startTransition(async () => {
      await setTaskOpenStatusAction(taskId, next);
      reloadWithSession();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={
        status === "open"
          ? locale === "ar"
            ? "إغلاق استلام الإجابات"
            : "Click to close task submissions"
          : locale === "ar"
            ? "إعادة فتح المهمة"
            : "Click to reopen task"
      }
      className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition disabled:opacity-60 ${
        compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-xs"
      } ${
        status === "open"
          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300"
          : "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          status === "open" ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />
      <span>
        {status === "open" ? c.open : c.closed}
        {!compact && (
          <span className="ms-1 opacity-75">
            · {status === "open" ? c.closeTask : c.reopenTask}
          </span>
        )}
      </span>
    </button>
  );
}

/* ---------- Per-Student Task Status Select (todo / in_progress / done) ---------- */

export function StudentTaskStatusSelect({
  taskId,
  userId,
  initialStatus,
  compact = false,
}: {
  taskId: number;
  userId: number;
  initialStatus: "todo" | "in_progress" | "done";
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const [status, setStatus] = useState<"todo" | "in_progress" | "done">(initialStatus);
  const [pending, startTransition] = useTransition();

  const onChange = (next: "todo" | "in_progress" | "done") => {
    setStatus(next);
    startTransition(async () => {
      await setStudentTaskStatusAction(taskId, userId, next);
      reloadWithSession();
    });
  };

  const toneClass =
    status === "done"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200"
      : status === "in_progress"
        ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200"
        : "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

  return (
    <select
      aria-label={locale === "ar" ? "حالة المهمة للطالب" : "Student task status"}
      value={status}
      disabled={pending}
      onChange={(e) => onChange(e.target.value as "todo" | "in_progress" | "done")}
      className={`rounded-lg border font-bold outline-none transition focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 ${
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
      } ${toneClass}`}
    >
      <option value="todo">{locale === "ar" ? "لم تبدأ (To Do)" : "To Do"}</option>
      <option value="in_progress">{locale === "ar" ? "قيد التنفيذ" : "In Progress"}</option>
      <option value="done">{locale === "ar" ? "مكتملة (Done)" : "Done"}</option>
    </select>
  );
}

/* ---------- Quick One-Click Check / Verify Button ---------- */

export function QuickCheckToggle({
  taskId,
  userId,
  initialChecked,
  compact = false,
}: {
  taskId: number;
  userId: number;
  initialChecked: boolean;
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const [checked, setChecked] = useState(initialChecked);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      await toggleSubmissionCheckedAction(taskId, userId, next);
      reloadWithSession();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-1 rounded-lg border font-bold transition disabled:opacity-60 ${
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
      } ${
        checked
          ? "border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500"
          : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      }`}
    >
      <Icon name="check" className="h-3.5 w-3.5" />
      <span>
        {checked
          ? locale === "ar"
            ? "تمت المراجعة"
            : "Checked"
          : locale === "ar"
            ? "تأكيد المراجعة"
            : "Check"}
      </span>
    </button>
  );
}

/* ---------- Full Inline Student Task Preview, Check & Manual Correction Card ---------- */

export type ReviewableTaskItem = {
  task: {
    id: number;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    taskType: string;
    status: string;
    maxScore: number;
    dueDate: Date | string;
    attachmentName: string | null;
    attachmentUrl: string | null;
    quizQuestions: TaskQuizQuestion[] | null;
    subject: { id: number; name: string; nameAr: string; icon: string };
  };
  userId: number;
  studentName?: string;
  isPersonal?: boolean;
  targetClassName?: string | null;
  targetClassNameAr?: string | null;
  studentStatus: "todo" | "in_progress" | "done";
  submission: {
    id: number;
    fileName: string;
    fileUrl?: string | null;
    note: string;
    teacherFeedback: string;
    checkedAt: Date | string | null;
    quizAnswers?: Record<number, number> | null;
    submittedAt: Date | string;
    score: number | null;
    gradedAt: Date | string | null;
  } | null;
};

export function StudentTaskReviewCard({
  item,
  defaultExpanded = false,
  showFullPageLink = true,
}: {
  item: ReviewableTaskItem;
  defaultExpanded?: boolean;
  showFullPageLink?: boolean;
}) {
  const { locale } = useI18n();
  const c = tt(locale);
  const { task, submission, userId } = item;

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [studentStatus, setStudentStatus] = useState<"todo" | "in_progress" | "done">(item.studentStatus);
  const [checked, setChecked] = useState(Boolean(submission?.checkedAt));
  const [scoreInput, setScoreInput] = useState(
    submission?.score !== null && submission?.score !== undefined ? String(submission.score) : "",
  );
  const [feedback, setFeedback] = useState(submission?.teacherFeedback ?? "");
  const [savedToast, setSavedToast] = useState(false);
  const [pending, startTransition] = useTransition();

  const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
  const hasQuiz = Array.isArray(task.quizQuestions) && task.quizQuestions.length > 0;
  const quizAnswers = submission?.quizAnswers ?? null;

  const openInlinePreview = (url: string) => {
    window.open(withSessionQuery(url), "_blank", "noopener,noreferrer");
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const parsedScore = scoreInput.trim() === "" ? null : Number(scoreInput);
      const nextStatus: "todo" | "in_progress" | "done" =
        parsedScore !== null || checked ? "done" : studentStatus;
      const res = await reviewStudentTaskAction({
        taskId: task.id,
        userId,
        score: parsedScore,
        teacherFeedback: feedback,
        checked: checked || parsedScore !== null,
        studentStatus: nextStatus,
      });
      if (res?.ok) {
        setStudentStatus(res.status ?? nextStatus);
        setChecked(Boolean(res.checked));
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2200);
        reloadWithSession();
      }
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs transition dark:border-slate-700 dark:bg-slate-900">
      {/* Summary Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <SubjectBadge icon={task.subject.icon} name={task.subject.name} size="sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/tasks/${task.id}?student=${userId}`}
                className="font-bold text-slate-900 hover:text-blue-600 hover:underline dark:text-white dark:hover:text-sky-300"
              >
                {tr(locale, task.title, task.titleAr)}
              </Link>
              {item.isPersonal && (
                <Badge tone="personal">{locale === "ar" ? "مهمة شخصية" : "Personal"}</Badge>
              )}
              {item.targetClassName && !item.isPersonal && (
                <Badge tone="todo">
                  {locale === "ar" ? item.targetClassNameAr || item.targetClassName : item.targetClassName}
                </Badge>
              )}
              {hasQuiz && (
                <Badge tone="in_progress">
                  <Icon name="quiz" className="h-3 w-3" />
                  {locale === "ar" ? "اختبار" : "Quiz"}
                </Badge>
              )}
              {checked && (
                <Badge tone="done">
                  <Icon name="check" className="h-3 w-3" />
                  {locale === "ar" ? "تمت المراجعة" : "Checked"}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {tr(locale, task.subject.name, task.subject.nameAr)} · {taskTypeLabel(locale, task.taskType)} ·{" "}
              {locale === "ar" ? "التسليم:" : "Due:"} {fmtDate(locale, dueDate)}
              {submission?.score !== null && submission?.score !== undefined && (
                <span className="ms-2 font-extrabold text-emerald-600 dark:text-emerald-400" dir="ltr">
                  · {submission.score}/{task.maxScore}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Strip: Student Status + Task Open/Closed + Quick Check + Expand Preview & Correct */}
        <div className="flex flex-wrap items-center gap-2">
          <StudentTaskStatusSelect
            taskId={task.id}
            userId={userId}
            initialStatus={studentStatus}
            compact
          />
          <TaskOpenStatusButton taskId={task.id} initialStatus={task.status} compact />
          <QuickCheckToggle taskId={task.id} userId={userId} initialChecked={checked} compact />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              expanded
                ? "bg-navy-500 text-white"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-sky-500/15 dark:text-sky-300"
            }`}
          >
            <Icon name="eye" className="h-3.5 w-3.5" />
            {expanded
              ? locale === "ar"
                ? "إخفاء المعاينة والتصحيح"
                : "Hide Preview"
              : locale === "ar"
                ? "معاينة وتصحيح يدوي"
                : "Preview & Correct"}
          </button>
          {showFullPageLink && (
            <Link
              href={`/tasks/${task.id}?student=${userId}`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title={locale === "ar" ? "فتح صفحة المعاينة الكاملة" : "Open full task preview page"}
            >
              <Icon name="maximize" className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Expanded Preview + Manual Correction Panel */}
      {expanded && (
        <div className="space-y-4 border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/40">
          {/* 1. Task Instructions & Attachment Preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                {locale === "ar" ? "معاينة محتوى المهمة المسندة" : "Assigned Task Preview"}
              </p>
              {(task.attachmentName || task.attachmentUrl) && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openInlinePreview(`/api/tasks/${task.id}/attachment?inline=1`)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-sky-500/15 dark:text-sky-300"
                  >
                    <Icon name="eye" className="h-3.5 w-3.5" />
                    {locale === "ar" ? "معاينة مرفق المهمة" : "Preview Attachment"}
                  </button>
                  <DownloadButton
                    url={`/api/tasks/${task.id}/attachment`}
                    label={locale === "ar" ? "تنزيل" : "Download"}
                    compact
                  />
                </div>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
              {tr(locale, task.description, task.descriptionAr) ||
                (locale === "ar" ? "لا يوجد وصف إضافي لهذه المهمة." : "No extra description provided.")}
            </p>
            {task.attachmentName && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Icon name={task.attachmentUrl ? "drive" : "file"} className="h-3.5 w-3.5" />
                {task.attachmentName}
              </p>
            )}
          </div>

          {/* 2. Quiz Questions + Student Answers vs Answer Key (when task has quiz questions) */}
          {hasQuiz && task.quizQuestions && (
            <div className="rounded-xl border border-violet-200 bg-white p-4 dark:border-violet-500/30 dark:bg-slate-900">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                <Icon name="quiz" className="h-4 w-4" />
                {locale === "ar"
                  ? "معاينة أسئلة الاختبار وإجابات الطالب ومفتاح الحل"
                  : "Quiz Questions, Student Answers & Answer Key"}
              </p>
              <ol className="space-y-3">
                {task.quizQuestions.map((q, idx) => {
                  const picked =
                    quizAnswers && quizAnswers[q.id] !== undefined ? Number(quizAnswers[q.id]) : null;
                  return (
                    <li
                      key={q.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctIndex;
                          const isStudentPick = picked === oIdx;
                          let cls =
                            "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
                          if (isCorrect) {
                            cls =
                              "border-emerald-400 bg-emerald-50 font-bold text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-200";
                          } else if (isStudentPick && !isCorrect) {
                            cls =
                              "border-rose-400 bg-rose-50 font-bold text-rose-900 dark:border-rose-500/50 dark:bg-rose-500/15 dark:text-rose-200";
                          }
                          return (
                            <div
                              key={oIdx}
                              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs ${cls}`}
                            >
                              <span>{opt}</span>
                              <span className="flex items-center gap-1">
                                {isStudentPick && (
                                  <span className="rounded bg-slate-900/10 px-1.5 py-0.5 text-[10px] font-extrabold dark:bg-white/15">
                                    {locale === "ar" ? "إجابة الطالب" : "Student"}
                                  </span>
                                )}
                                {isCorrect && <Icon name="check" className="h-3.5 w-3.5 text-emerald-600" />}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          {locale === "ar" ? "التوضيح:" : "Explanation:"} {q.explanation}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* 3. Student Submission Preview */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                {locale === "ar" ? "إجابة وتسليم الطالب" : "Student Submission & Written Answer"}
              </p>
              {submission && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openInlinePreview(`/api/submissions/${submission.id}/download?inline=1`)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-sky-500/15 dark:text-sky-300"
                  >
                    <Icon name="eye" className="h-3.5 w-3.5" />
                    {locale === "ar" ? "معاينة ملف الطالب" : "Preview File"}
                  </button>
                  <DownloadButton
                    url={`/api/submissions/${submission.id}/download`}
                    label={locale === "ar" ? "تنزيل التسليم" : "Download"}
                    compact
                  />
                </div>
              )}
            </div>

            {submission ? (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                    <Icon name="file" className="h-3.5 w-3.5" />
                    {submission.fileName}
                  </span>
                  <span>·</span>
                  <span>
                    {locale === "ar" ? "تاريخ التسليم:" : "Submitted:"}{" "}
                    {fmtDate(
                      locale,
                      submission.submittedAt instanceof Date
                        ? submission.submittedAt
                        : new Date(submission.submittedAt),
                    )}
                  </span>
                </div>
                {submission.note && (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                    {submission.note}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                {locale === "ar"
                  ? "لم يرفع الطالب ملفاً بعد — يمكنك مع ذلك تصحيح المهمة يدوياً أو تغيير حالتها أو تسجيل الدرجة."
                  : "No file uploaded by student yet — you can still manually grade, check, write feedback, or change task status below."}
              </p>
            )}
          </div>

          {/* 4. Manual Correction, Check & Status Form */}
          <form
            onSubmit={handleSaveCorrection}
            className="space-y-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-white to-emerald-50/50 p-4 dark:border-sky-500/30 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-500/10"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-navy-600 dark:text-sky-300">
                <Icon name="pencil" className="h-3.5 w-3.5" />
                {locale === "ar"
                  ? "التصحيح اليدوي والمراجعة وتغيير الحالة"
                  : "Manual Correction, Check & Status"}
              </p>
              {savedToast && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                  <Icon name="check" className="h-3.5 w-3.5" />
                  {locale === "ar" ? "تم حفظ التصحيح بنجاح" : "Correction saved"}
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  {locale === "ar" ? `الدرجة (من ${task.maxScore})` : `Manual Score (out of ${task.maxScore})`}
                </label>
                <div className="flex items-center gap-2" dir="ltr">
                  <input
                    type="number"
                    min={0}
                    max={task.maxScore}
                    value={scoreInput}
                    placeholder="—"
                    onChange={(e) => setScoreInput(e.target.value)}
                    className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-extrabold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="text-sm font-bold text-slate-500">/ {task.maxScore}</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  {locale === "ar" ? "حالة المهمة عند الطالب" : "Student Task Status"}
                </label>
                <select
                  value={studentStatus}
                  onChange={(e) => setStudentStatus(e.target.value as "todo" | "in_progress" | "done")}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="todo">{locale === "ar" ? "لم تبدأ (To Do)" : "To Do"}</option>
                  <option value="in_progress">{locale === "ar" ? "قيد التنفيذ (In Progress)" : "In Progress"}</option>
                  <option value="done">{locale === "ar" ? "مكتملة (Done)" : "Done"}</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-800 select-none hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span>{locale === "ar" ? "تمت مراجعة وتصحيح المهمة" : "Mark as Checked & Verified"}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                {locale === "ar"
                  ? "ملاحظات التصحيح اليدوي للطالب (اختياري)"
                  : "Teacher Correction Notes / Feedback (visible to student)"}
              </label>
              <textarea
                rows={2}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  locale === "ar"
                    ? "اكتب ملاحظاتك أو تصحيحك التفصيلي ليظهر للطالب..."
                    : "Write correction comments, feedback, or next steps for the student..."
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl bg-navy-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-navy-600 disabled:opacity-60"
              >
                <Icon name="check" className="h-4 w-4" />
                {pending
                  ? "…"
                  : locale === "ar"
                    ? "حفظ التصحيح والحالة"
                    : c.saveScore ? `${c.saveScore} & Status` : "Save Correction & Status"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
