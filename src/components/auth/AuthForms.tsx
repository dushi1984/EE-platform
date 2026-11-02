"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n-client";
import type { TKey } from "@/lib/i18n";

const groupCls =
  "overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950";
const fieldCls =
  "block w-full border-t border-slate-300 bg-transparent px-5 py-4 text-base font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 first:border-t-0 focus:bg-slate-50 focus:placeholder:text-slate-500 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900";
const primaryBtn =
  "mt-5 block w-full rounded-2xl bg-blue-600 py-3.5 text-center text-lg font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60";

export function RegisterForm({ error }: { error?: TKey }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(error ? t(error) : "");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrorMessage("");
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        if (data.token) {
          try {
            localStorage.setItem("insci_session", data.token);
            sessionStorage.setItem("insci_session", data.token);
            document.cookie = `insci_session=${encodeURIComponent(data.token)}; path=/; max-age=2592000; SameSite=Lax`;
          } catch {
            // ignore
          }
        }
        window.location.href = data.next || "/dashboard";
        return;
      }

      if (data?.error) {
        setErrorMessage(t(data.error as TKey));
        setPending(false);
        return;
      }

      setErrorMessage(t("errors.contactTaken"));
      setPending(false);
    } catch {
      form.submit();
    }
  }

  return (
    <form action="/api/auth/register" method="post" className="mt-6" onSubmit={handleRegister}>
      <div className={groupCls}>
        <input name="fullName" required autoComplete="name" placeholder={t("auth.fullName")} className={fieldCls} />
        <input name="parentPhone" required inputMode="tel" autoComplete="tel" placeholder={t("auth.parentPhone")} className={fieldCls} />
        <input name="contact" required autoComplete="username" placeholder={t("auth.phoneOrEmail")} className={fieldCls} />
        <input name="code" required placeholder={t("auth.code")} className={fieldCls} dir="ltr" />
        <input name="password" type="password" required minLength={6} autoComplete="new-password" placeholder={t("auth.password")} className={fieldCls} dir="ltr" />
        <input name="confirmPassword" type="password" required minLength={6} autoComplete="new-password" placeholder={t("auth.confirmPassword")} className={fieldCls} dir="ltr" />
      </div>
      <p className="mt-2 px-1 text-xs text-slate-500 dark:text-slate-400">{t("auth.codeHint")}</p>
      <div className="mt-3 flex justify-end">
        <Link href="/login/qr" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          {t("auth.loginWithQr")}
        </Link>
      </div>
      {errorMessage && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {errorMessage}
        </p>
      )}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? t("auth.registering") : t("auth.submitRegister")}
      </button>
    </form>
  );
}

export function LoginForm({ next, error, identifier }: { next: string; error?: string; identifier?: string }) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errorMessage, setErrorMessage] = useState(error === "invalid" ? t("errors.invalidCredentials") : "");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrorMessage("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const idVal = String(formData.get("identifier") ?? "").trim();
    const passVal = String(formData.get("password") ?? "");

    if (!idVal || !passVal) {
      setErrorMessage(t("errors.invalidCredentials"));
      setPending(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ identifier: idVal, password: passVal, next, remember }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        if (data.token) {
          try {
            if (remember) {
              localStorage.setItem("insci_session", data.token);
              document.cookie = `insci_session=${encodeURIComponent(data.token)}; path=/; max-age=2592000; SameSite=Lax`;
            } else {
              sessionStorage.setItem("insci_session", data.token);
              document.cookie = `insci_session=${encodeURIComponent(data.token)}; path=/; SameSite=Lax`;
            }
          } catch {
            // ignore storage quota
          }
        }
        window.location.href = data.next || next || "/dashboard";
        return;
      }

      setErrorMessage(t("errors.invalidCredentials"));
      setPending(false);
    } catch {
      form.submit();
    }
  }

  return (
    <form action="/api/auth/login" method="post" className="mt-6" onSubmit={handleLogin}>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="remember" value={remember ? "on" : "off"} />
      <div className={groupCls}>
        <input
          name="identifier"
          required
          autoComplete="username"
          defaultValue={identifier}
          placeholder={t("auth.identifier")}
          className={fieldCls}
          dir="ltr"
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder={t("auth.password")}
          className={fieldCls}
          dir="ltr"
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-navy-500"
          />
          {t("auth.rememberMe")}
        </label>
        <Link href="/login/qr" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          {t("auth.loginWithQr")}
        </Link>
      </div>
      {errorMessage && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {errorMessage}
        </p>
      )}
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {t("auth.signingIn")}
          </span>
        ) : (
          t("auth.submitLogin")
        )}
      </button>
    </form>
  );
}
