"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Icon, Logo } from "@/components/ui";
import {
  areCookiesWorking,
  closestElement,
  safeDeleteCookie,
  safeGetCookie,
  safeGetLocal,
  safeGetSession,
  safeRemoveLocal,
  safeRemoveSession,
  safeSetCookie,
  safeSetLocal,
} from "@/lib/browser-prefs";

type NavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "tasks" | "materials" | "grades" | "profile" | "students" | "payments" | "mail" | "bell" | "settings";
};

type ShellCtx = { open: boolean; setOpen: (v: boolean) => void; sessionToken: string; unreadCount: number };
const Ctx = createContext<ShellCtx>({ open: false, setOpen: () => {}, sessionToken: "", unreadCount: 0 });

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function useSessionToken() {
  const { sessionToken } = useContext(Ctx);
  return sessionToken;
}

export function getActiveSessionToken(fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  let queryToken = "";
  try {
    const params = new URLSearchParams(window.location.search);
    queryToken = params.get("session") || "";
  } catch {
    // ignore
  }
  return (
    queryToken ||
    fallback ||
    safeGetLocal("insci_session") ||
    safeGetSession("insci_session") ||
    safeGetCookie("insci_session") ||
    ""
  );
}

export function buildSessionUrl(raw: string, explicitToken?: string): string {
  if (typeof window === "undefined") return raw;
  const token = explicitToken ?? getActiveSessionToken();
  const url = new URL(raw, window.location.origin);
  if (url.origin !== window.location.origin) return url.toString();
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    return url.toString();
  }
  const isAuthPage =
    url.pathname === "/login" ||
    url.pathname.startsWith("/login/") ||
    url.pathname === "/register";

  const cookiesOk = areCookiesWorking();
  if (token && !isAuthPage && (!cookiesOk || window.location.search.includes("session="))) {
    url.searchParams.set("session", token);
  }
  try {
    const currentParams = new URLSearchParams(window.location.search);
    const locale = safeGetLocal("locale") || currentParams.get("lang");
    const theme = safeGetLocal("theme") || currentParams.get("theme");
    if (!cookiesOk || currentParams.has("lang")) {
      if (locale === "en" || locale === "ar") url.searchParams.set("lang", locale);
    }
    if (!cookiesOk || currentParams.has("theme")) {
      if (theme === "light" || theme === "dark") url.searchParams.set("theme", theme);
    }
  } catch {
    // ignore
  }
  return url.toString();
}

export function navigateWithSession(rawPath: string, explicitToken?: string) {
  if (typeof window === "undefined") return;
  window.location.assign(buildSessionUrl(rawPath, explicitToken));
}

export function reloadWithSession(explicitToken?: string) {
  if (typeof window === "undefined") return;
  window.location.assign(buildSessionUrl(window.location.href, explicitToken));
}

export function MobileMenuButton({ label }: { label: string }) {
  const { open, setOpen } = useContext(Ctx);
  return (
    <label
      htmlFor="insci-mobile-drawer"
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-expanded={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(!open);
        }
      }}
      className="grid h-10 w-10 shrink-0 cursor-pointer select-none place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20 active:scale-95 lg:hidden"
    >
      <Icon name="menu" className="h-6 w-6" />
    </label>
  );
}

function clearClientSession() {
  safeRemoveLocal("insci_session");
  safeRemoveSession("insci_session");
  safeDeleteCookie("insci_session");
}

function SignOutButton({ label, collapsed }: { label: string; collapsed: boolean }) {
  const { sessionToken } = useContext(Ctx);
  const [busy, setBusy] = useState(false);

  const suffix = sessionToken ? `?session=${encodeURIComponent(sessionToken)}` : "";
  const logoutActionUrl = `/api/auth/logout${suffix}`;

  const doSignOut = async () => {
    if (busy) return;
    setBusy(true);
    const token = getActiveSessionToken(sessionToken);
    try {
      const tokSuffix = token ? `?session=${encodeURIComponent(token)}` : "";
      await fetch(`/api/auth/logout${tokSuffix}`, {
        method: "POST",
        credentials: "same-origin",
        redirect: "manual",
        headers: token ? { "x-session-token": token } : undefined,
      });
    } catch {
      // Local session is still cleared below if offline.
    }
    clearClientSession();
    let loginUrl = "/login?logged_out=1";
    const savedLocale = safeGetLocal("locale");
    if ((savedLocale === "ar" || savedLocale === "en") && !areCookiesWorking()) {
      loginUrl += `&lang=${savedLocale}`;
    }
    window.location.replace(loginUrl);
  };

  return (
    <form
      action={logoutActionUrl}
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        void doSignOut();
      }}
    >
      <button
        type="submit"
        disabled={busy}
        title={label}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-[15px] text-white/85 transition hover:bg-white/10 hover:text-white active:bg-white/15 disabled:opacity-60 ${
          collapsed ? "lg:justify-center lg:px-0" : ""
        }`}
      >
        <Icon name="logout" className="h-5 w-5 shrink-0" />
        <span className={`truncate ${collapsed ? "lg:sr-only" : ""}`}>{busy ? "…" : label}</span>
      </button>
    </form>
  );
}

function SessionNavigationBridge({ token }: { token: string }) {
  useEffect(() => {
    const activeToken = getActiveSessionToken(token);
    if (!activeToken) return;

    const cookiesOk = areCookiesWorking();

    // Only keep ?session= in the address bar when cookies are blocked by the browser/frame.
    if (!cookiesOk) {
      try {
        const current = new URL(window.location.href);
        if (current.searchParams.get("session") !== activeToken) {
          current.searchParams.set("session", activeToken);
          window.history.replaceState(window.history.state, "", current.toString());
        }
      } catch {
        // ignore
      }
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const el = closestElement(event.target);
      const anchor = el?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("data-no-bridge") || anchor.hasAttribute("download") || anchor.target === "_blank") {
        return;
      }
      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;

      // When first-party cookies work (standard mobile & desktop browsers), let Next.js <Link>
      // handle fast client-side navigation directly; cookies + patched fetch carry auth.
      if (areCookiesWorking() && !window.location.search.includes("session=")) {
        return;
      }

      try {
        const nextHref = buildSessionUrl(anchor.href, activeToken);
        const url = new URL(nextHref, window.location.origin);
        if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
        anchor.href = url.toString();

        event.preventDefault();
        window.location.assign(url.toString());
      } catch {
        // ignore
      }
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const method = (form.getAttribute("method") || "get").toLowerCase();
      if (method === "get" && (!areCookiesWorking() || window.location.search.includes("session="))) {
        if (!form.querySelector('input[name="session"]')) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "session";
          input.value = activeToken;
          form.appendChild(input);
        }
        const locale = safeGetLocal("locale");
        if ((locale === "en" || locale === "ar") && !form.querySelector('input[name="lang"]')) {
          const langInput = document.createElement("input");
          langInput.type = "hidden";
          langInput.name = "lang";
          langInput.value = locale;
          form.appendChild(langInput);
        }
      }
    };

    // Attach session, locale, and theme headers to all same-origin fetches & Server Actions.
    const nativeFetch = window.fetch.bind(window);
    const sessionFetch: typeof window.fetch = (input, init = {}) => {
      try {
        const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
        const url = new URL(rawUrl, window.location.origin);
        if (url.origin !== window.location.origin) return nativeFetch(input, init);

        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        if (init.headers) {
          new Headers(init.headers).forEach((value, key) => headers.set(key, value));
        }
        if (!headers.has("x-session-token")) headers.set("x-session-token", activeToken);

        const savedLocale = safeGetLocal("locale") || safeGetCookie("locale");
        const savedTheme = safeGetLocal("theme") || safeGetCookie("theme");
        if ((savedLocale === "en" || savedLocale === "ar") && !headers.has("x-locale")) {
          headers.set("x-locale", savedLocale);
        }
        if ((savedTheme === "light" || savedTheme === "dark") && !headers.has("x-theme")) {
          headers.set("x-theme", savedTheme);
        }

        if (
          (typeof input === "string" || input instanceof URL) &&
          !url.pathname.startsWith("/api/auth/") &&
          (!areCookiesWorking() || window.location.search.includes("session="))
        ) {
          if (!url.searchParams.has("session")) url.searchParams.set("session", activeToken);
          return nativeFetch(url.toString(), { ...init, headers });
        }

        return nativeFetch(input, { ...init, headers });
      } catch {
        return nativeFetch(input, init);
      }
    };
    window.fetch = sessionFetch;

    document.addEventListener("click", onClick, false);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, false);
      document.removeEventListener("submit", onSubmit, true);
      if (window.fetch === sessionFetch) window.fetch = nativeFetch;
    };
  }, [token]);

  return null;
}

export function Shell({
  items,
  brand,
  signOutLabel,
  signInLabel,
  registerLabel,
  isGuest = false,
  homeHref = "/dashboard",
  menuLabel,
  initialSessionToken,
  unreadCount,
  unreadNotifications = 0,
  pendingStudentsCount = 0,
  children,
}: {
  items: NavItem[];
  brand: string;
  signOutLabel: string;
  signInLabel?: string;
  registerLabel?: string;
  isGuest?: boolean;
  homeHref?: string;
  menuLabel: string;
  initialSessionToken: string;
  unreadCount: number;
  unreadNotifications?: number;
  pendingStudentsCount?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sessionToken, setSessionToken] = useState(initialSessionToken);
  const [unread, setUnread] = useState(unreadCount);
  const [unreadNotifs, setUnreadNotifs] = useState(unreadNotifications);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
      document.body.style.overflow = "hidden";
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setUnreadNotifs(unreadNotifications);
  }, [unreadNotifications]);

  useEffect(() => {
    if (pathname === "/messages" && unread > 0) {
      const timer = setTimeout(() => setUnread(0), 5000);
      return () => clearTimeout(timer);
    }
  }, [pathname, unread]);

  useEffect(() => {
    const token = getActiveSessionToken(initialSessionToken);
    if (!token) return;
    setSessionToken(token);
    safeSetLocal("insci_session", token);
    safeSetCookie("insci_session", token, THIRTY_DAYS);
  }, [initialSessionToken]);

  const buildHref = (path: string) => {
    if (!sessionToken || path.includes("session=")) return path;
    if (typeof document !== "undefined" && areCookiesWorking() && !window.location.search.includes("session=")) {
      return path;
    }
    const [base, hash] = path.split("#");
    const joiner = base.includes("?") ? "&" : "?";
    return `${base}${joiner}session=${encodeURIComponent(sessionToken)}${hash ? `#${hash}` : ""}`;
  };

  return (
    <Ctx.Provider value={{ open, setOpen, sessionToken, unreadCount: unread }}>
      <SessionNavigationBridge token={sessionToken} />
      <div className="mx-auto max-w-[1440px] p-3 sm:p-5">
        {/* Progressive HTML checkbox keeps mobile drawer functional even before JS hydration */}
        <input
          id="insci-mobile-drawer"
          type="checkbox"
          checked={open}
          onChange={(e) => setOpen(e.target.checked)}
          className="sr-only"
          aria-hidden="true"
        />

        <label
          htmlFor="insci-mobile-drawer"
          data-open={open ? "true" : "false"}
          aria-label="Close menu"
          className="app-sidebar-backdrop lg:hidden"
        />

        <div className="flex items-start gap-5">
          <aside
            data-open={open ? "true" : "false"}
            className={`app-sidebar flex shrink-0 flex-col bg-navy-500 text-white shadow-2xl lg:sticky lg:top-5 lg:z-30 lg:h-[calc(100vh-2.5rem)] lg:rounded-2xl lg:transition-[width] lg:duration-300 ${
              collapsed ? "lg:w-[4.75rem]" : "lg:w-56"
            }`}
          >
            <div className={`flex items-center px-3 py-4 ${collapsed ? "lg:justify-center" : "justify-between"}`}>
              <Link
                href={buildHref(homeHref)}
                prefetch={false}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 overflow-hidden ${collapsed ? "lg:hidden" : ""}`}
              >
                <Logo className="h-8 w-8 shrink-0 text-white" />
                <span className="truncate text-xl font-bold tracking-tight" dir="ltr">
                  {brand}
                </span>
              </Link>

              {/* Mobile drawer close control (works with or without JS via #insci-mobile-drawer) */}
              <label
                htmlFor="insci-mobile-drawer"
                role="button"
                tabIndex={0}
                aria-label="Close menu"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(false);
                  }
                }}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-white hover:bg-white/10 active:bg-white/20 lg:hidden"
              >
                <Icon name="x" className="h-6 w-6" />
              </label>

              {/* Desktop collapse button */}
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={menuLabel}
                className="hidden h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg hover:bg-white/10 lg:grid"
              >
                <Icon name="menu" className="h-7 w-7" />
              </button>
            </div>

            <nav className="thin-scroll mt-2 flex flex-1 flex-col gap-2.5 overflow-y-auto px-2.5">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={buildHref(item.href)}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    title={item.label}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] transition ${
                      active
                        ? "bg-sun-400 font-semibold text-navy-800 shadow-md shadow-black/10"
                        : "text-white hover:bg-white/10 active:bg-white/15"
                    } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
                  >
                    <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                    <span className={`truncate ${collapsed ? "lg:sr-only" : ""}`}>{item.label}</span>
                    {item.icon === "students" && pendingStudentsCount > 0 && (
                      <span
                        className={`ms-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-amber-400 px-1.5 text-[11px] font-extrabold leading-none text-navy-900 ${
                          collapsed ? "lg:absolute lg:end-1.5 lg:top-1.5" : ""
                        }`}
                        title={`${pendingStudentsCount} pending`}
                      >
                        {pendingStudentsCount > 9 ? "9+" : pendingStudentsCount}
                      </span>
                    )}
                    {item.icon === "mail" && unread > 0 && (
                      <span
                        className={`ms-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white ${
                          collapsed ? "lg:absolute lg:end-1.5 lg:top-1.5" : ""
                        }`}
                        title={`${unread} unread`}
                      >
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                    {item.icon === "bell" && unreadNotifs > 0 && (
                      <span
                        className={`ms-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-sun-400 px-1.5 text-[11px] font-extrabold leading-none text-navy-900 ${
                          collapsed ? "lg:absolute lg:end-1.5 lg:top-1.5" : ""
                        }`}
                        title={`${unreadNotifs} unread`}
                      >
                        {unreadNotifs > 9 ? "9+" : unreadNotifs}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-2 px-2.5 pb-4 pt-2">
              {isGuest ? (
                <>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    title={registerLabel || "Create account"}
                    className={`flex w-full items-center gap-3 rounded-lg bg-sun-400 px-3 py-2.5 text-sm font-extrabold text-navy-900 shadow-sm transition hover:bg-sun-500 ${
                      collapsed ? "lg:justify-center lg:px-0" : ""
                    }`}
                  >
                    <Icon name="sparkles" className="h-5 w-5 shrink-0" />
                    <span className={`truncate ${collapsed ? "lg:sr-only" : ""}`}>{registerLabel || "Create account"}</span>
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    title={signInLabel || "Sign in"}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white ${
                      collapsed ? "lg:justify-center lg:px-0" : ""
                    }`}
                  >
                    <Icon name="profile" className="h-5 w-5 shrink-0" />
                    <span className={`truncate ${collapsed ? "lg:sr-only" : ""}`}>{signInLabel || "Sign in"}</span>
                  </Link>
                </>
              ) : (
                <SignOutButton label={signOutLabel} collapsed={collapsed} />
              )}
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-5">{children}</div>
        </div>
      </div>
    </Ctx.Provider>
  );
}
