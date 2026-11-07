"use client";

import { useState } from "react";
import { Card, EmptyState, ForwardArrow, Icon } from "./ui";
import { notificationStyle, type NotificationDto } from "./NotificationBell";
import { getActiveSessionToken, navigateWithSession } from "./shell/Shell";
import type { Locale } from "@/lib/i18n";

export function NotificationsFeed({
  initialItems,
  locale,
}: {
  initialItems: NotificationDto[];
  locale: Locale;
}) {
  const [items, setItems] = useState<NotificationDto[]>(initialItems);
  const [tab, setTab] = useState<"all" | "unread">("all");

  const unreadCount = items.filter((n) => !n.readAt).length;
  const visible = tab === "unread" ? items.filter((n) => !n.readAt) : items;

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    const token = getActiveSessionToken();
    await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-session-token": token } : {}),
      },
      body: JSON.stringify({ action: "read_all" }),
    }).catch(() => {});
  };

  const openItem = async (n: NotificationDto) => {
    if (!n.readAt) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, readAt: new Date().toISOString() } : it)));
      const token = getActiveSessionToken();
      await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-session-token": token } : {}),
        },
        body: JSON.stringify({ action: "read", id: n.id }),
      }).catch(() => {});
    }
    navigateWithSession(n.href || "/dashboard");
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === "all"
                ? "bg-navy-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {locale === "ar" ? "الكل" : "All"} ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === "unread"
                ? "bg-navy-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {locale === "ar" ? "غير مقروء" : "Unread"} ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sun-400 px-4 py-2 text-xs font-bold text-navy-900 shadow-xs hover:bg-sun-500"
          >
            <Icon name="check" className="h-4 w-4" />
            {locale === "ar" ? "تحديد الكل كمقروء" : "Mark all as read"}
          </button>
        )}
      </Card>

      {visible.length === 0 ? (
        <EmptyState
          icon="bell"
          title={
            locale === "ar"
              ? "لا توجد إشعارات جديدة حالياً — كل شيء محدّث!"
              : "You are all caught up — no notifications right now."
          }
        />
      ) : (
        <div className="space-y-2.5">
          {visible.map((n) => {
            const st = notificationStyle(n.kind);
            const isUnread = !n.readAt;
            const title = locale === "ar" ? n.titleAr || n.title : n.title;
            const body = locale === "ar" ? n.bodyAr || n.body : n.body;
            return (
              <Card
                key={n.id}
                className={`overflow-hidden transition hover:shadow-md ${
                  isUnread ? "ring-2 ring-navy-500/35 dark:ring-sky-400/35" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className="flex w-full items-center gap-4 p-4 text-start"
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${st.tone}`}>
                    <Icon name={st.icon} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-base ${isUnread ? "font-extrabold text-slate-900 dark:text-white" : "font-bold text-slate-800 dark:text-slate-200"}`}>
                        {title}
                      </p>
                      {isUnread && (
                        <span className="rounded-full bg-sun-400 px-2 py-0.5 text-[10px] font-extrabold text-navy-900">
                          {locale === "ar" ? "جديد" : "NEW"}
                        </span>
                      )}
                    </div>
                    {body && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{body}</p>}
                    <p className="mt-1.5 text-xs text-slate-400">
                      {new Date(n.createdAt).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <ForwardArrow />
                  </span>
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
