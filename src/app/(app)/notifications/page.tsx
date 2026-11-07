import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { canAccessStudentPage, firstAllowedPath, getAccessPolicy } from "@/lib/access";
import { getNotificationsForUser } from "@/lib/notifications";
import { TopBar } from "@/components/shell/TopBar";
import { NotificationsFeed } from "@/components/NotificationsFeed";
import { PageAccessNotice } from "@/components/PageAccessNotice";

export default async function NotificationsPage() {
  const [user, policy, { t, locale }] = await Promise.all([
    getCurrentUser(),
    getAccessPolicy(),
    getI18n(),
  ]);
  if (!user) redirect("/login");
  if (user.role === "student" && !canAccessStudentPage(user, "notifications", policy)) {
    return (
      <>
        <TopBar title={t("notifications.title")} />
        <PageAccessNotice locale={locale} backHref={firstAllowedPath(user, policy)} />
      </>
    );
  }
  const rows = await getNotificationsForUser(user.id, 60);

  return (
    <>
      <TopBar title={t("notifications.title")} />
      <NotificationsFeed
        locale={locale}
        initialItems={rows.map((r) => ({
          id: r.id,
          kind: r.kind,
          title: r.title,
          titleAr: r.titleAr,
          body: r.body,
          bodyAr: r.bodyAr,
          href: r.href,
          readAt: r.readAt ? r.readAt.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
