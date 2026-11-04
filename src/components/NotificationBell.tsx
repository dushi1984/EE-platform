"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./ui";
import { getActiveSessionToken, navigateWithSession } from "./shell/Shell";
import type { Locale } from "@/lib/i18n";

export type NotificationDto = {
  id: number;
  kind: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  href: string;
  readAt: string | Date | null;
  createdAt: string | Date;
};

export function notificationStyle(kind: string): { icon: IconName; tone: string } {
  switch (kind) {
    case "quiz":
      return {
        icon: "quiz",
        tone: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
      };
    case "task":
      return {
        icon: "clipboard",
        tone: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
      };
    case "grade":
      return {
        icon: "trophy",
        tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
      };
    case "material":
      return {
        icon: "flask",
        tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      };
    case "message":
      return {
        icon: "mail",
        tone: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
      };
    case "submission":
      return {
        icon: "upload",
        tone: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
      };
    case "student":
      return {
        icon: "students",
        tone: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
      };
    default:
      return {
        icon: "sparkles",
        tone: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
      };
  }
}

export function NotificationBell({
  initialItems,
  initialUnread,
  locale,
}: {
  initialItems: NotificationDto[];
  initialUnread: number;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setUnread(initialUnread);
  }, [initialItems, initialUnread]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const markAllRead = async () => {
    setUnread(0);
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

  const openNotification = async (n: NotificationDto) => {
    setOpen(false);
    if (!n.readAt) {
      setUnread((c) => Math.max(0, c - 1));
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={locale === "ar" ? "الإشعارات" : "Notifications"}
        className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
      >
        <Icon name="bell" className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-sun-400 px-1 text-[10px] font-extrabold leading-none text-navy-900 shadow-sm ring-2 ring-navy-500">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-12 z-50 w-[min(23rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-slate-900/10 dark:bg-slate-900 dark:text-white dark:ring-white/15">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-navy-500/8 to-sky-500/8 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy-500 text-white">
                <Icon name="bell" className="h-4 w-4" />
              </span>
              <p className="text-sm font-bold">{locale === "ar" ? "الإشعارات" : "Notifications"}</p>
              {unread > 0 && (
                <span className="rounded-full bg-sun-400 px-2 py-0.5 text-[11px] font-bold text-navy-900">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-navy-600 hover:underline dark:text-sky-400"
              >
                {locale === "ar" ? "تحديد الكل كمقروء" : "Mark all read"}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                <Icon name="sparkles" className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {locale === "ar" ? "لا توجد إشعارات بعد" : "No notifications yet"}
              </p>
            </div>
          ) : (
            <div className="thin-scroll max-h-88 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {items.slice(0, 8).map((n) => {
                const st = notificationStyle(n.kind);
                const isUnread = !n.readAt;
                const title = locale === "ar" ? n.titleAr || n.title : n.title;
                const body = locale === "ar" ? n.bodyAr || n.body : n.body;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-start transition hover:bg-slate-50 dark:hover:bg-slate-800/70 ${
                      isUnread ? "bg-sky-50/60 dark:bg-sky-500/8" : ""
                    }`}
                  >
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${st.tone}`}>
                      <Icon name={st.icon} className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`line-clamp-1 text-sm ${isUnread ? "font-bold" : "font-semibold"}`}>{title}</p>
                        {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-navy-500 dark:bg-sky-400" />}
                      </div>
                      {body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{body}</p>}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(n.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-center dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigateWithSession("/notifications");
              }}
              className="text-xs font-bold text-navy-600 hover:underline dark:text-sky-400"
            >
              {locale === "ar" ? "عرض كل الإشعارات" : "View all notifications"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
