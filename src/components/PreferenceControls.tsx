"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/i18n-server";

export function ThemeToggle({ theme: initialTheme, label }: { theme: Theme; label: string }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    const saved = (localStorage.getItem("theme") as Theme) || (isDark ? "dark" : "light");
    setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);

    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    try {
      localStorage.setItem("theme", next);
      document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
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
      className="grid h-10 w-10 place-items-center rounded-full bg-navy-900/60 text-white ring-1 ring-white/10 transition hover:bg-navy-900 active:scale-95"
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
  const [current, setCurrent] = useState<Locale>(initialLocale);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get("lang") as Locale | null;
    const saved = (urlLang === "en" || urlLang === "ar" ? urlLang : (localStorage.getItem("locale") as Locale)) || initialLocale;
    if (saved === "en" || saved === "ar") setCurrent(saved);
  }, [initialLocale]);

  const switchLocale = async (next: Locale) => {
    if (next === current || changing) return;
    setChanging(true);
    setCurrent(next);

    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";

    try {
      localStorage.setItem("locale", next);
      document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }

    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      // ignore
    }

    // Navigate with explicit ?lang= and preserved ?session= so iframe environments
    // without third-party cookies still switch language and RTL immediately.
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    try {
      const token =
        url.searchParams.get("session") ||
        localStorage.getItem("insci_session") ||
        sessionStorage.getItem("insci_session") ||
        "";
      if (token && url.pathname !== "/login" && url.pathname !== "/register") {
        url.searchParams.set("session", token);
      }
    } catch {
      // ignore
    }
    window.location.assign(url.toString());
  };

  return (
    <div className="flex items-center rounded-full bg-navy-900/60 p-1 ring-1 ring-white/10" dir="ltr">
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
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
