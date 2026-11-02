"use client";

import { useActionState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { submitQuizAction, type QuizResult } from "@/lib/actions";
import type { QuizQuestion } from "@/db/schema";

export function Quiz({ lessonId, questions }: { lessonId: number; questions: QuizQuestion[] }) {
  const { t } = useI18n();
  const [result, action, pending] = useActionState<QuizResult, FormData>(submitQuizAction, null);
  const byId = new Map(result?.results.map((r) => [r.questionId, r]));
  const perfect = result && result.score === result.total;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("quiz.title")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {questions.length} {t("quiz.questions")} · {t("quiz.subtitle")}
          </p>
        </div>
        {result && (
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${perfect ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"}`}>
            {result.score}/{result.total}
          </span>
        )}
      </div>

      <form action={action} className="mt-5 space-y-6">
        <input type="hidden" name="lessonId" value={lessonId} />
        {questions.map((q, qi) => {
          const r = byId.get(q.id);
          return (
            <fieldset key={q.id} className="space-y-2">
              <legend className="mb-1 font-medium text-slate-900 dark:text-white">
                {qi + 1}. {q.question}
              </legend>
              {q.options.map((opt, oi) => {
                let cls = "border-slate-200 hover:border-navy-400 hover:bg-navy-500/5 dark:border-slate-700";
                if (r) {
                  if (oi === r.correctIndex) cls = "border-green-400 bg-green-50 dark:bg-green-500/10";
                  else if (!r.correct) cls = "border-slate-200 has-[:checked]:border-red-400 has-[:checked]:bg-red-50 dark:border-slate-700 dark:has-[:checked]:bg-red-500/10";
                }
                return (
                  <label key={oi} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${cls}`}>
                    <input type="radio" name={`q_${q.id}`} value={oi} required disabled={!!result} className="accent-navy-500" />
                    <span className="text-slate-800 dark:text-slate-200">{opt}</span>
                    {r && oi === r.correctIndex && <span className="ms-auto text-xs font-semibold text-green-700">{t("quiz.correct")}</span>}
                  </label>
                );
              })}
              {r?.explanation && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{r.explanation}</p>}
            </fieldset>
          );
        })}

        {!result ? (
          <button type="submit" disabled={pending} className="rounded-xl bg-navy-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-navy-600 disabled:opacity-50">
            {pending ? t("quiz.checking") : t("quiz.check")}
          </button>
        ) : (
          <div className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm ${perfect ? "bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-200" : "bg-yellow-50 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200"}`}>
            {perfect ? `🎉 ${t("quiz.perfect")}` : t("quiz.notPerfect")}
            {!perfect && (
              <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">
                {t("quiz.retry")}
              </button>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
