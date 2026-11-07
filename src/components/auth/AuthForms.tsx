"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n-client";
import type { TKey } from "@/lib/i18n";
import { gradeLabel } from "@/lib/i18n-teacher";
import { Icon } from "@/components/ui";
import {
  areCookiesWorking,
  safeGetLocal,
  safeSetCookie,
  safeSetLocal,
  safeSetSession,
} from "@/lib/browser-prefs";

const groupCls =
  "overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950";
const fieldCls =
  "block w-full border-t border-slate-300 bg-transparent px-4 py-3.5 text-base font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 first:border-t-0 focus:bg-slate-50 focus:placeholder:text-slate-500 sm:px-5 sm:py-4 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900";
const primaryBtn =
  "mt-5 block w-full cursor-pointer rounded-2xl bg-blue-600 py-3.5 text-center text-lg font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type GradeOption = {
  name: string;
  nameAr?: string;
};

const FALLBACK_GRADES: GradeOption[] = [
  { name: "Grade 10", nameAr: "الصف الأول الثانوي" },
  { name: "Grade 11", nameAr: "الصف الثاني الثانوي" },
  { name: "Grade 12", nameAr: "الصف الثالث الثانوي" },
];

function buildPostAuthRedirect(rawDest: string, token?: string) {
  if (typeof window === "undefined") return rawDest;
  try {
    const url = new URL(rawDest, window.location.origin);
    if (areCookiesWorking() && url.searchParams.has("session")) {
      url.searchParams.delete("session");
    } else if (!areCookiesWorking() && token) {
      url.searchParams.set("session", token);
    }
    const savedLocale = safeGetLocal("locale");
    if (!areCookiesWorking() && (savedLocale === "ar" || savedLocale === "en")) {
      url.searchParams.set("lang", savedLocale);
    }
    return url.toString();
  } catch {
    return rawDest;
  }
}

export function RegisterForm({
  error,
  levels = FALLBACK_GRADES,
}: {
  error?: TKey;
  levels?: GradeOption[];
}) {
  const { t, locale } = useI18n();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(error ? t(error) : "");
  const gradeOptions = levels.length > 0 ? levels : FALLBACK_GRADES;

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
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        if (data.token) {
          safeSetLocal("insci_session", data.token);
          safeSetSession("insci_session", data.token);
          safeSetCookie("insci_session", data.token, THIRTY_DAYS);
        }
        window.location.assign(buildPostAuthRedirect(data.next || "/dashboard", data.token));
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
        <input
          name="fullName"
          required
          autoComplete="name"
          placeholder={t("auth.fullName")}
          className={fieldCls}
        />
        <input
          name="parentPhone"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder={t("auth.parentPhone")}
          className={fieldCls}
          dir="auto"
        />
        <input
          name="contact"
          required
          autoComplete="username"
          placeholder={t("auth.phoneOrEmail")}
          className={fieldCls}
          dir="auto"
        />
        <div className="relative border-t border-slate-300 dark:border-slate-700">
          <select
            name="grade"
            required
            defaultValue={gradeOptions[0]?.name ?? "Grade 10"}
            aria-label={t("auth.selectGrade")}
            className="block w-full cursor-pointer appearance-none bg-transparent px-4 py-3.5 pe-11 text-base font-semibold text-slate-900 outline-none focus:bg-slate-50 sm:px-5 sm:py-4 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
          >
            <option value="" disabled>
              {t("auth.selectGrade")}
            </option>
            {gradeOptions.map((g) => (
              <option key={g.name} value={g.name}>
                {locale === "ar" ? g.nameAr || gradeLabel("ar", g.name) : g.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-slate-400">
            <Icon name="graduation" className="h-5 w-5" />
          </span>
        </div>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder={t("auth.password")}
          className={fieldCls}
          dir="auto"
        />
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder={t("auth.confirmPassword")}
          className={fieldCls}
          dir="auto"
        />
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50/90 px-3.5 py-2.5 text-xs font-medium text-navy-700 ring-1 ring-sky-200/70 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-400/20">
        <Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-sky-300" />
        <span>{t("auth.signupPendingNote")}</span>
      </div>

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
  const [errorMessage, setErrorMessage] = useState(
    error === "blocked"
      ? t("errors.accountBlocked")
      : error === "invalid"
        ? t("errors.invalidCredentials")
        : "",
  );

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
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ identifier: idVal, password: passVal, next, remember }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        if (data.token) {
          if (remember) {
            safeSetLocal("insci_session", data.token);
            safeSetCookie("insci_session", data.token, THIRTY_DAYS);
          } else {
            safeSetSession("insci_session", data.token);
            safeSetCookie("insci_session", data.token);
          }
        }
        window.location.assign(buildPostAuthRedirect(data.next || next || "/dashboard", data.token));
        return;
      }

      if (data?.error === "blocked") {
        setErrorMessage(t("errors.accountBlocked"));
        setPending(false);
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
          dir="auto"
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder={t("auth.password")}
          className={fieldCls}
          dir="auto"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer select-none items-center gap-2 py-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4.5 w-4.5 rounded border-slate-300 accent-navy-500"
          />
          {t("auth.rememberMe")}
        </label>
        <Link href="/login/qr" className="py-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
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
