import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/session";
import { getI18n, getTheme } from "@/lib/i18n-server";
import { displayName } from "@/lib/i18n";
import { Avatar, LocaleToggle, ThemeToggle } from "@/components/ui";
import { MobileMenuButton } from "./Shell";

export async function TopBar({ title, extra }: { title: string; extra?: ReactNode }) {
  const [user, { t, locale }, theme] = await Promise.all([getCurrentUser(), getI18n(), getTheme()]);

  return (
    <header className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-navy-500 px-3 py-2.5 text-white shadow-lg shadow-navy-900/20 sm:px-4 md:grid-cols-[1fr_auto_1fr]">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileMenuButton label={t("nav.menu")} />
        {user && (
          <Link href="/profile" className="flex min-w-0 items-center gap-3">
            <Avatar name={user.fullName} src={user.avatarUrl} size={44} className="ring-2 ring-white/80" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate font-bold leading-tight">{displayName(user.fullName)}</p>
              <p className="truncate text-xs text-white/75">
                {user.role === "teacher" ? (
                  locale === "ar" ? "معلمة" : "Teacher"
                ) : (
                  <>
                    {t("common.studentId")}: <span dir="ltr">{user.studentCode}</span>
                  </>
                )}
              </p>
            </div>
          </Link>
        )}
      </div>

      <h1 className="order-last col-span-2 truncate text-center text-2xl font-bold tracking-tight md:order-none md:col-span-1 md:text-3xl">{title}</h1>

      <div className="flex items-center justify-end gap-2">
        {extra}
        <ThemeToggle theme={theme} label={t("common.darkMode")} />
        <LocaleToggle locale={locale} />
      </div>
    </header>
  );
}
