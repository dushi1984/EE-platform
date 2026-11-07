"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n-client";
import { tt } from "@/lib/i18n-teacher";
import { gradeSubmissionAction } from "@/lib/teacher-actions";
import { Icon } from "@/components/ui";
import { reloadWithSession } from "@/components/shell/Shell";

export function GradeInput({ taskId, userId, initial, max }: { taskId: number; userId: number; initial: number | null; max: number }) {
  const { locale } = useI18n();
  const c = tt(locale);
  const [value, setValue] = useState(initial === null ? "" : String(initial));
  const [savedScore, setSavedScore] = useState<number | null>(initial);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const changed = value !== "" && Number(value) !== savedScore;
  void pending;

  const save = () =>
    startTransition(async () => {
      const numeric = Math.min(max, Math.max(0, Math.round(Number(value))));
      const res = await gradeSubmissionAction(taskId, userId, numeric);
      if (res?.ok) {
        setSavedScore(numeric);
        setValue(String(numeric));
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1800);
        reloadWithSession();
      }
    });

  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        placeholder="00"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && changed) {
            e.preventDefault();
            save();
          }
        }}
        className="w-14 rounded-lg border border-slate-300 bg-white px-2 py-1 text-end text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
      />
      <span className="text-sm text-slate-500">/{max}</span>
      {changed && (
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-blue-500 px-2 py-1 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-60"
        >
          {pending ? "…" : c.saveScore}
        </button>
      )}
      {justSaved && !changed && <Icon name="check" className="h-4 w-4 text-green-600" />}
    </div>
  );
}
