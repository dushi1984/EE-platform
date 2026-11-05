import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, sessionPath } from "@/lib/session";
import { getI18n, getTheme } from "@/lib/i18n-server";
import { LocaleToggle, ThemeToggle } from "@/components/ui";
import { SessionCleaner } from "@/components/auth/SessionCleaner";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(await sessionPath("/dashboard"));
  const [{ t, locale }, theme] = await Promise.all([getI18n(), getTheme()]);

  return (
    <div className="flex min-h-screen flex-col">
      <SessionCleaner />
      <header className="relative z-20 flex items-center justify-end gap-2.5 px-4 pt-4 pb-2 sm:px-6">
        <ThemeToggle theme={theme} label={t("common.darkMode")} />
        <LocaleToggle locale={locale} />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-2 sm:pt-6">
        <div className="w-full max-w-[680px] animate-fade-up rounded-3xl bg-white p-5 shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 sm:p-10 dark:bg-slate-900 dark:ring-white/10">
          {children}
        </div>
      </main>
    </div>
  );
}
