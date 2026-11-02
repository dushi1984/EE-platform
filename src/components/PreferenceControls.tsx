"use client";

import { useState, useSyncExternalStore } from "react";
import type { Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/i18n-server";
import { useEffect } from "react";

function persistBrowserPref(key: "locale" | "theme", value: string) {
  try {
    window.localStorage.setItem(key, value);
    window.document.cookie = `${key}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // ignore storage restrictions
  }
}

export function LocaleSyncBridge({ locale }: { locale: Locale }) {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const urlLang = url.searchParams.get("lang");
      if (urlLang === "en" || urlLang === "ar") {
        persistBrowserPref("locale", urlLang);
      } else {
        const saved = window.localStorage.getItem("locale");
        if ((saved === "en" || saved === "ar") && saved !== locale) {
          url.searchParams.set("lang", saved);
          window.location.replace(url.toString());
          return;
        }
      }
    } catch {
      // ignore storage restrictions
    }

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;
      try {
        const saved = window.localStorage.getItem("locale");
        if (saved !== "en" && saved !== "ar") return;
        const hasCookie = window.document.cookie.split(";").some((c) => c.trim() === `locale=${saved}`);
        if (hasCookie && !window.location.search.includes("lang=")) return;
        const nextUrl = new URL(anchor.href, window.location.origin);
        if (nextUrl.origin !== window.location.origin || nextUrl.pathname.startsWith("/api/")) return;
        if (!nextUrl.searchParams.has("lang")) {
          nextUrl.searchParams.set("lang", saved);
          anchor.href = nextUrl.toString();
        }
      } catch {
        // ignore URL/storage errors
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [locale]);

  return null;
}

function subscribeNoop() {
  return () => {};
}

export function ThemeToggle({ theme: initialTheme, label }: { theme: Theme; label: string }) {
  const clientInitial = useSyncExternalStore<Theme>(
    subscribeNoop,
    () => {
      const saved = window.localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") return saved;
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    },
    () => initialTheme,
  );
  const [overrideTheme, setOverrideTheme] = useState<Theme | null>(null);
  const theme = overrideTheme ?? clientInitial;

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setOverrideTheme(next);

    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    persistBrowserPref("theme", next);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("theme")) {
        url.searchParams.set("theme", next);
        window.history.replaceState(window.history.state, "", url.toString());
      }
    } catch {
      // ignore
    }

    fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-900/60 text-white ring-1 ring-white/10 transition hover:bg-navy-900 active:scale-95"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-sun-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          <circle cx="17" cy="5" r="1" className="fill-sun-400" />
          <circle cx="20" cy="9" r="0.7" className="fill-sun-400" />
        </svg>
      )}
    </button>
  );
}

export function LocaleToggle({ locale: initialLocale }: { locale: Locale }) {
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const current = pendingLocale ?? initialLocale;
  const changing = pendingLocale !== null;

  const switchLocale = async (next: Locale) => {
    if (next === current || changing) return;
    setPendingLocale(next);
    persistBrowserPref("locale", next);

    try {
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 1500) : null;
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
        signal: ctrl?.signal,
      });
      if (timer) clearTimeout(timer);
    } catch {
      // ignore
    }

    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    try {
      const token =
        url.searchParams.get("session") ||
        window.localStorage.getItem("insci_session") ||
        window.sessionStorage.getItem("insci_session") ||
        "";
      if (token && url.pathname !== "/login" && url.pathname !== "/register" && !url.pathname.startsWith("/login/")) {
        url.searchParams.set("session", token);
      }
    } catch {
      // ignore
    }
    window.location.assign(url.toString());
  };

  return (
    <div className="flex shrink-0 items-center rounded-full bg-navy-900/60 p-1 ring-1 ring-white/10" dir="ltr">
      {(["en", "ar"] as const).map((l) => {
        const isActive = current === l;
        return (
          <button
            key={l}
            type="button"
            disabled={changing}
            onClick={() => switchLocale(l)}
            aria-pressed={isActive}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold uppercase transition active:scale-95 ${
              isActive
                ? "bg-slate-900 text-white shadow"
                : "text-white/80 hover:text-white"
            } ${changing ? "opacity-75" : ""}`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
