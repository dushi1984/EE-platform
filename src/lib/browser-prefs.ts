/**
 * Cross-browser & mobile WebView-safe storage, cookie, clipboard, and DOM event helpers.
 * Never throws in Safari Private Mode, strict tracking protection, or in-app WebViews
 * (WhatsApp, Telegram, Instagram, Messenger, TikTok, etc.) where storage/cookies may throw.
 */

const memoryStore = new Map<string, string>();
let cachedCookieSupport: boolean | null = null;

export function safeGetLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const val = window.localStorage.getItem(key);
    if (val !== null) return val;
  } catch {
    // Storage blocked in restricted WebView / Private mode
  }
  return memoryStore.get(`local:${key}`) ?? null;
}

export function safeSetLocal(key: string, value: string): void {
  memoryStore.set(`local:${key}`, value);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore SecurityError / QuotaExceededError
  }
}

export function safeRemoveLocal(key: string): void {
  memoryStore.delete(`local:${key}`);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore SecurityError
  }
}

export function safeGetSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const val = window.sessionStorage.getItem(key);
    if (val !== null) return val;
  } catch {
    // Ignore SecurityError
  }
  return memoryStore.get(`session:${key}`) ?? null;
}

export function safeSetSession(key: string, value: string): void {
  memoryStore.set(`session:${key}`, value);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore SecurityError / QuotaExceededError
  }
}

export function safeRemoveSession(key: string): void {
  memoryStore.delete(`session:${key}`);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore SecurityError
  }
}

export function safeGetCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const prefix = `${name}=`;
    const parts = document.cookie ? document.cookie.split(";") : [];
    for (const raw of parts) {
      const trimmed = raw.trim();
      if (trimmed.startsWith(prefix)) {
        return decodeURIComponent(trimmed.slice(prefix.length));
      }
    }
  } catch {
    // Ignore restricted document.cookie
  }
  return null;
}

export function safeSetCookie(name: string, value: string, maxAgeSeconds?: number): void {
  if (typeof document === "undefined") return;
  try {
    const encoded = encodeURIComponent(value);
    const maxAge = typeof maxAgeSeconds === "number" ? `; max-age=${maxAgeSeconds}` : "";
    document.cookie = `${name}=${encoded}; path=/${maxAge}; SameSite=Lax`;
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      document.cookie = `${name}_p=${encoded}; path=/${maxAge}; SameSite=None; Secure; Partitioned`;
    }
  } catch {
    // Ignore restricted document.cookie
  }
}

export function safeDeleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  try {
    for (const n of [name, `${name}_p`]) {
      document.cookie = `${n}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${n}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      if (typeof window !== "undefined" && window.location.protocol === "https:") {
        document.cookie = `${n}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure; Partitioned`;
      }
    }
  } catch {
    // Ignore
  }
}

export function areCookiesWorking(): boolean {
  if (typeof document === "undefined") return false;
  if (cachedCookieSupport !== null) return cachedCookieSupport;
  try {
    document.cookie = "insci_ck=1; path=/; max-age=60; SameSite=Lax";
    cachedCookieSupport = document.cookie.includes("insci_ck=1");
    return cachedCookieSupport;
  } catch {
    cachedCookieSupport = false;
    return false;
  }
}

/**
 * Safely resolves an EventTarget to an Element across all browsers.
 * On iOS Safari / WebKit, tapping text inside a link/button sets event.target
 * to a Text node (which lacks .closest()).
 */
export function closestElement(target: EventTarget | null): Element | null {
  if (!target) return null;
  if (typeof Element !== "undefined" && target instanceof Element) return target;
  if (typeof Node !== "undefined" && target instanceof Node) return target.parentElement;
  return null;
}

export async function safeCopyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to execCommand below
    }
  }
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
