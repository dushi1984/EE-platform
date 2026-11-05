import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/cairo";
import "./globals.css";
import { getLocale, getTheme } from "@/lib/i18n-server";
import { I18nProvider } from "@/lib/i18n-client";
import { LocaleSyncBridge } from "@/components/PreferenceControls";
import { ensureSeeded } from "@/db/seed";

export const metadata: Metadata = {
  title: { default: "in science — Student Portal", template: "%s · in science" },
  description: "Student portal for in science: tasks, learning materials, grades and profile — in English and Arabic.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `
(function() {
  var pref = null;
  try {
    var m = /[?&]theme=(dark|light)(?:&|$)/.exec(window.location.search);
    if (m) pref = m[1];
  } catch (e) {}
  if (!pref) {
    try {
      var s = window.localStorage.getItem('theme');
      if (s === 'dark' || s === 'light') pref = s;
    } catch (e) {}
  }
  if (!pref) {
    try {
      var c = document.cookie.match(/(?:^|;\\s*)theme(?:_p)?=(dark|light)(?:;|$)/);
      if (c) pref = c[1];
    } catch (e) {}
  }
  if (!pref) {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        pref = 'dark';
      }
    } catch (e) {}
  }
  if (pref === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  } else if (pref === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }
})();
`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  if (process.env.DATABASE_URL && process.env.NEXT_PHASE !== "phase-production-build") {
    await ensureSeeded();
  }

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={theme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen overflow-x-hidden bg-[#e6ecef] text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-70 dark:opacity-[0.08]"
          style={{ backgroundImage: "url(/images/science-bg.jpg)" }}
        />
        <div className="relative z-10 min-h-screen">
          <LocaleSyncBridge locale={locale} />
          <I18nProvider locale={locale}>{children}</I18nProvider>
        </div>
      </body>
    </html>
  );
}
