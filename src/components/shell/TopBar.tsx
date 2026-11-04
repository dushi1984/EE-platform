import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/session";
import { getI18n, getTheme } from "@/lib/i18n-server";
import { displayName } from "@/lib/i18n";
import { normalizeAccountStatus } from "@/lib/access";
import { getNotificationsForUser, getUnreadNotificationCount } from "@/lib/notifications";
import { Avatar, Icon, LocaleToggle, ThemeToggle } from "@/components/ui";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileMenuButton } from "./Shell";

export async function TopBar({ title, extra }: { title: string; extra?: ReactNode }) {
  const [user, { t, locale }, theme] = await Promise.all([getCurrentUser(), getI18n(), getTheme()]);
  const [notifItems, unreadNotifications] = user
    ? await Promise.all([getNotificationsForUser(user.id, 12), getUnreadNotificationCount(user.id)])
    : [[], 0];

  const accountStatus = user?.role === "student" ? normalizeAccountStatus(user.accountStatus) : "approved";

  return (
    <header className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-navy-500 px-3 py-2.5 text-white shadow-lg shadow-navy-900/20 sm:px-4 md:grid-cols-[1fr_auto_1fr]">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileMenuButton label={t("nav.menu")} />
        {user ? (
          <Link href="/profile" className="flex min-w-0 items-center gap-3">
            <Avatar name={user.fullName} src={user.avatarUrl} size={44} className="ring-2 ring-white/80" />
            <div className="hidden min-w-0 sm:block">
              <div className="flex items-center gap-2">
                <p className="truncate font-bold leading-tight">{displayName(user.fullName)}</p>
                {accountStatus === "pending" && (
                  <span className="shrink-0 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-navy-900">
                    {locale === "ar" ? "بانتظار الموافقة" : "Pending"}
                  </span>
                )}
                {accountStatus === "suspended" && (
                  <span className="shrink-0 rounded-full bg-rose-400 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {locale === "ar" ? "موقوف" : "Suspended"}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-white/75">
                {user.role === "teacher" ? (
                  locale === "ar" ? "معلمة" : "Teacher"
                ) : (
                  <>
                    {user.grade} · {t("common.studentId")}: <span dir="ltr">{user.studentCode}</span>
                  </>
                )}
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-sun-400 ring-1 ring-white/30">
              <Icon name="sparkles" className="h-5 w-5" />
            </span>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold leading-tight">
                {locale === "ar" ? "وضع الزائر" : "Visitor Mode"}
              </p>
              <p className="truncate text-xs text-white/75">
                {locale === "ar" ? "تصفح كطالب زائر" : "Browsing free preview"}
              </p>
            </div>
          </div>
        )}
      </div>

      <h1 className="order-last col-span-2 truncate text-center text-2xl font-bold tracking-tight md:order-none md:col-span-1 md:text-3xl">{title}</h1>

      <div className="flex items-center justify-end gap-2">
        {extra}
        {user ? (
          <NotificationBell
            locale={locale}
            initialUnread={unreadNotifications}
            initialItems={notifItems.map((n) => ({
              id: n.id,
              kind: n.kind,
              title: n.title,
              titleAr: n.titleAr,
              body: n.body,
              bodyAr: n.bodyAr,
              href: n.href,
              readAt: n.readAt ? n.readAt.toISOString() : null,
              createdAt: n.createdAt.toISOString(),
            }))}
          />
        ) : (
          <Link
            href="/register"
            className="hidden rounded-xl bg-sun-400 px-3.5 py-2 text-xs font-extrabold text-navy-900 shadow-xs transition hover:bg-sun-500 sm:inline-flex"
          >
            {t("auth.register")}
          </Link>
        )}
        <ThemeToggle theme={theme} label={t("common.darkMode")} />
        <LocaleToggle locale={locale} />
      </div>
    </header>
  );
}
