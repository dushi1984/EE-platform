"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";
import { tt } from "@/lib/i18n-teacher";
import { saveMaterialAction, type TeacherActionState } from "@/lib/teacher-actions";
import { formatBytes } from "@/lib/file-client";
import { navigateWithSession } from "@/components/shell/Shell";

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white";
const label = "mb-1.5 block text-sm font-bold text-slate-900 dark:text-white";

type TermOpt = { id: number; name: string; nameAr: string; isActive: boolean };

export type MaterialFormValues = {
  id: number;
  title: string;
  titleAr: string;
  description: string;
  kind: string;
  priceCents: number;
  published: boolean;
  thumbnailUrl: string | null;
  subjectId: number;
  fileSize: string;
  videoUrl: string;
  content: string;
};

export function MaterialForm({
  subjects,
  terms = [],
  initial,
}: {
  subjects: { id: number; name: string; nameAr: string; icon: string }[];
  terms?: TermOpt[];
  initial: (MaterialFormValues & { termId?: number | null }) | null;
}) {
  const { locale } = useI18n();
  const c = tt(locale);
  const [state, action, pending] = useActionState<TeacherActionState, FormData>(saveMaterialAction, null);
  const [kind, setKind] = useState(initial?.kind ?? "video");
  const [fileSize, setFileSize] = useState(initial?.fileSize ?? "");

  useEffect(() => {
    if (state?.redirectTo) {
      navigateWithSession(state.redirectTo);
    }
  }, [state]);

  return (
    <form action={action} className="space-y-4 p-5 sm:p-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="fileSize" value={fileSize} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{c.matTitle}</label>
          <input name="title" required minLength={3} defaultValue={initial?.title} className={input} />
        </div>
        <div>
          <label className={label}>{c.matTitleAr}</label>
          <input name="titleAr" defaultValue={initial?.titleAr !== initial?.title ? initial?.titleAr : ""} dir="rtl" className={input} />
        </div>
        <div>
          <label className={label}>{c.matKind}</label>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={input}>
            <option value="video">{c.video}</option>
            <option value="pdf">{c.pdf}</option>
          </select>
        </div>
        <div>
          <label className={label}>{c.subject}</label>
          <select name="subjectId" defaultValue={initial?.subjectId} className={input}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {locale === "ar" ? s.nameAr : s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>{c.matPrice}</label>
          <input name="price" type="number" min={0} step="0.01" defaultValue={initial ? initial.priceCents / 100 : 0} className={input} />
        </div>
        <div>
          <label className={label}>{c.matStatus}</label>
          <select name="status" defaultValue={initial && !initial.published ? "draft" : "published"} className={input}>
            <option value="published">{c.published}</option>
            <option value="draft">{c.draft}</option>
          </select>
        </div>
      </div>

      {terms.length > 0 && (
        <div>
          <label className={label}>{c.termLabel}</label>
          <select name="termId" defaultValue={initial?.termId ?? terms.find((tm) => tm.isActive)?.id ?? ""} className={input}>
            <option value="">{c.noTerm}</option>
            {terms.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {locale === "ar" && tm.nameAr ? tm.nameAr : tm.name}
                {tm.isActive ? ` · ${c.activeTerm}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={label}>{c.description}</label>
        <textarea name="description" rows={3} defaultValue={initial?.description} className={input} />
      </div>

      <div>
        <label className={label}>{c.matThumb}</label>
        <input name="thumbnailUrl" defaultValue={initial?.thumbnailUrl ?? ""} placeholder="/images/materials/chemistry.jpg or https://…" dir="ltr" className={input} />
      </div>

      {kind === "video" && (
        <div>
          <label className={label}>{c.matVideo}</label>
          <input name="videoUrl" type="url" defaultValue={initial?.videoUrl} placeholder="https://www.youtube.com/watch?v=…" dir="ltr" className={input} />
        </div>
      )}
      {kind === "pdf" && (
        <div>
          <label className={label}>{c.matFile}</label>
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFileSize(f ? formatBytes(f.size) : fileSize);
            }}
            className="block w-full text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-bold file:text-blue-600"
          />
          {fileSize && <p className="mt-1 text-xs text-slate-500">{c.fileSize}: {fileSize}</p>}
        </div>
      )}

      <div>
        <label className={label}>{c.matContent}</label>
        <textarea name="content" rows={7} defaultValue={initial?.content} dir="ltr" className={`${input} font-mono text-sm`} placeholder={"## Heading\n\nExplain the lesson…"} />
      </div>

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <summary className="cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-100">
          🧠 {locale === "ar" ? "إضافة سؤال اختبار قصير للدرس (اختياري)" : "Add a quiz question for this material (optional)"}
        </summary>
        <div className="mt-3 space-y-3">
          <input name="quizQuestion" placeholder={locale === "ar" ? "نص السؤال" : "Question prompt"} className={input} />
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <label key={i} className="flex items-center gap-2">
                <input type="radio" name="quizCorrect" value={i} defaultChecked={i === 0} className="h-4 w-4 accent-blue-600" />
                <input name={`quizOpt${i}`} placeholder={locale === "ar" ? `الخيار ${i + 1}` : `Option ${i + 1}`} className={input} />
              </label>
            ))}
          </div>
        </div>
      </details>

      {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">{state.error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <Link href={initial ? `/materials?m=${initial.id}` : "/materials"} className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          {c.cancel}
        </Link>
        <button disabled={pending} className="rounded-xl bg-blue-500 px-8 py-3 text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 disabled:opacity-60">
          {pending ? c.saving : c.save}
        </button>
      </div>
    </form>
  );
}
