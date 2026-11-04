"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";
import {
  formatBytes,
  getClientSessionToken,
  GOOGLE_DRIVE_FOLDER_URL,
  MAX_FILE_BYTES,
  uploadFileToCloudBucket,
} from "@/lib/file-client";
import { gradeLabel, TASK_TYPES, taskTypeLabel, tt } from "@/lib/i18n-teacher";
import { Avatar, Icon } from "@/components/ui";
import { navigateWithSession } from "@/components/shell/Shell";

type SubjectOpt = { id: number; name: string; nameAr: string; icon: string };
type TermOpt = { id: number; name: string; nameAr: string; isActive: boolean };
type ClassOpt = { id: number; name: string; nameAr: string; levelName: string; levelNameAr: string };
type StudentOpt = {
  id: number;
  fullName: string;
  studentCode: string;
  grade: string;
  avatarUrl?: string | null;
};

type DraftQuizQuestion = {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

const emptyQuestion = (): DraftQuizQuestion => ({
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
});

export function AssignTaskForm({
  subjects,
  grades,
  classes = [],
  targetStudent,
  terms,
  defaultAudience,
  defaultTaskType = "",
}: {
  subjects: SubjectOpt[];
  grades: string[];
  classes?: ClassOpt[];
  targetStudent?: StudentOpt | null;
  terms: TermOpt[];
  defaultAudience: string;
  defaultTaskType?: string;
}) {
  const { locale } = useI18n();
  const c = tt(locale);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeTerm = terms.find((tm) => tm.isActive) ?? terms[0] ?? null;
  const isProfileAssignment = Boolean(targetStudent);

  const [audience, setAudience] = useState(
    targetStudent ? `student:${targetStudent.id}` : defaultAudience,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState(defaultTaskType);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? 1);
  const [maxScore, setMaxScore] = useState(100);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  // Cloud storage / Google Drive state
  const [storageMode, setStorageMode] = useState<"supabase" | "drive">("supabase");
  const [file, setFile] = useState<File | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [driveFileName, setDriveFileName] = useState("");
  const [fileError, setFileError] = useState("");

  // Interactive Quiz Builder state (used when taskType === "quiz")
  const [questions, setQuestions] = useState<DraftQuizQuestion[]>([emptyQuestion()]);

  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  const selectedStudent = useMemo(() => targetStudent ?? null, [targetStudent]);

  function onFile(f?: File) {
    setFileError("");
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setFileError(c.fileTooBig);
      return;
    }
    setFile(f);
  }

  function updateQuestion(idx: number, patch: Partial<DraftQuizQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function updateOption(qIdx: number, optIdx: 0 | 1 | 2 | 3, val: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const next: [string, string, string, string] = [...q.options] as [string, string, string, string];
        next[optIdx] = val;
        return { ...q, options: next };
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    if (title.trim().length < 3) {
      setFormError(c.taskTitleShort);
      return;
    }
    if (!taskType) {
      setFormError(c.typeRequired);
      return;
    }
    if (!dueDate) {
      setFormError(c.dueRequired);
      return;
    }

    const validQuizQuestions =
      taskType === "quiz"
        ? questions
            .map((q) => ({
              question: q.question.trim(),
              options: q.options.map((o) => o.trim()).filter(Boolean),
              correctIndex: q.correctIndex,
              explanation: q.explanation.trim(),
            }))
            .filter((q) => q.question.length >= 2 && q.options.length >= 2)
        : [];

    setPending(true);
    try {
      const out = new FormData(e.currentTarget);
      out.set("audience", isProfileAssignment && targetStudent ? `student:${targetStudent.id}` : audience);
      out.set("fromProfile", isProfileAssignment ? "1" : "0");
      out.set("title", title.trim());
      out.set("description", description.trim());
      out.set("taskType", taskType);
      out.set("subjectId", String(subjectId));
      out.set("dueDate", dueDate);
      out.set("maxScore", String(maxScore));

      if (validQuizQuestions.length > 0) {
        out.set("quizQuestions", JSON.stringify(validQuizQuestions));
      }

      if (storageMode === "supabase" && file) {
        setStatusNote(locale === "ar" ? "جارٍ رفع الملف إلى سحابة Supabase (files)…" : "Uploading file to Supabase files bucket…");
        const uploaded = await uploadFileToCloudBucket("tasks", file);
        if (uploaded) {
          out.set("storagePath", uploaded.storagePath);
          out.set("attachmentName", uploaded.fileName);
          out.set("attachmentMime", uploaded.mimeType);
        } else {
          out.set("file", file);
        }
      } else if (storageMode === "drive" && driveUrl.trim()) {
        out.set("attachmentUrl", driveUrl.trim());
        out.set("attachmentName", driveFileName.trim() || "Google Drive Document");
      }

      setStatusNote(c.assigning);
      const token = getClientSessionToken();
      const res = await fetch("/api/tasks/assign", {
        method: "POST",
        body: out,
        headers: token ? { "x-session-token": token } : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setFormError(
          data?.error === "file_too_big"
            ? c.fileTooBig
            : locale === "ar"
              ? "تعذر إسناد المهمة. حاول مرة أخرى."
              : "Could not assign task. Please try again.",
        );
        setPending(false);
        setStatusNote("");
        return;
      }

      if (data.targetStudentId) {
        navigateWithSession(`/students/${data.targetStudentId}`);
      } else {
        navigateWithSession(`/tasks?task=${data.taskId}`);
      }
    } catch {
      setFormError(locale === "ar" ? "انقطع الاتصال. حاول مرة أخرى." : "Network error. Please try again.");
      setPending(false);
      setStatusNote("");
    }
  }

  const label = "mb-2 block text-base font-bold text-slate-900 dark:text-white";
  const field =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-8">
      {/* Personal student callout banner */}
      {selectedStudent && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-sky-50 to-amber-50 p-4 dark:border-violet-500/30 dark:from-violet-500/15 dark:via-slate-800 dark:to-sky-500/10">
          <div className="flex items-center gap-3">
            <Avatar name={selectedStudent.fullName} size={44} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                {locale === "ar" ? "إسناد شخصي لطالب محدد" : "Personal Assignment for Specific Student"}
              </p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">
                {selectedStudent.fullName}{" "}
                <span className="text-xs font-semibold text-slate-500" dir="ltr">
                  (#{selectedStudent.studentCode} · {gradeLabel(locale, selectedStudent.grade)})
                </span>
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-bold text-violet-700 shadow-xs dark:bg-slate-900 dark:text-violet-300">
            <Icon name="bell" className="h-4 w-4" />
            {locale === "ar" ? "سيصل إشعار فوري لهذا الطالب فقط" : "Instant notification sent only to this student"}
          </span>
        </div>
      )}

      {/* Quick Type Switcher Pills */}
      <div>
        <label className={label}>{c.taskType}</label>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TASK_TYPES.map((tp) => {
            const active = taskType === tp;
            const iconName = tp === "quiz" ? "quiz" : tp === "lab" ? "flask" : tp === "worksheet" ? "file" : "clipboard";
            return (
              <button
                key={tp}
                type="button"
                onClick={() => setTaskType(tp)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition ${
                  active
                    ? "border-navy-500 bg-navy-500 text-white shadow-md shadow-navy-500/20"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-400 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                <Icon name={iconName} className="h-4.5 w-4.5" />
                {taskTypeLabel(locale, tp)}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="taskType" value={taskType} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="task-audience" className={label}>
            {c.assignTo}
          </label>
          {isProfileAssignment && selectedStudent ? (
            <div className="flex items-center gap-3 rounded-xl border border-violet-300 bg-violet-50/70 px-4 py-2.5 dark:border-violet-500/40 dark:bg-violet-500/10">
              <Avatar name={selectedStudent.fullName} src={selectedStudent.avatarUrl} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                  {selectedStudent.fullName}
                </p>
                <p className="text-xs text-slate-500" dir="ltr">
                  #{selectedStudent.studentCode} · {gradeLabel(locale, selectedStudent.grade)}
                </p>
              </div>
              <input type="hidden" name="audience" value={`student:${selectedStudent.id}`} />
            </div>
          ) : (
            <>
              <select
                id="task-audience"
                name="audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className={field}
              >
                <option value="all">{c.allStudents}</option>
                {classes.length > 0 && (
                  <optgroup label={locale === "ar" ? "الفصول الدراسية" : "Classes"}>
                    {classes.map((cl) => (
                      <option key={cl.id} value={`class:${cl.id}`}>
                        {locale === "ar"
                          ? `${cl.nameAr} (${cl.levelNameAr})`
                          : `${cl.name} (${cl.levelName})`}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={locale === "ar" ? "الصفوف الدراسية" : "Grade Levels"}>
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {gradeLabel(locale, g)}
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                {locale === "ar"
                  ? "لإسناد مهمة لطالب محدد بمفرده، افتح ملفه الشخصي من صفحة الطلاب."
                  : "To assign a personal task to one specific student, use their Student Profile."}
              </p>
            </>
          )}
        </div>

        <div>
          <label htmlFor="task-due" className={label}>
            {c.dueDate}
          </label>
          <input
            id="task-due"
            name="dueDate"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="task-subject" className={label}>
            {c.subject}
          </label>
          <select
            id="task-subject"
            name="subjectId"
            value={subjectId}
            onChange={(e) => setSubjectId(Number(e.target.value))}
            className={field}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {locale === "ar" ? s.nameAr : s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="task-max-score" className={label}>
            {locale === "ar" ? "الدرجة العظمى" : "Max Score"}
          </label>
          <input
            id="task-max-score"
            name="maxScore"
            type="number"
            min={5}
            max={1000}
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value) || 100)}
            className={field}
          />
        </div>

        {terms.length > 0 && (
          <div>
            <label htmlFor="task-term" className={label}>
              {locale === "ar" ? "الفصل الدراسي" : "Academic Term"}
            </label>
            <select id="task-term" name="termId" defaultValue={activeTerm?.id ?? ""} className={field}>
              {terms.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {locale === "ar" ? tm.nameAr : tm.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="task-title" className={label}>
          {c.taskTitle}
        </label>
        <input
          id="task-title"
          name="title"
          required
          minLength={3}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={c.taskTitlePh}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="task-desc" className={label}>
          {c.description}
        </label>
        <textarea
          id="task-desc"
          name="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={c.descriptionPh}
          className={field}
        />
      </div>

      {/* Interactive Quiz Builder when Quiz is selected */}
      {taskType === "quiz" && (
        <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-5 dark:border-violet-500/30 dark:bg-violet-500/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 text-white">
                <Icon name="quiz" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {locale === "ar" ? "أسئلة الاختبار التفاعلي (تصحيح تلقائي)" : "Interactive Quiz Questions (Auto-Graded)"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === "ar"
                    ? "أضف أسئلة اختيار من متعدد ليحلها الطالب مباشرة ويحصل على درجته فوراً"
                    : "Add multiple-choice questions so students can answer interactively and get instant grading"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-violet-700"
            >
              <Icon name="plus" className="h-4 w-4" />
              {locale === "ar" ? "إضافة سؤال" : "Add Question"}
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
                    {locale === "ar" ? `سؤال ${qIdx + 1}` : `Question ${qIdx + 1}`}
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIdx))}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      {locale === "ar" ? "حذف السؤال" : "Remove"}
                    </button>
                  )}
                </div>

                <input
                  value={q.question}
                  onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                  placeholder={locale === "ar" ? "نص السؤال..." : "Write the question prompt..."}
                  className={field}
                />

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {([0, 1, 2, 3] as const).map((optIdx) => (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                        q.correctIndex === optIdx
                          ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-500/10"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`quiz-correct-${qIdx}`}
                        checked={q.correctIndex === optIdx}
                        onChange={() => updateQuestion(qIdx, { correctIndex: optIdx })}
                        className="h-4 w-4 accent-emerald-600"
                        title={locale === "ar" ? "الإجابة الصحيحة" : "Correct option"}
                      />
                      <input
                        value={q.options[optIdx]}
                        onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                        placeholder={
                          locale === "ar" ? `الخيار ${optIdx + 1}` : `Option ${optIdx + 1}`
                        }
                        className="w-full bg-transparent text-sm text-slate-900 outline-none dark:text-white"
                      />
                    </div>
                  ))}
                </div>

                <input
                  value={q.explanation}
                  onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                  placeholder={
                    locale === "ar"
                      ? "تفسير الإجابة الصحيحة (اختياري)..."
                      : "Optional explanation shown after submission..."
                  }
                  className={field}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cloud Attachment: Supabase `files` Bucket OR Google Drive */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={label + " !mb-0"}>{c.attachMaterials}</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setStorageMode("supabase")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                storageMode === "supabase"
                  ? "bg-white text-navy-700 shadow-xs dark:bg-slate-900 dark:text-sky-300"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Icon name="cloud" className="h-4 w-4" />
              {locale === "ar" ? "سحابة Supabase (files)" : "Supabase Cloud (files)"}
            </button>
            <button
              type="button"
              onClick={() => setStorageMode("drive")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                storageMode === "drive"
                  ? "bg-white text-navy-700 shadow-xs dark:bg-slate-900 dark:text-sky-300"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <Icon name="drive" className="h-4 w-4" />
              Google Drive
            </button>
          </div>
        </div>

        {storageMode === "supabase" ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-6 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-800/40"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="space-y-1">
                <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <Icon name="check" className="h-6 w-6" />
                </div>
                <p className="font-bold text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  {c.removeFile}
                </button>
              </div>
            ) : (
              <>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                  <Icon name="cloud" className="h-6 w-6" />
                </span>
                <p className="mt-2 font-bold text-slate-800 dark:text-slate-100">{c.uploadHint}</p>
                <p className="text-xs text-slate-500">{c.uploadLimit}</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {locale === "ar"
                  ? "ارفع ملف الـ PDF أو DOC في مجلد Google Drive ثم الصق رابط المشاركة هنا"
                  : "Upload your PDF or DOC to the platform Google Drive folder, then paste its share link below"}
              </p>
              <a
                href={GOOGLE_DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-navy-700 shadow-xs ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-sky-300 dark:ring-slate-700"
              >
                <Icon name="drive" className="h-4 w-4" />
                {locale === "ar" ? "فتح مجلد Google Drive" : "Open Google Drive Folder"}
              </a>
            </div>
            <input
              type="url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className={field}
              dir="ltr"
            />
            <input
              type="text"
              value={driveFileName}
              onChange={(e) => setDriveFileName(e.target.value)}
              placeholder={locale === "ar" ? "اسم الملف المعروض للطالب (مثال: واجب-الكيمياء.pdf)" : "Display filename (e.g. chemistry-worksheet.pdf)"}
              className={field}
            />
          </div>
        )}
        {fileError && <p className="mt-2 text-sm font-semibold text-red-600">{fileError}</p>}
      </div>

      {formError && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Link
          href={selectedStudent ? `/students/${selectedStudent.id}` : "/tasks"}
          className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {c.cancel}
        </Link>
        <button
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 disabled:opacity-60"
        >
          <Icon name={taskType === "quiz" ? "quiz" : "assign"} className="h-4.5 w-4.5" />
          {pending ? statusNote || c.assigning : taskType === "quiz" ? (locale === "ar" ? "إسناد الاختبار" : "Assign Quiz") : c.assignTask}
        </button>
      </div>
    </form>
  );
}
