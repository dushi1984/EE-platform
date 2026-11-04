import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type StudentPageKey } from "@/db/schema";
import { getCurrentUser, SESSION_HEADER } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { tt } from "@/lib/i18n-teacher";
import {
  canAccessStudentPage,
  firstAllowedPath,
  getAccessPolicy,
  normalizeAccountStatus,
} from "@/lib/access";
import { getUnreadMessageCount } from "@/lib/queries";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { Shell } from "@/components/shell/Shell";
import { Card, Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

function resolveRoutePageKey(pathname: string): StudentPageKey | "teacher_only" | null {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "dashboard";
  if (pathname === "/materials" || pathname.startsWith("/materials/")) return "materials";
  if (pathname === "/tasks" || pathname.startsWith("/tasks/")) return "tasks";
  if (pathname === "/grades" || pathname.startsWith("/grades/")) return "grades";
  if (pathname === "/messages" || pathname.startsWith("/messages/")) return "messages";
  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) return "notifications";
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return "profile";
  if (
    pathname === "/students" ||
    pathname.startsWith("/students/") ||
    pathname === "/payments" ||
    pathname.startsWith("/payments/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  ) {
    return "teacher_only";
  }
  return null;
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const sessionToken = headerStore.get(SESSION_HEADER) ?? "";
  const pathname = headerStore.get("x-pathname") ?? "";

  const [user, policy, { t, locale }] = await Promise.all([
    getCurrentUser(),
    getAccessPolicy(),
    getI18n(),
  ]);
  const c = tt(locale);
  const routeKey = resolveRoutePageKey(pathname);

  // Unauthenticated visitor handling
  if (!user) {
    if (sessionToken) {
      redirect("/login?reauth=1");
    }
    if (!routeKey || routeKey === "teacher_only" || !canAccessStudentPage(null, routeKey, policy)) {
      const nextParam = pathname && pathname !== "/dashboard" ? `?next=${encodeURIComponent(pathname)}` : "";
      redirect(`/login${nextParam}`);
    }

    const allVisitorCandidates: { key: StudentPageKey; href: string; label: string; icon: "dashboard" | "tasks" | "materials" }[] = [
      { key: "dashboard", href: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
      { key: "materials", href: "/materials", label: t("nav.materials"), icon: "materials" },
      { key: "tasks", href: "/tasks", label: t("nav.tasks"), icon: "tasks" },
    ];
    const visitorNav = allVisitorCandidates
      .filter((item) => canAccessStudentPage(null, item.key, policy))
      .map(({ href, label, icon }) => ({ href, label, icon }));

    const visitorHome = firstAllowedPath(null, policy);

    return (
      <Shell
        items={visitorNav}
        brand={t("brand")}
        signOutLabel={t("nav.signOut")}
        signInLabel={t("auth.login")}
        registerLabel={t("auth.register")}
        isGuest
        homeHref={visitorHome}
        menuLabel={t("nav.menu")}
        initialSessionToken=""
        unreadCount={0}
        unreadNotifications={0}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-amber-50/70 px-4 py-3.5 text-sm shadow-xs dark:border-sky-800/60 dark:from-sky-950/50 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300">
              <Icon name="sparkles" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-extrabold text-navy-700 dark:text-white">
                {locale === "ar"
                  ? "أنت تتصفح المنصة كطالب زائر"
                  : "You are exploring as a Visitor Student"}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {locale === "ar"
                  ? "يمكنك معاينة الصفحات والمحتوى المجاني المتاح للزوار. أنشئ حساب طالب لحفظ تقدمك وتسليم المهام."
                  : "Preview open lessons and sample tasks chosen by teachers. Sign up with your grade to track progress and submit work."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-navy-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {t("auth.login")}
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-navy-500 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-navy-600"
            >
              {t("auth.register")}
            </Link>
          </div>
        </div>
        {children}
      </Shell>
    );
  }

  const accountStatus =
    user.role === "student" ? normalizeAccountStatus(user.accountStatus) : "approved";

  // Blocked student screen
  if (user.role === "student" && accountStatus === "blocked") {
    return (
      <Shell
        items={[]}
        brand={t("brand")}
        signOutLabel={t("nav.signOut")}
        menuLabel={t("nav.menu")}
        initialSessionToken={sessionToken}
        unreadCount={0}
        unreadNotifications={0}
      >
        <Card className="mx-auto mt-8 max-w-xl p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/15 text-red-600 dark:text-red-400">
            <Icon name="lock" className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
            {locale === "ar" ? "تم حظر الوصول إلى الحساب" : "Account Access Blocked"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t("errors.accountBlocked")}
          </p>
          {user.statusNote && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {user.statusNote}
            </div>
          )}
        </Card>
      </Shell>
    );
  }

  const [unreadCount, unreadNotifications, pendingRow] = await Promise.all([
    getUnreadMessageCount(user.id, user.role),
    getUnreadNotificationCount(user.id),
    user.role === "teacher"
      ? db
          .select({ n: sql<number>`count(*)`.mapWith(Number) })
          .from(users)
          .where(and(eq(users.role, "student"), eq(users.accountStatus, "pending")))
          .then((r) => r[0]?.n ?? 0)
      : Promise.resolve(0),
  ]);

  const studentNavDefs: {
    key: StudentPageKey;
    href: string;
    label: string;
    icon: "dashboard" | "tasks" | "materials" | "grades" | "mail" | "bell" | "profile";
  }[] = [
    { key: "dashboard", href: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" },
    { key: "tasks", href: "/tasks", label: t("nav.tasks"), icon: "tasks" },
    { key: "materials", href: "/materials", label: t("nav.materials"), icon: "materials" },
    { key: "grades", href: "/grades", label: t("nav.grades"), icon: "grades" },
    { key: "messages", href: "/messages", label: c.messages, icon: "mail" },
    { key: "notifications", href: "/notifications", label: t("nav.notifications"), icon: "bell" },
    { key: "profile", href: "/profile", label: t("nav.profile"), icon: "profile" },
  ];

  const items =
    user.role === "teacher"
      ? [
          { href: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" as const },
          { href: "/students", label: c.navStudents, icon: "students" as const },
          { href: "/tasks", label: t("nav.tasks"), icon: "tasks" as const },
          { href: "/materials", label: t("nav.materials"), icon: "materials" as const },
          { href: "/payments", label: c.navPayments, icon: "payments" as const },
          { href: "/messages", label: c.messages, icon: "mail" as const },
          { href: "/notifications", label: t("nav.notifications"), icon: "bell" as const },
          { href: "/settings", label: c.navSettings, icon: "settings" as const },
        ]
      : studentNavDefs
          .filter((item) => canAccessStudentPage(user, item.key, policy))
          .map(({ href, label, icon }) => ({ href, label, icon }));

  const homeHref = user.role === "teacher" ? "/dashboard" : firstAllowedPath(user, policy);

  return (
    <Shell
      items={items}
      brand={t("brand")}
      signOutLabel={t("nav.signOut")}
      homeHref={homeHref}
      menuLabel={t("nav.menu")}
      initialSessionToken={sessionToken}
      unreadCount={unreadCount}
      unreadNotifications={unreadNotifications}
      pendingStudentsCount={pendingRow}
    >
      {user.role === "student" && accountStatus === "pending" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-sky-50/60 px-4 py-3.5 text-sm shadow-xs dark:border-amber-800/60 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/25 text-amber-800 dark:text-amber-300">
              <Icon name="clock" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-extrabold text-slate-900 dark:text-white">
                {locale === "ar"
                  ? `حسابك بانتظار موافقة المعلم (${user.grade})`
                  : `Account Awaiting Teacher Approval (${user.grade})`}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {locale === "ar"
                  ? "تم إرسال إشعار لمعلمك. يمكنك حالياً استخدام المزايا والمواد المسموح بها مؤقتاً، وستُفتح لك كافة الصلاحيات فور الموافقة."
                  : "Your teacher has been notified! You can explore preview features now, and full access unlocks automatically once approved."}
              </p>
              {user.statusNote && (
                <p className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {locale === "ar" ? "ملاحظة المعلم: " : "Teacher note: "}
                  {user.statusNote}
                </p>
              )}
            </div>
          </div>
          {canAccessStudentPage(user, "messages", policy) && (
            <Link
              href="/messages"
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-navy-600"
            >
              <Icon name="mail" className="h-4 w-4" />
              {locale === "ar" ? "الرسائل" : "Messages"}
            </Link>
          )}
        </div>
      )}

      {user.role === "student" && accountStatus === "suspended" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3.5 text-sm shadow-xs dark:border-rose-900/60 dark:bg-rose-950/40">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300">
              <Icon name="lock" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-extrabold text-rose-900 dark:text-rose-100">
                {locale === "ar" ? "حسابك موقوف مؤقتاً" : "Your Account Is Temporarily Suspended"}
              </p>
              <p className="text-xs text-rose-800/90 dark:text-rose-200/80">
                {locale === "ar"
                  ? "تسليم المهام والاختبارات والمشتريات متوقفة مؤقتاً. تواصل مع معلمك عبر الرسائل للمزيد من التفاصيل."
                  : "Task submissions, quizzes, and purchases are paused while your account is suspended. Check Messages for teacher updates."}
              </p>
              {user.statusNote && (
                <p className="mt-1 text-xs font-bold text-rose-900 dark:text-rose-200">
                  {locale === "ar" ? "ملاحظة المعلم: " : "Teacher note: "}
                  {user.statusNote}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/messages"
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
          >
            <Icon name="mail" className="h-4 w-4" />
            {locale === "ar" ? "مراسلة المعلم" : "Check Messages"}
          </Link>
        </div>
      )}

      {children}
    </Shell>
  );
}
