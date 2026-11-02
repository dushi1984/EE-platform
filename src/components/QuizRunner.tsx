"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { submitQuizAction, type QuizResult } from "@/lib/actions";
import { Card, Icon } from "@/components/ui";

type PublicQuestion = { id: number; question: string; options: string[] };
type Result = NonNullable<QuizResult>;

export function QuizRunner({
  lessonId,
  lessonTitle,
  questions,
  nextHref,
  materialHref,
}: {
  lessonId: number;
  lessonTitle: string;
  questions: PublicQuestion[];
  nextHref: string | null;
  materialHref: string;
}) {
  const { t, locale } = useI18n();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [phase, setPhase] = useState<"quiz" | "sending" | "result">("quiz");
  const [result, setResult] = useState<Result | null>(null);
  const [warn, setWarn] = useState(false);
  const [sendError, setSendError] = useState(false);

  const total = questions.length;
  const q = questions[idx];
  const selected = answers[q.id];

  const submitAnswer = async () => {
    if (selected === undefined) {
      setWarn(true);
      return;
    }
    setWarn(false);
    if (idx < total - 1) {
      setIdx(idx + 1);
      return;
    }
    setPhase("sending");
    setSendError(false);
    const fd = new FormData();
    fd.set("lessonId", String(lessonId));
    for (const qq of questions) fd.set(`q_${qq.id}`, String(answers[qq.id] ?? -1));
    try {
      const [res] = await Promise.all([submitQuizAction(null, fd), new Promise((r) => setTimeout(r, 1400))]);
      if (res) {
        setResult(res);
        setPhase("result");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setPhase("quiz");
        setSendError(true);
      }
    } catch {
      setPhase("quiz");
      setSendError(true);
    }
  };

  const retake = () => {
    setAnswers({});
    setIdx(0);
    setResult(null);
    setWarn(false);
    setSendError(false);
    setPhase("quiz");
  };

  if (phase === "sending") {
    return (
      <Card className="flex flex-col items-center px-6 py-20">
        <div className="h-44 w-44 animate-spin rounded-full border-[18px] border-blue-200 border-t-navy-500 dark:border-slate-700 dark:border-t-sky-400" />
        <p className="mt-8 text-xl font-medium text-slate-900 dark:text-white">{t("quiz.redirecting")}</p>
      </Card>
    );
  }

  if (phase === "result" && result) {
    const percent = Math.round((result.score / result.total) * 100);
    const verdict = percent >= 85 ? "excellent" : percent >= 60 ? "good" : "needsWork";
    const verdictLabel = t(`quiz.${verdict}`);
    const verdictColor = verdict === "excellent" ? "text-green-600" : verdict === "good" ? "text-yellow-600" : "text-red-500";
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{t("quiz.result")}</h2>
          <p className="mt-1 text-slate-500">
            {lessonTitle} · {t("quiz.resultSub")}
          </p>
        </div>
        <Card className="p-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-100 px-2 py-4 text-center dark:bg-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("quiz.score")}</p>
              <p className="mt-1 text-3xl font-extrabold text-blue-600">{percent}%</p>
            </div>
            <div className="rounded-xl bg-slate-100 px-2 py-4 text-center dark:bg-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("quiz.correctCount")}</p>
              <p className="mt-1 text-3xl font-extrabold text-green-600">
                {result.score}
                <span className="text-lg">/{result.total}</span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 px-2 py-4 text-center dark:bg-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("quiz.incorrectCount")}</p>
              <p className="mt-1 text-3xl font-extrabold text-red-500">{result.total - result.score}</p>
            </div>
          </div>

          <h3 className="mt-6 font-bold text-slate-900 dark:text-white">{t("quiz.summary")}</h3>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm text-slate-500">{t("quiz.overallPerformance")}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full rounded-full ${verdict === "excellent" ? "bg-blue-600" : verdict === "good" ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${verdictColor}`}>{verdictLabel}</span>
          </div>

          <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
            {questions.map((qq, i) => {
              const r = result.results.find((x) => x.questionId === qq.id);
              const ok = r?.correct;
              return (
                <li key={qq.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">Q{i + 1}:</span> {qq.question}
                    </p>
                    <span className={`flex shrink-0 items-center gap-1.5 text-sm font-semibold ${ok ? "text-green-600" : "text-red-500"}`}>
                      <span className={`h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
                      {ok ? t("quiz.excellent") : t("quiz.needsWork")}
                    </span>
                  </div>
                  {r?.explanation && !ok && (
                    <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      ✓ {qq.options[r.correctIndex]} — {r.explanation}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={retake}
              className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t("quiz.retake")}
            </button>
            {nextHref ? (
              <Link href={nextHref} className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600">
                {t("quiz.nextLesson")}
              </Link>
            ) : (
              <Link href={materialHref} className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600">
                {t("lesson.backToMaterial")}
              </Link>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-900 dark:text-white">{t("quiz.title")}</p>
        <p className="text-sm text-slate-500">{t("quiz.of", { n: idx + 1, total })}</p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">{t("quiz.topic")}</h2>
      <p className="mt-1 text-slate-500">
        Q{idx + 1}. {q.question}
      </p>

      <div className="mt-4 space-y-3" role="radiogroup" aria-label={q.question}>
        {q.options.map((opt, oi) => (
          <label
            key={oi}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition ${
              selected === oi
                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-500/10"
                : "border-slate-300 hover:border-slate-400 dark:border-slate-700"
            }`}
          >
            <input
              type="radio"
              name={`quiz_q_${q.id}`}
              checked={selected === oi}
              onChange={() => {
                setAnswers((a) => ({ ...a, [q.id]: oi }));
                setWarn(false);
              }}
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-slate-900 dark:text-white">{opt}</span>
          </label>
        ))}
      </div>

      {warn && <p className="mt-3 text-sm font-semibold text-red-600">{t("quiz.pickAnswer")}</p>}
      {sendError && <p className="mt-3 text-sm font-semibold text-red-600">{t("common.errorGeneric")}</p>}

      <div className="mt-6 flex items-center justify-between">
        {idx > 0 ? (
          <button
            type="button"
            onClick={() => setIdx(idx - 1)}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ← {t("lesson.prev")}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={submitAnswer}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600"
        >
          {idx === total - 1 ? t("quiz.submitAnswer") : t("quiz.nextQuestion")}
          <Icon name="chevron" className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>
    </Card>
  );
}
