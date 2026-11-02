"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n-client";
import { updateTaskAction, deleteTaskAction } from "@/lib/actions";
import { Icon } from "@/components/ui";
import type { TaskStatus } from "@/db/schema";
import { reloadWithSession } from "@/components/shell/Shell";

export function TaskActions({ taskId, status, progress }: { taskId: number; status: TaskStatus; progress: number }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(progress);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(progress);
  }, [progress]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const apply = (next: TaskStatus, p = value) =>
    startTransition(async () => {
      await updateTaskAction(taskId, next, p);
      setOpen(false);
      reloadWithSession();
    });

  const handleDelete = () =>
    startTransition(async () => {
      await deleteTaskAction(taskId);
      setOpen(false);
      reloadWithSession();
    });

  const statuses: { key: TaskStatus; label: string; dot: string }[] = [
    { key: "todo", label: t("status.todo"), dot: "bg-blue-500" },
    { key: "in_progress", label: t("status.in_progress"), dot: "bg-yellow-500" },
    { key: "done", label: t("status.done"), dot: "bg-green-500" },
  ];

  const rect = ref.current?.getBoundingClientRect();
  const dropUp = rect ? window.innerHeight - rect.bottom < 300 : false;

  return (
    <div ref={ref} className="relative inline-block" style={{ zIndex: open ? 60 : "auto" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("tasks.actions")}
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <Icon name="dots" className="h-5 w-5" />
      </button>

      {open && (
        <div
          className={`absolute end-0 w-60 rounded-xl bg-white p-3 text-start shadow-2xl ring-1 ring-slate-900/10 dark:bg-slate-900 dark:ring-white/10 animate-fade-up ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          style={{ zIndex: 60 }}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("tasks.setStatus")}</p>
          <div className="space-y-1">
            {statuses.map((s) => (
              <button
                key={s.key}
                type="button"
                disabled={pending}
                onClick={() => apply(s.key, s.key === "done" ? 100 : s.key === "todo" ? 0 : Math.max(value, 20))}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  status === s.key ? "font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                {s.label}
                {status === s.key && <Icon name="check" className="ms-auto h-4 w-4 text-green-600" />}
              </button>
            ))}
          </div>

          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("tasks.updateProgress")}</p>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{value}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              onMouseUp={() => apply(value >= 100 ? "done" : value > 0 ? "in_progress" : "todo", value)}
              onTouchEnd={() => apply(value >= 100 ? "done" : value > 0 ? "in_progress" : "todo", value)}
              className="mt-2 w-full accent-navy-500"
              dir="ltr"
            />
          </div>

          <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
            <button
              type="button"
              disabled={pending}
              onClick={handleDelete}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <span>🗑️</span>
              <span>{locale === "ar" ? "حذف من قائمتي" : "Remove from my tasks"}</span>
            </button>
          </div>

          {pending && <p className="mt-2 text-center text-xs text-slate-500">...</p>}
        </div>
      )}
    </div>
  );
}
