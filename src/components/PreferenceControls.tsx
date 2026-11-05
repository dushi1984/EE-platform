"use client";

import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/i18n-server";
import {
  areCookiesWorking,
  closestElement,
  safeGetCookie,
  safeGetLocal,
  safeGetSession,
  safeSetCookie,
  safeSetLocal,
} from "@/lib/browser-prefs";

const ONE_YEAR = 60 * 60 * 24 * 365;

function persistBrowserPref(key: "locale" | "theme", value: string) {
  safeSetLocal(key, value);
  safeSetCookie(key, value, ONE_YEAR);
}

export function LocaleSyncBridge({ locale }: { locale: Locale }) {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const urlLang = url.searchParams.get("lang");
      const cookieLang = safeGetCookie("locale") || safeGetCookie("locale_p");

      if (urlLang === "en" || urlLang === "ar") {
        persistBrowserPref("locale", urlLang);
      } else if (cookieLang === "en" || cookieLang === "ar") {
        safeSetLocal("locale", cookieLang);
      } else {
        const saved = safeGetLocal("locale");
        if ((saved === "en" || saved === "ar") && saved !== locale) {
          persistBrowserPref("locale", saved);
          url.searchParams.set("lang", saved);
          window.location.replace(url.toString());
          return;
        }
      }
    } catch {
      // Ignore malformed URLs or restricted browser contexts
    }

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = closestElement(e.target);
      const anchor = el?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("data-no-bridge") || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;
      try {
        const saved = safeGetLocal("locale") || safeGetCookie("locale");
        if (saved !== "en" && saved !== "ar") return;
        if (areCookiesWorking() && safeGetCookie("locale") === saved && !window.location.search.includes("lang=")) {
          return;
        }
        const nextUrl = new URL(anchor.href, window.location.origin);
        if (nextUrl.origin !== window.location.origin || nextUrl.pathname.startsWith("/api/")) return;
        if (!nextUrl.searchParams.has("lang")) {
          nextUrl.searchParams.set("lang", saved);
          anchor.href = nextUrl.toString();
        }
      } catch {
        // Ignore URL errors
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [locale]);

  return null;
}

export function ThemeToggle({ theme: initialTheme, label }: { theme: Theme; label: string }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [returnTo, setReturnTo] = useState<string>("");

  useEffect(() => {
    const syncFromDom = () => {
      const domDark = document.documentElement.classList.contains("dark");
      setTheme(domDark ? "dark" : "light");
    };
    syncFromDom();
    try {
      setReturnTo(`${window.location.pathname}${window.location.search}`);
    } catch {
      // ignore
    }
  }, [initialTheme]);

  const nextTheme: Theme = theme === "dark" ? "light" : "dark";
  const fallbackHref = returnTo
    ? `/api/preferences?theme=${nextTheme}&returnTo=${encodeURIComponent(returnTo)}`
    : `/api/preferences?theme=${nextTheme}`;

  const toggleTheme = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const isCurrentlyDark =
      typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : theme === "dark";
    const next: Theme = isCurrentlyDark ? "light" : "dark";
    setTheme(next);

    if (typeof document !== "undefined") {
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      document.documentElement.style.colorScheme = next;
    }

    persistBrowserPref("theme", next);

    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("theme") || !areCookiesWorking()) {
        url.searchParams.set("theme", next);
        window.history.replaceState(window.history.state, "", url.toString());
        setReturnTo(`${url.pathname}${url.search}`);
      }
    } catch {
      // ignore
    }

    try {
      fetch("/api/preferences", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  };

  return (
    <a
      href={fallbackHref}
      data-no-bridge="1"
      role="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 shrink-0 cursor-pointer select-none place-items-center rounded-full bg-navy-800/85 text-white shadow-sm ring-1 ring-white/20 transition hover:bg-navy-900 active:scale-95 dark:bg-slate-800 dark:ring-white/25 dark:hover:bg-slate-700"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-sun-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-sun-400" fill="currentColor">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          <circle cx="17" cy="5" r="1" />
          <circle cx="20" cy="9" r="0.7" />
        </svg>
      )}
    </a>
  );
}

export function LocaleToggle({ locale: initialLocale }: { locale: Locale }) {
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [returnTo, setReturnTo] = useState<string>("");
  const current = pendingLocale ?? initialLocale;
  const changing = pendingLocale !== null;

  useEffect(() => {
    setPendingLocale(null);
    try {
      setReturnTo(`${window.location.pathname}${window.location.search}`);
    } catch {
      // ignore
    }
  }, [initialLocale]);

  const switchLocale = (e: ReactMouseEvent<HTMLAnchorElement>, next: Locale) => {
    e.preventDefault();
    if (next === current || changing) return;
    setPendingLocale(next);
    persistBrowserPref("locale", next);

    try {
      fetch("/api/preferences", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      }).catch(() => {});
    } catch {
      // ignore
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      const token =
        url.searchParams.get("session") ||
        safeGetLocal("insci_session") ||
        safeGetSession("insci_session") ||
        "";
      const isAuthPage =
        url.pathname === "/login" ||
        url.pathname === "/register" ||
        url.pathname.startsWith("/login/");
      if (token && !isAuthPage && (!areCookiesWorking() || url.searchParams.has("session"))) {
        url.searchParams.set("session", token);
      }
      window.location.assign(url.toString());
    } catch {
      window.location.assign(`/api/preferences?locale=${next}`);
    }
  };

  return (
    <div
      className="inline-flex h-10 shrink-0 select-none items-center rounded-full bg-navy-800/85 p-1 shadow-sm ring-1 ring-white/20 dark:bg-slate-800 dark:ring-white/25"
      dir="ltr"
      role="group"
      aria-label="Language"
    >
      {(["en", "ar"] as const).map((l) => {
        const isActive = current === l;
        const href = returnTo
          ? `/api/preferences?locale=${l}&returnTo=${encodeURIComponent(returnTo)}`
          : `/api/preferences?locale=${l}`;
        return (
          <a
            key={l}
            href={href}
            data-no-bridge="1"
            role="button"
            aria-pressed={isActive}
            onClick={(e) => switchLocale(e, l)}
            className={`inline-flex h-8 min-w-[36px] cursor-pointer items-center justify-center rounded-full px-2.5 text-xs font-extrabold uppercase tracking-wide transition active:scale-95 sm:px-3 sm:text-sm ${
              isActive
                ? "bg-sun-400 text-navy-950 shadow-sm"
                : "text-white/85 hover:bg-white/10 hover:text-white"
            } ${changing ? "opacity-75" : ""}`}
          >
            {l}
          </a>
        );
      })}
    </div>
  );
}
