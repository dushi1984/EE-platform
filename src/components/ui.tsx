import type { ReactNode } from "react";
import { initials } from "@/lib/i18n";
export { ThemeToggle, LocaleToggle } from "./PreferenceControls";

/* ---------- Brand ---------- */

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  // Two mirrored "E" marks facing each other
  return (
    <svg viewBox="0 0 48 48" className={className} fill="currentColor" aria-hidden>
      <path d="M4 6h17v6H10v6h10v6H10v6h11v6H4z" />
      <path d="M44 6H27v6h11v6H28v6h10v6H27v6h17z" />
    </svg>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ name, src, size = 40, className = "" }: { name: string; src?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <div
      style={{ ...style, fontSize: Math.max(11, size / 2.6) }}
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sun-400 to-orange-400 font-bold text-navy-800 ${className}`}
    >
      {initials(name)}
    </div>
  );
}

/* ---------- Status badge ---------- */

export type BadgeTone = "todo" | "in_progress" | "done" | "overdue" | "missed" | "neutral" | "new";

const toneClasses: Record<BadgeTone, string> = {
  todo: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200",
  done: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200",
  overdue: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200",
  missed: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  new: "bg-sun-400 text-navy-800",
};

export function Badge({ tone, children, className = "" }: { tone: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${toneClasses[tone]} ${className}`}>{children}</span>;
}

/* ---------- Progress ---------- */

export function ProgressBar({ percent, className = "", color = "bg-navy-500 dark:bg-sky-400" }: { percent: number; className?: string; color?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${className}`} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

/* ---------- Layout helpers ---------- */

export function SectionTitle({ children, center = false, action }: { children: ReactNode; center?: boolean; action?: ReactNode }) {
  return (
    <div className={`flex items-center rounded-xl bg-white/60 px-4 py-2 backdrop-blur-sm dark:bg-slate-800/60 ${center ? "justify-center" : "justify-between"}`}>
      <h2 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-white">{children}</h2>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10 ${className}`}>{children}</div>;
}

/**
 * Wrapper for cards that contain dropdowns/popovers. Creates a stacking context
 * that is clipped by overflow, so use `DropdownCard` when children render
 * absolutely-positioned menus.
 */
export function DropdownSafeCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10 ${className}`}>{children}</div>;
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <p className="px-1 text-sm font-medium text-slate-700 dark:text-slate-300">{children}</p>;
}

export function EmptyState({ icon = "📭", title, body, action }: { icon?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <Card className="px-6 py-12 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-2xl dark:bg-slate-800">{icon}</div>
      <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

/* ---------- RTL-aware directional glyphs ---------- */

export function ForwardArrow({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block rtl:-scale-x-100 ${className}`}>→</span>;
}

export function BackArrow({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block rtl:-scale-x-100 ${className}`}>←</span>;
}

export function LaunchArrow({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block rtl:-scale-x-100 ${className}`}>↗</span>;
}

export function CrumbSep({ className = "text-slate-400" }: { className?: string }) {
  return <span aria-hidden className={`inline-block rtl:-scale-x-100 ${className}`}>›</span>;
}

/* ---------- Icons ---------- */

export function Icon({ name, className = "h-5 w-5" }: { name: "dashboard" | "tasks" | "materials" | "grades" | "profile" | "menu" | "grid" | "list" | "lock" | "tag" | "check" | "dots" | "logout" | "play" | "camera" | "download" | "upload" | "file" | "print" | "x" | "video" | "chevron" | "students" | "payments" | "plus" | "pencil" | "trash" | "mail" | "assign"; className?: string }) {
  const common = { className, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.5l2.5 2.5L16 9.5" />
        </svg>
      );
    case "materials":
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 001.3 2.2h12.4a1.5 1.5 0 001.3-2.2L14 9V3" />
          <path d="M7.5 15h9" />
        </svg>
      );
    case "grades":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 16v-5M12 16V8M16 16v-3" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0116 0" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common} strokeWidth={2.5}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "list":
      return (
        <svg {...common} strokeWidth={2.5}>
          <rect x="3" y="4" width="18" height="4" rx="2" />
          <rect x="3" y="10" width="18" height="4" rx="2" />
          <rect x="3" y="16" width="18" height="4" rx="2" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 118 0v4" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      );
    case "dots":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common} className={`${className} rtl:-scale-x-100`}>
          <path d="M10 17l5-5-5-5M15 12H3M21 3v18" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 5v14l11-7z" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M4 8h3l2-3h6l2 3h3v12H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 20h16" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M4 20h16" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M6 2h8l5 5v15H6z" />
          <path d="M14 2v5h5M9 13h6M9 17h6" />
        </svg>
      );
    case "print":
      return (
        <svg {...common}>
          <path d="M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case "video":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="14" height="14" rx="2" />
          <path d="M16 10l6-3v10l-6-3" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "students":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14a6 6 0 013.5 6" />
        </svg>
      );
    case "payments":
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 10h19M6.5 15h4" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "pencil":
      return (
        <svg {...common}>
          <path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19l-4 1zM14 7l3 3" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "assign":
      return (
        <svg {...common}>
          <path d="M20.5 11.5A8.5 8.5 0 1112 3.5M8.5 11.5l2.5 2.5L20 5M18 15v6M15 18h6" />
        </svg>
      );
  }
}
