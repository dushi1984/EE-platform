"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { changePasswordAction, updateContactAction, updateNameAction, updateNotificationsAction, updatePhotoAction, type ActionState } from "@/lib/actions";
import { Avatar } from "@/components/ui";

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white";
const greyBtn = "rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600";
const primaryBtn = "rounded-lg bg-navy-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-600 disabled:opacity-50";

function Feedback({ state }: { state: ActionState }) {
  const { t } = useI18n();
  if (!state?.error && !state?.success) return null;
  return (
    <p className={`mt-2 text-sm font-medium ${state.error ? "text-red-600" : "text-green-600"}`} role="status">
      {state.error ? t(state.error) : t(state.success!)}
    </p>
  );
}

export function PhotoForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(updatePhotoAction, null);
  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  return (
    <div className="flex flex-1 flex-wrap items-center gap-5">
      <Avatar name={name} src={avatarUrl} size={96} className="ring-4 ring-slate-100 dark:ring-slate-800" />
      {!editing ? (
        <button type="button" onClick={() => setEditing(true)} className={greyBtn}>
          {t("common.change")}
        </button>
      ) : (
        <form action={action} className="flex min-w-[240px] flex-1 flex-col gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("profile.photoUrl")}</label>
          <div className="flex gap-2">
            <input name="avatarUrl" type="url" defaultValue={avatarUrl ?? ""} placeholder="https://…" className={inputCls} dir="ltr" />
            <button type="submit" disabled={pending} className={primaryBtn}>
              {t("common.save")}
            </button>
          </div>
          <div className="flex gap-3 text-xs">
            <button type="submit" name="avatarUrl" value="" className="text-red-600 hover:underline">
              {t("profile.remove")}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-slate-500 hover:underline">
              {t("common.cancel")}
            </button>
          </div>
          <Feedback state={state} />
        </form>
      )}
      {!editing && <Feedback state={state} />}
    </div>
  );
}

export function NameForm({ fullName }: { fullName: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(updateNameAction, null);
  return (
    <form action={action} className="flex-1">
      <label className="mb-1 block text-sm text-slate-700 dark:text-slate-300" htmlFor="fullName">
        {t("profile.name")}
      </label>
      <div className="flex gap-2">
        <input id="fullName" name="fullName" defaultValue={fullName} required className={inputCls} />
        <button type="submit" disabled={pending} className={primaryBtn}>
          {t("common.save")}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ContactForm({ email, phone, parentPhone }: { email: string | null; phone: string | null; parentPhone: string }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(updateContactAction, null);
  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div className="flex flex-1 items-center justify-between gap-4">
        <p className="truncate text-slate-500 dark:text-slate-400" dir="ltr">
          {[email, phone].filter(Boolean).join(" · ") || "—"}
        </p>
        <button type="button" onClick={() => setEditing(true)} className={greyBtn}>
          {t("common.manage")}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex-1 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("profile.email")}</label>
          <input name="email" type="email" defaultValue={email ?? ""} className={inputCls} dir="ltr" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("profile.phone")}</label>
          <input name="phone" inputMode="tel" defaultValue={phone ?? ""} className={inputCls} dir="ltr" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t("profile.parentPhone")}</label>
          <input name="parentPhone" inputMode="tel" defaultValue={parentPhone} className={inputCls} dir="ltr" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={primaryBtn}>
          {t("common.save")}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:underline">
          {t("common.cancel")}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(changePasswordAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) {
      ref.current?.reset();
      setEditing(false);
    }
  }, [state]);

  if (!editing) {
    return (
      <div className="flex flex-1 items-center justify-end gap-4">
        {state?.success && <Feedback state={state} />}
        <button type="button" onClick={() => setEditing(true)} className={greyBtn}>
          {t("profile.changePassword")}
        </button>
      </div>
    );
  }

  return (
    <form ref={ref} action={action} className="flex-1 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="currentPassword" type="password" required placeholder={t("profile.currentPassword")} autoComplete="current-password" className={inputCls} />
        <input name="newPassword" type="password" required minLength={6} placeholder={t("profile.newPassword")} autoComplete="new-password" className={inputCls} />
        <input name="confirmPassword" type="password" required minLength={6} placeholder={t("profile.confirmNewPassword")} autoComplete="new-password" className={inputCls} />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={primaryBtn}>
          {t("common.save")}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:underline">
          {t("common.cancel")}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function NotificationsForm({ notifyEmail, notifySms, notifyTasks }: { notifyEmail: boolean; notifySms: boolean; notifyTasks: boolean }) {
  const { t } = useI18n();
  const ref = useRef<HTMLFormElement>(null);
  const rows = [
    { name: "notifyEmail", checked: notifyEmail, label: t("profile.emailNotifications"), hint: t("profile.emailNotificationsHint") },
    { name: "notifySms", checked: notifySms, label: t("profile.smsNotifications"), hint: t("profile.smsNotificationsHint") },
    { name: "notifyTasks", checked: notifyTasks, label: t("profile.taskReminders"), hint: t("profile.taskRemindersHint") },
  ];
  return (
    <form ref={ref} action={updateNotificationsAction} className="divide-y divide-slate-200 dark:divide-slate-700">
      {rows.map((r) => (
        <label key={r.name} className="flex cursor-pointer items-center justify-between gap-4 py-4">
          <span>
            <span className="block font-semibold text-slate-900 dark:text-white">{r.label}</span>
            <span className="block text-sm text-slate-500 dark:text-slate-400">{r.hint}</span>
          </span>
          <span className="relative inline-flex shrink-0">
            <input type="checkbox" name={r.name} defaultChecked={r.checked} onChange={() => ref.current?.requestSubmit()} className="peer sr-only" />
            <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-navy-500 peer-focus-visible:ring-2 peer-focus-visible:ring-navy-500/40 dark:bg-slate-600" />
            <span className="absolute start-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5 rtl:peer-checked:-translate-x-5" />
          </span>
        </label>
      ))}
    </form>
  );
}
