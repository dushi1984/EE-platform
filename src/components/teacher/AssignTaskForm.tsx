"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";
import { TASK_TYPES, taskTypeLabel, tt } from "@/lib/i18n-teacher";
import { MAX_FILE_BYTES, formatBytes, getClientSessionToken } from "@/lib/file-client";
import { Icon } from "@/components/ui";
import { navigateWithSession } from "@/components/shell/Shell";

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white";
const label = "mb-1.5 block text-sm font-bold text-slate-900 dark:text-white";

type LevelOpt = { id: number; name: string; nameAr: string };
type TermOpt = { id: number; name: string; nameAr: string; isActive: boolean };

export function AssignTaskForm({
  subjects,
  defaultAudience,
  levels,
  terms,
}: {
  subjects: { id: number; name: string; nameAr: string; icon: string }[];
  defaultAudience: string;
  levels: LevelOpt[];
  terms: TermOpt[];
}) {
  const { locale } = useI18n();
  const c = tt(locale);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function onFile(f: File | undefined) {
    setFileError("");
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setFileError(c.fileTooBig);
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const out = new FormData(e.currentTarget);
    if (file) out.set("file", file);
    setPending(true);
    try {
      const token = getClientSessionToken();
      const res = await fetch("/api/tasks/assign", {
        method: "POST",
        body: out,
        headers: token ? { "x-session-token": token } : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error("assign failed");
      navigateWithSession(`/tasks?task=${data.taskId}`);
    } catch {
      setError(locale === "ar" ? "تعذر إسناد المهمة. حاول مرة أخرى." : "Could not assign the task. Please try again.");
      setPending(false);
    }
  }

  function attachTemplateWorksheet() {
    setFileError("");
    const content = [
      "in science — Student Practice Worksheet",
      "=======================================",
      "Instructions: Show all steps, formulas, and units clearly.",
      "",
      "Question 1: Define the key principle and state its SI unit.",
      "Question 2: Solve the numerical problem and verify significant figures.",
      "Question 3: Sketch and label the diagram.",
    ].join("\n");
    setFile(new File([content], "practice-worksheet.txt", { type: "text/plain" }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{c.assignTo}</label>
          <select name="audience" defaultValue={defaultAudience} className={input}>
            <option value="all">{c.allStudents}</option>
            {levels.map((l) => (
              <option key={l.id} value={l.name}>
                {locale === "ar" && l.nameAr ? l.nameAr : l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{c.subject}</label>
          <select name="subjectId" className={input}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {locale === "ar" ? s.nameAr : s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{c.taskType}</label>
          <select name="taskType" required defaultValue="assignment" className={input}>
            {TASK_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {taskTypeLabel(locale, tp)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{c.dueDate}</label>
          <input
            name="dueDate"
            type="date"
            required
            defaultValue={new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)}
            className={input}
          />
        </div>
      </div>

      <div>
        <label className={label}>{c.termLabel}</label>
        <select name="termId" defaultValue={terms.find((tm) => tm.isActive)?.id ?? ""} className={input}>
          <option value="">{c.noTerm}</option>
          {terms.map((tm) => (
            <option key={tm.id} value={tm.id}>
              {locale === "ar" && tm.nameAr ? tm.nameAr : tm.name}
              {tm.isActive ? ` · ${c.activeTerm}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>{c.taskTitle}</label>
        <input name="title" required minLength={3} placeholder={c.taskTitlePh} className={input} />
      </div>

      <div>
        <label className={label}>{c.description}</label>
        <textarea name="description" rows={3} placeholder={c.descriptionPh} className={input} />
      </div>

      <div>
        <label className={label}>{c.attachMaterials}</label>
        <input ref={ref} type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        {file ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <Icon name="file" className="h-6 w-6 text-slate-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{file.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
            </div>
            <button type="button" onClick={() => setFile(null)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
              {c.removeFile}
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-8 text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-600 dark:hover:bg-slate-800/50">
            <Icon name="upload" className="h-9 w-9" />
            <span className="font-bold text-slate-700 dark:text-slate-200">{c.uploadHint}</span>
            <span className="text-xs">{c.uploadLimit}</span>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => ref.current?.click()}
                className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-bold text-white hover:bg-blue-600"
              >
                {c.uploadHint}
              </button>
              <button
                type="button"
                onClick={attachTemplateWorksheet}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                📄 {locale === "ar" ? "إرفاق نموذج ورقة عمل" : "Attach worksheet template"}
              </button>
            </div>
          </div>
        )}
        {fileError && <p className="mt-2 text-sm font-semibold text-red-600">{fileError}</p>}
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <Link href="/tasks" className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          {c.cancel}
        </Link>
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-7 py-3 text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 disabled:opacity-60">
          <Icon name="assign" className="h-5 w-5" />
          {pending ? c.assigning : c.assignTask}
        </button>
      </div>
    </form>
  );
}
