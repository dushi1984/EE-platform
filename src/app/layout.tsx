import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getLocale, getTheme } from "@/lib/i18n-server";
import { I18nProvider } from "@/lib/i18n-client";
import { ensureSeeded } from "@/db/seed";

export const metadata: Metadata = {
  title: { default: "in science — Student Portal", template: "%s · in science" },
  description: "Student portal for in science: tasks, learning materials, grades and profile — in English and Arabic.",
};

const themeScript = `
(function() {
  try {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    }
    var savedLocale = localStorage.getItem('locale');
    if (savedLocale === 'ar') {
      document.documentElement.lang = 'ar';
      document.documentElement.dir = 'rtl';
    } else if (savedLocale === 'en') {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    }
  } catch(e) {}
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
      <body className="min-h-screen bg-[#e6ecef] text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center opacity-70 dark:opacity-[0.08]"
          style={{ backgroundImage: "url(/images/science-bg.jpg)" }}
        />
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
