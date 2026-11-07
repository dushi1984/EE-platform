"use client";

import { useState, useTransition } from "react";
import type { TaskQuizQuestion } from "@/db/schema";
import { submitTaskQuizAction, type TaskQuizSubmitResult } from "@/lib/actions";
import { useI18n } from "@/lib/i18n-client";
import { Icon } from "./ui";
import { reloadWithSession } from "./shell/Shell";

export function TaskQuizRunner({
  taskId,
  questions,
  maxScore,
  disabled = false,
}: {
  taskId: number;
  questions: TaskQuizQuestion[];
  maxScore: number;
  disabled?: boolean;
}) {
  const { locale } = useI18n();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<TaskQuizSubmitResult | null>(null);
  const [pending, startTransition] = useTransition();

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const pct = result ? Math.round((result.score / Math.max(1, result.maxScore)) * 100) : 0;

  const onSubmit = () => {
    startTransition(async () => {
      const res = await submitTaskQuizAction(taskId, answers);
      setResult(res);
    });
  };

  return (
    <div className="space-y-5">
      {result && (
        <div
          className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 ${
            pct >= 70
              ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 ring-1 ring-emerald-200 dark:from-emerald-500/15 dark:to-sky-500/10 dark:ring-emerald-500/30"
              : "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:ring-amber-500/30"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm ${
                pct >= 70 ? "bg-emerald-600" : "bg-amber-500"
              }`}
            >
              <Icon name="trophy" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                {locale === "ar"
                  ? `النتيجة: ${result.score} / ${result.maxScore} (${pct}%)`
                  : `Score: ${result.score} / ${result.maxScore} (${pct}%)`}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {locale === "ar"
                  ? `${result.correctCount} إجابات صحيحة من أصل ${result.total} — تم حفظ درجتك تلقائياً`
                  : `${result.correctCount} of ${result.total} correct — grade recorded automatically`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setAnswers({});
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {locale === "ar" ? "إعادة المحاولة" : "Try Again"}
            </button>
            <button
              type="button"
              onClick={() => reloadWithSession()}
              className="rounded-xl bg-navy-500 px-4 py-2 text-xs font-bold text-white hover:bg-navy-600"
            >
              {locale === "ar" ? "تحديث الحالة" : "Done"}
            </button>
          </div>
        </div>
      )}

      <ol className="space-y-4">
        {questions.map((q, idx) => {
          const detail = result?.results.find((d) => d.questionId === q.id);
          return (
            <li
              key={q.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800/40"
            >
              <p className="font-bold text-slate-900 dark:text-white">
                <span className="me-2 inline-grid h-6 w-6 place-items-center rounded-lg bg-violet-100 text-xs font-extrabold text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
                  {idx + 1}
                </span>
                {q.question}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, optIdx) => {
                  const picked = answers[q.id] === optIdx;
                  let ring = picked
                    ? "border-navy-500 bg-blue-50 text-navy-900 dark:border-sky-400 dark:bg-sky-500/15 dark:text-white"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900";
                  if (detail) {
                    if (optIdx === detail.correctIndex) {
                      ring = "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200";
                    } else if (picked && !detail.correct) {
                      ring = "border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200";
                    }
                  }
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={disabled || Boolean(result)}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                      className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-start text-sm font-semibold transition ${ring}`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs ${
                          picked ? "border-current bg-navy-500 text-white" : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {picked ? <Icon name="check" className="h-3 w-3" /> : null}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {detail?.explanation && (
                <p className="mt-3 rounded-xl bg-white/80 px-3.5 py-2 text-xs text-slate-600 ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-700">
                  {detail.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!result && !disabled && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs font-semibold text-slate-500">
            {locale === "ar"
              ? `إجمالي الدرجة: ${maxScore} نقطة`
              : `Total quiz points: ${maxScore} pts`}
          </p>
          <button
            type="button"
            disabled={!allAnswered || pending}
            onClick={onSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/25 hover:bg-violet-700 disabled:opacity-50"
          >
            <Icon name="check" className="h-4.5 w-4.5" />
            {pending
              ? locale === "ar"
                ? "جارٍ التصحيح…"
                : "Grading…"
              : locale === "ar"
                ? "تسليم الاختبار وعرض النتيجة"
                : "Submit Quiz & View Score"}
          </button>
        </div>
      )}
    </div>
  );
}
