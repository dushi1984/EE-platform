"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";
import { tt } from "@/lib/i18n-teacher";
import { createStudentAction, type TeacherActionState } from "@/lib/teacher-actions";
import { BackArrow, Icon } from "@/components/ui";
import { safeCopyText } from "@/lib/browser-prefs";

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white";
const label = "mb-1.5 block text-sm font-bold text-slate-900 dark:text-white";

type LevelOpt = { id: number; name: string; nameAr: string };
type ClassOpt = { id: number; name: string; nameAr: string; levelId: number; levelName: string };

export function StudentCreateForm({ levels, classes }: { levels: LevelOpt[]; classes: ClassOpt[] }) {
  const { locale } = useI18n();
  const c = tt(locale);
  const [state, action, pending] = useActionState<TeacherActionState, FormData>(createStudentAction, null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!state?.studentCode || !state.temporaryPassword) return;
    await safeCopyText(`Student ID: ${state.studentCode}\nPassword: ${state.temporaryPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (state?.success && state.studentCode && state.temporaryPassword) {
    return (
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-500/10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white">
            <Icon name="check" className="h-8 w-8" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{state.success}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.generatedCredentials}</p>
          <dl className="mt-5 overflow-hidden rounded-xl bg-white text-start shadow-sm dark:bg-slate-900">
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm text-slate-500">{c.code}</dt>
              <dd className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">{state.studentCode}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <dt className="text-sm text-slate-500">{c.temporaryPassword}</dt>
              <dd className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">{state.temporaryPassword}</dd>
            </div>
          </dl>
          <button type="button" onClick={copy} className="mt-4 rounded-xl bg-navy-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-600">
            {copied ? c.copied : c.copyCredentials}
          </button>
          <div className="mt-5">
            <Link href="/students" className="text-sm font-bold text-blue-600 hover:underline"><BackArrow /> {c.backToStudents}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>{c.fullName}</label>
          <input name="fullName" required placeholder={c.fullName} className={input} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input name="email" type="email" placeholder="student@example.com" className={input} dir="ltr" />
        </div>
        <div>
          <label className={label}>{locale === "ar" ? "رقم الهاتف" : "Phone number"}</label>
          <input name="phone" required inputMode="tel" placeholder="01000000000" className={input} dir="ltr" />
        </div>
        <div>
          <label className={label}>{c.dateOfBirth}</label>
          <input name="dateOfBirth" type="date" className={input} />
        </div>
      </div>

      <div>
        <label className={label}>{c.grade}</label>
        <select name="grade" defaultValue={levels[0]?.name} className={input}>
          {levels.map((l) => (
            <option key={l.id} value={l.name}>
              {locale === "ar" && l.nameAr ? l.nameAr : l.name}
            </option>
          ))}
        </select>
      </div>

      {classes.length > 0 && (
        <div>
          <label className={label}>{c.selectClass}</label>
          <select name="classId" defaultValue="" className={input}>
            <option value="">{c.noClass}</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.levelName} — {locale === "ar" && cls.nameAr ? cls.nameAr : cls.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 pt-5 sm:grid-cols-2">
        <div>
          <label className={label}>{c.parentName}</label>
          <input name="parentName" placeholder={c.parentName} className={input} />
        </div>
        <div>
          <label className={label}>{c.parentPhone}</label>
          <input name="parentPhone" inputMode="tel" placeholder="01000000000" className={input} dir="ltr" />
        </div>
      </div>

      <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <summary className="cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200">
          {locale === "ar" ? "بيانات الدخول (اختياري — تُنشأ تلقائياً)" : "Login details (optional — auto-generated)"}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="code" placeholder={c.code} className={input} dir="ltr" />
          <input name="password" type="password" minLength={6} placeholder={c.password} className={input} dir="ltr" />
        </div>
      </details>

      {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">{state.error}</p>}

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
        <Link href="/students" className="rounded-xl border border-slate-300 px-8 py-3 text-base font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          {c.cancel}
        </Link>
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-base font-bold text-white shadow hover:bg-blue-700 disabled:opacity-60">
          <Icon name="plus" className="h-5 w-5" />
          {pending ? "…" : c.addStudent}
        </button>
      </div>
    </form>
  );
}
