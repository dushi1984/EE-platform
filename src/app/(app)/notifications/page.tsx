import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { getNotificationsForUser } from "@/lib/notifications";
import { TopBar } from "@/components/shell/TopBar";
import { NotificationsFeed } from "@/components/NotificationsFeed";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t, locale } = await getI18n();
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
