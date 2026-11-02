import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, SESSION_HEADER } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { tt } from "@/lib/i18n-teacher";
import { getUnreadMessageCount } from "@/lib/queries";
import { Shell } from "@/components/shell/Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const sessionToken = headerStore.get(SESSION_HEADER) ?? "";
  const user = await getCurrentUser();
  if (!user) redirect(sessionToken ? "/login?reauth=1" : "/login");
  const { t, locale } = await getI18n();
  const c = tt(locale);
  const unreadCount = await getUnreadMessageCount(user.id);

  const items =
    user.role === "teacher"
      ? [
          { href: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" as const },
          { href: "/students", label: c.navStudents, icon: "students" as const },
          { href: "/tasks", label: t("nav.tasks"), icon: "tasks" as const },
          { href: "/materials", label: t("nav.materials"), icon: "materials" as const },
          { href: "/payments", label: c.navPayments, icon: "payments" as const },
          { href: "/messages", label: c.messages, icon: "mail" as const },
          { href: "/settings", label: c.navSettings, icon: "grades" as const },
        ]
      : [
          { href: "/dashboard", label: t("nav.dashboard"), icon: "dashboard" as const },
          { href: "/tasks", label: t("nav.tasks"), icon: "tasks" as const },
          { href: "/materials", label: t("nav.materials"), icon: "materials" as const },
          { href: "/grades", label: t("nav.grades"), icon: "grades" as const },
          { href: "/messages", label: c.messages, icon: "mail" as const },
          { href: "/profile", label: t("nav.profile"), icon: "profile" as const },
        ];

  return (
    <Shell
      items={items}
      brand={t("brand")}
      signOutLabel={t("nav.signOut")}
      menuLabel={t("nav.menu")}
      initialSessionToken={sessionToken}
      unreadCount={unreadCount}
    >
      {children}
    </Shell>
  );
}
