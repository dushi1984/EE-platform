"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Icon, Logo } from "@/components/ui";

type NavItem = {
  href: string;
  label: string;
  icon: "dashboard" | "tasks" | "materials" | "grades" | "profile" | "students" | "payments" | "mail";
};

type ShellCtx = { open: boolean; setOpen: (v: boolean) => void; sessionToken: string; unreadCount: number };
const Ctx = createContext<ShellCtx>({ open: false, setOpen: () => {}, sessionToken: "", unreadCount: 0 });

export function useSessionToken() {
  const { sessionToken } = useContext(Ctx);
  return sessionToken;
}

export function getActiveSessionToken(fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("session") ||
    fallback ||
    localStorage.getItem("insci_session") ||
    sessionStorage.getItem("insci_session") ||
    ""
  );
}

export function buildSessionUrl(raw: string, explicitToken?: string): string {
  if (typeof window === "undefined") return raw;
  const token = explicitToken ?? getActiveSessionToken();
  const url = new URL(raw, window.location.origin);
  if (url.origin !== window.location.origin) return url.toString();
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname === "/login" ||
    url.pathname.startsWith("/login/") ||
    url.pathname === "/register"
  ) {
    return url.toString();
  }
  if (token) url.searchParams.set("session", token);
  try {
    const currentParams = new URLSearchParams(window.location.search);
    const locale = localStorage.getItem("locale") || currentParams.get("lang");
    const theme = localStorage.getItem("theme") || currentParams.get("theme");
    if (locale === "en" || locale === "ar") url.searchParams.set("lang", locale);
    if (theme === "light" || theme === "dark") url.searchParams.set("theme", theme);
  } catch {
    // ignore storage errors
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
  const { setOpen } = useContext(Ctx);
  return (
    <button type="button" onClick={() => setOpen(true)} aria-label={label} className="grid h-10 w-10 place-items-center rounded-lg text-white hover:bg-white/10 lg:hidden">
      <Icon name="menu" className="h-6 w-6" />
    </button>
  );
}

function clearClientSession() {
  try {
    localStorage.removeItem("insci_session");
    sessionStorage.removeItem("insci_session");
  } catch {
    // Storage can be unavailable in privacy-restricted frames.
  }
  for (const n of ["insci_session", "insci_session_p"]) {
    document.cookie = `${n}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${n}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${n}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`;
  }
}

function SignOutButton({ label, collapsed }: { label: string; collapsed: boolean }) {
  const { sessionToken } = useContext(Ctx);
  const [busy, setBusy] = useState(false);

  const doSignOut = async () => {
    if (busy) return;
    setBusy(true);
    const token = getActiveSessionToken(sessionToken);
    try {
      const suffix = token ? `?session=${encodeURIComponent(token)}` : "";
      await fetch(`/api/auth/logout${suffix}`, {
        method: "POST",
        credentials: "same-origin",
        redirect: "manual",
        headers: token ? { "x-session-token": token } : undefined,
      });
    } catch {
      // The local session is still cleared below if the network is interrupted.
    }
    clearClientSession();
    window.location.replace("/login?logged_out=1");
  };

  return (
    <button
      type="button"
      onClick={doSignOut}
      disabled={busy}
      title={label}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[15px] text-white/85 transition hover:bg-white/10 hover:text-white disabled:opacity-60 ${
        collapsed ? "lg:justify-center lg:px-0" : ""
      }`}
    >
      <Icon name="logout" className="h-5 w-5 shrink-0" />
      <span className={collapsed ? "lg:sr-only" : ""}>{busy ? "…" : label}</span>
    </button>
  );
}

function SessionNavigationBridge({ token }: { token: string }) {
  useEffect(() => {
    const activeToken = getActiveSessionToken(token);
    if (!activeToken) return;

    // Keep the current URL synced with ?session= via replaceState so native
    // POST forms (action="") and browser reloads never lose authentication.
    try {
      const current = new URL(window.location.href);
      if (current.searchParams.get("session") !== activeToken) {
        current.searchParams.set("session", activeToken);
        window.history.replaceState(window.history.state, "", current.toString());
      }
    } catch {
      // ignore
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download")) return;
      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;

      const nextHref = buildSessionUrl(anchor.href, activeToken);
      const url = new URL(nextHref, window.location.origin);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      anchor.href = url.toString();

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target === "_blank") return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(url.toString());
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const method = (form.getAttribute("method") || "get").toLowerCase();
      // For GET search/filter forms, browsers build the query string from form inputs
      // and strip query params from form.action. Inject hidden session/lang inputs.
      if (method === "get") {
        if (!form.querySelector('input[name="session"]')) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "session";
          input.value = activeToken;
          form.appendChild(input);
        }
        try {
          const locale = localStorage.getItem("locale");
          if ((locale === "en" || locale === "ar") && !form.querySelector('input[name="lang"]')) {
            const langInput = document.createElement("input");
            langInput.type = "hidden";
            langInput.name = "lang";
            langInput.value = locale;
            form.appendChild(langInput);
          }
        } catch {
          // ignore
        }
      }
      // IMPORTANT: Do NOT mutate form.action on POST forms, as that overwrites
      // React 19's Server Action function binding on <form action={fn}>!
    };

    // Add the token to all same-origin fetches, including React Server Actions and RSC requests.
    const nativeFetch = window.fetch.bind(window);
    const sessionFetch: typeof window.fetch = (input, init = {}) => {
      try {
        const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
        const url = new URL(rawUrl, window.location.origin);
        if (url.origin !== window.location.origin) return nativeFetch(input, init);

        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
        if (!headers.has("x-session-token")) headers.set("x-session-token", activeToken);
        const savedLocale = localStorage.getItem("locale");
        const savedTheme = localStorage.getItem("theme");
        if ((savedLocale === "en" || savedLocale === "ar") && !headers.has("x-locale")) {
          headers.set("x-locale", savedLocale);
        }
        if ((savedTheme === "light" || savedTheme === "dark") && !headers.has("x-theme")) {
          headers.set("x-theme", savedTheme);
        }

        if ((typeof input === "string" || input instanceof URL) && !url.pathname.startsWith("/api/auth/")) {
          if (!url.searchParams.has("session")) url.searchParams.set("session", activeToken);
          return nativeFetch(url.toString(), { ...init, headers });
        }

        return nativeFetch(input, { ...init, headers });
      } catch {
        return nativeFetch(input, init);
      }
    };
    window.fetch = sessionFetch;

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
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
  menuLabel,
  initialSessionToken,
  unreadCount,
  children,
}: {
  items: NavItem[];
  brand: string;
  signOutLabel: string;
  menuLabel: string;
  initialSessionToken: string;
  unreadCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sessionToken, setSessionToken] = useState(initialSessionToken);
  const [unread, setUnread] = useState(unreadCount);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Clear the unread badge once the user opens the inbox
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
    try {
      localStorage.setItem("insci_session", token);
      document.cookie = `insci_session=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
    } catch {
      // Query-string navigation remains available if storage/cookies are blocked.
    }
  }, [initialSessionToken]);

  const handleHamburger = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((c) => !c);
    else setOpen(false);
  };

  const buildHref = (path: string) => {
    if (!sessionToken || path.includes("session=")) return path;
    const [base, hash] = path.split("#");
    const joiner = base.includes("?") ? "&" : "?";
    return `${base}${joiner}session=${encodeURIComponent(sessionToken)}${hash ? `#${hash}` : ""}`;
  };

  return (
    <Ctx.Provider value={{ open, setOpen, sessionToken, unreadCount: unread }}>
      <SessionNavigationBridge token={sessionToken} />
      <div className="mx-auto max-w-[1440px] p-3 sm:p-5">
        <div className="flex items-start gap-5">
          {open && <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" />}

          <aside
            className={`fixed inset-y-0 start-0 z-50 flex h-full w-64 flex-col bg-navy-500 text-white shadow-2xl transition-[transform,width] duration-300 lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:translate-x-0 lg:rounded-2xl ${
              open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
            } ${collapsed ? "lg:w-[4.75rem]" : "lg:w-52"}`}
          >
            <div className={`flex items-center px-3 py-4 ${collapsed ? "lg:justify-center" : "justify-between"}`}>
              <Link href={buildHref("/dashboard")} prefetch={false} className={`flex items-center gap-2 overflow-hidden ${collapsed ? "lg:hidden" : ""}`}>
                <Logo className="h-8 w-8 shrink-0 text-white" />
                <span className="truncate text-xl font-bold tracking-tight">{brand}</span>
              </Link>
              <button type="button" onClick={handleHamburger} aria-label={menuLabel} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-white/10">
                <Icon name="menu" className="h-7 w-7" />
              </button>
            </div>

            <nav className="thin-scroll mt-2 flex flex-1 flex-col gap-3 overflow-y-auto px-2.5">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={buildHref(item.href)}
                    prefetch={false}
                    title={item.label}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] transition ${
                      active ? "bg-sun-400 font-semibold text-navy-800 shadow-md shadow-black/10" : "text-white hover:bg-white/10"
                    } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
                  >
                    <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                    <span className={collapsed ? "lg:sr-only" : ""}>{item.label}</span>
                    {item.icon === "mail" && unread > 0 && (
                      <span
                        className={`ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white ${
                          collapsed ? "lg:absolute lg:end-1.5 lg:top-1.5" : ""
                        }`}
                        title={`${unread} unread`}
                      >
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="px-2.5 pb-4 pt-2">
              <SignOutButton label={signOutLabel} collapsed={collapsed} />
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-5">{children}</div>
        </div>
      </div>
    </Ctx.Provider>
  );
}
