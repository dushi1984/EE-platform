"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n-client";
import { GRADES, tt } from "@/lib/i18n-teacher";
import { createStudentAction, type TeacherActionState } from "@/lib/teacher-actions";
import { Icon } from "@/components/ui";

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white";

export function AddStudentButton() {
  const { locale } = useI18n();
  const c = tt(locale);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [state, action, pending] = useActionState<TeacherActionState, FormData>(createStudentAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      router.refresh();
      const timer = setTimeout(() => setOpen(false), 900);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 active:scale-95"
      >
        <Icon name="plus" className="h-5 w-5" />
        {c.addStudent}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center"
            style={{ zIndex: 200 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="my-auto w-full max-w-md animate-fade-up rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.addStudentTitle}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={c.cancel}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>
              <form ref={formRef} action={action} className="mt-4 space-y-3">
                <input name="fullName" required placeholder={c.fullName} className={input} />
                <input name="contact" required placeholder={c.phoneOrEmail} className={input} dir="ltr" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input name="code" required placeholder={c.code} className={input} dir="ltr" />
                  <select name="grade" defaultValue="Grade 10" className={input}>
                    {GRADES.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <input name="password" type="password" required minLength={6} placeholder={c.password} className={input} dir="ltr" />
                {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{state.error}</p>}
                {state?.success && <p className="rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{state.success}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {c.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {pending ? "…" : c.create}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
