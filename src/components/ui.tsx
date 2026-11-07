import type { ReactNode } from "react";
import { initials } from "@/lib/i18n";
export { ThemeToggle, LocaleToggle } from "./PreferenceControls";

/* ---------- Brand ---------- */

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
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
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sun-400 via-amber-400 to-orange-400 font-bold text-navy-800 shadow-sm ${className}`}
    >
      {initials(name)}
    </div>
  );
}

/* ---------- Status badge ---------- */

export type BadgeTone = "todo" | "in_progress" | "done" | "overdue" | "missed" | "neutral" | "new" | "personal";

const toneClasses: Record<BadgeTone, string> = {
  todo: "bg-sky-100 text-sky-800 ring-1 ring-sky-200/80 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-400/25",
  in_progress: "bg-amber-100 text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/25",
  done: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/25",
  overdue: "bg-rose-100 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-400/25",
  missed: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  new: "bg-gradient-to-r from-sun-400 to-amber-400 text-navy-900 shadow-sm",
  personal: "bg-violet-100 text-violet-800 ring-1 ring-violet-200/80 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-400/25",
};

export function Badge({ tone, children, className = "" }: { tone: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${toneClasses[tone]} ${className}`}>
      {children}
    </span>
  );
}

/* ---------- Progress ---------- */

export function ProgressBar({
  percent,
  className = "",
  color = "bg-gradient-to-r from-navy-500 via-blue-500 to-sky-400 dark:from-sky-400 dark:to-cyan-300",
}: {
  percent: number;
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-full bg-slate-200/85 dark:bg-slate-700/80 ${className}`}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

/* ---------- Layout helpers ---------- */

export function SectionTitle({ children, center = false, action }: { children: ReactNode; center?: boolean; action?: ReactNode }) {
  return (
    <div className={`flex items-center rounded-2xl bg-white/75 px-4 py-2.5 shadow-xs ring-1 ring-slate-900/5 backdrop-blur-sm dark:bg-slate-800/70 dark:ring-white/10 ${center ? "justify-center" : "justify-between"}`}>
      <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">{children}</h2>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10 ${className}`}>{children}</div>;
}

export function DropdownSafeCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10 ${className}`}>{children}</div>;
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <p className="px-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{children}</p>;
}

/* ---------- Subject Vector Emblem System (100% Emoji-Free) ---------- */

export type SubjectKey = "chemistry" | "physics" | "biology" | "mathematics" | "book" | "science";

export function resolveSubjectKey(icon?: string | null, name?: string | null): SubjectKey {
  const raw = `${icon ?? ""} ${name ?? ""}`.toLowerCase();
  if (raw.includes("chem") || raw.includes("كيم")) return "chemistry";
  if (raw.includes("phys") || raw.includes("فيز")) return "physics";
  if (raw.includes("bio") || raw.includes("أحي") || raw.includes("احي")) return "biology";
  if (raw.includes("math") || raw.includes("رياض")) return "mathematics";
  if (raw.includes("book")) return "book";
  return "science";
}

const subjectPalette: Record<SubjectKey, { bg: string; text: string }> = {
  chemistry: {
    bg: "bg-gradient-to-br from-emerald-100 to-teal-100 ring-1 ring-emerald-200/80 dark:from-emerald-500/20 dark:to-teal-500/15 dark:ring-emerald-400/25",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  physics: {
    bg: "bg-gradient-to-br from-sky-100 to-indigo-100 ring-1 ring-sky-200/80 dark:from-sky-500/20 dark:to-indigo-500/15 dark:ring-sky-400/25",
    text: "text-sky-700 dark:text-sky-300",
  },
  biology: {
    bg: "bg-gradient-to-br from-rose-100 to-pink-100 ring-1 ring-rose-200/80 dark:from-rose-500/20 dark:to-pink-500/15 dark:ring-rose-400/25",
    text: "text-rose-700 dark:text-rose-300",
  },
  mathematics: {
    bg: "bg-gradient-to-br from-amber-100 to-orange-100 ring-1 ring-amber-200/80 dark:from-amber-500/20 dark:to-orange-500/15 dark:ring-amber-400/25",
    text: "text-amber-700 dark:text-amber-300",
  },
  book: {
    bg: "bg-gradient-to-br from-violet-100 to-purple-100 ring-1 ring-violet-200/80 dark:from-violet-500/20 dark:to-purple-500/15 dark:ring-violet-400/25",
    text: "text-violet-700 dark:text-violet-300",
  },
  science: {
    bg: "bg-gradient-to-br from-blue-100 to-cyan-100 ring-1 ring-blue-200/80 dark:from-blue-500/20 dark:to-cyan-500/15 dark:ring-blue-400/25",
    text: "text-blue-700 dark:text-blue-300",
  },
};

export function SubjectGlyph({
  icon,
  name,
  className = "h-4 w-4",
}: {
  icon?: string | null;
  name?: string | null;
  className?: string;
}) {
  const key = resolveSubjectKey(icon, name);
  const iconMap: Record<SubjectKey, IconName> = {
    chemistry: "flask",
    physics: "atom",
    biology: "dna",
    mathematics: "compass",
    book: "book",
    science: "sparkles",
  };
  return <Icon name={iconMap[key]} className={`inline-block shrink-0 ${className}`} />;
}

export function SubjectBadge({
  icon,
  name,
  size = "md",
  className = "",
}: {
  icon?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const key = resolveSubjectKey(icon, name);
  const pal = subjectPalette[key];
  const dims =
    size === "xs"
      ? "h-6 w-6 rounded-lg"
      : size === "sm"
        ? "h-8 w-8 rounded-xl"
        : size === "lg"
          ? "h-14 w-14 rounded-2xl"
          : "h-10 w-10 rounded-xl";
  const svgDims =
    size === "xs"
      ? "h-3.5 w-3.5"
      : size === "sm"
        ? "h-4 w-4"
        : size === "lg"
          ? "h-7 w-7"
          : "h-5 w-5";

  return (
    <span className={`inline-grid shrink-0 place-items-center ${dims} ${pal.bg} ${pal.text} ${className}`} aria-hidden>
      <SubjectGlyph icon={key} className={svgDims} />
    </span>
  );
}

/* ---------- Empty State (Colorful Vector Badge) ---------- */

export function EmptyState({
  icon = "sparkles",
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="px-6 py-12 text-center">
      <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-100 via-blue-50 to-amber-100 text-navy-600 shadow-xs ring-1 ring-blue-200/60 dark:from-sky-500/20 dark:via-slate-800 dark:to-amber-500/20 dark:text-sky-300 dark:ring-white/10">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <p className="font-bold text-slate-900 dark:text-white">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

/* ---------- RTL-aware directional glyphs ---------- */

export function ForwardArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`inline-block h-4 w-4 align-[-2px] rtl:-scale-x-100 ${className}`}
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

export function BackArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`inline-block h-4 w-4 align-[-2px] rtl:-scale-x-100 ${className}`}
    >
      <path d="M16 10H4M9 5l-5 5 5 5" />
    </svg>
  );
}

export function LaunchArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`inline-block h-4 w-4 align-[-2px] rtl:-scale-x-100 ${className}`}
    >
      <path d="M6 14L14 6M8 6h6v6" />
    </svg>
  );
}

export function CrumbSep({ className = "text-slate-400" }: { className?: string }) {
  return <span aria-hidden className={`inline-block rtl:-scale-x-100 ${className}`}>›</span>;
}

/* ---------- Icons ---------- */

export type IconName =
  | "dashboard"
  | "tasks"
  | "materials"
  | "grades"
  | "profile"
  | "menu"
  | "grid"
  | "list"
  | "lock"
  | "tag"
  | "check"
  | "dots"
  | "logout"
  | "play"
  | "camera"
  | "download"
  | "upload"
  | "file"
  | "print"
  | "x"
  | "video"
  | "chevron"
  | "students"
  | "payments"
  | "plus"
  | "pencil"
  | "trash"
  | "mail"
  | "assign"
  | "bell"
  | "trophy"
  | "sparkles"
  | "clipboard"
  | "book"
  | "flask"
  | "atom"
  | "dna"
  | "compass"
  | "shield"
  | "card"
  | "bank"
  | "wallet"
  | "receipt"
  | "alert"
  | "graduation"
  | "quiz"
  | "cloud"
  | "drive"
  | "volume"
  | "volume-mute"
  | "rewind"
  | "stop"
  | "pause"
  | "fast-forward"
  | "maximize"
  | "reply"
  | "eye"
  | "clock"
  | "settings";

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
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
    case "flask":
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 001.3 2.2h12.4a1.5 1.5 0 001.3-2.2L14 9V3" />
          <path d="M7.2 15h9.6" />
          <circle cx="10" cy="18" r="0.8" fill="currentColor" />
          <circle cx="14" cy="17.5" r="0.8" fill="currentColor" />
        </svg>
      );
    case "atom":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(90 12 12)" />
        </svg>
      );
    case "dna":
      return (
        <svg {...common}>
          <path d="M7 3c0 5 10 5 10 9s-10 4-10 9" />
          <path d="M17 3c0 5-10 5-10 9s10 4 10 9" />
          <path d="M8.5 6h7M8.5 18h7M9 12h6" />
        </svg>
      );
    case "compass":
      return (
        <svg {...common}>
          <circle cx="12" cy="6" r="2" />
          <path d="M12 4V2M10.5 7.5L5 21M13.5 7.5L19 21M7 15h10" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21.5v-16z" />
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2.5" />
          <path d="M9 4.5h6v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" />
          <path d="M9 11h6M9 15h4" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
          <path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M12 14v4M8 21h8M10 18h4" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
          <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
          <path d="M5 16l.7 1.6L7.3 18.3l-1.6.7L5 20.6l-.7-1.6-1.6-.7 1.6-.7L5 16z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 9a6 6 0 1112 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
          <path d="M10 19a2 2 0 004 0" />
        </svg>
      );
    case "quiz":
      return (
        <svg {...common}>
          <path d="M9.5 9a2.5 2.5 0 114.2 1.8c-.8.7-1.7 1.2-1.7 2.4" />
          <circle cx="12" cy="17" r="0.8" fill="currentColor" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "graduation":
      return (
        <svg {...common}>
          <path d="M2 9l10-5 10 5-10 5L2 9z" />
          <path d="M6 11.5v5c0 1.8 2.7 3.5 6 3.5s6-1.7 6-3.5v-5M22 9v6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" />
          <path d="M9.5 12l1.8 1.8L15 10" />
        </svg>
      );
    case "card":
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 10h19M6.5 15h4" />
        </svg>
      );
    case "bank":
      return (
        <svg {...common}>
          <path d="M3 9l9-5 9 5H3z" />
          <path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8M3 20h18" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
          <path d="M11 18h2" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common}>
          <path d="M5 3h14v18l-2.5-1.8L14 21l-2-1.8L10 21l-2.5-1.8L5 21V3z" />
          <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M12 4L2.8 20h18.4L12 4z" />
          <path d="M12 10v4.5" />
          <circle cx="12" cy="17.2" r="0.8" fill="currentColor" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...common}>
          <path d="M6.5 19h11a4.5 4.5 0 00.9-8.9A6 6 0 006.3 8.8 4 4 0 006.5 19z" />
        </svg>
      );
    case "drive":
      return (
        <svg {...common}>
          <path d="M9 4h6l6 10.5-3 5.5H6L3 14.5 9 4z" />
          <path d="M3 14.5h18M9 4l6 10.5M15 4L9 14.5" />
        </svg>
      );
    case "volume":
      return (
        <svg {...common}>
          <path d="M11 5L6 9H3v6h3l5 4V5z" />
          <path d="M15.5 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" />
        </svg>
      );
    case "volume-mute":
      return (
        <svg {...common}>
          <path d="M11 5L6 9H3v6h3l5 4V5z" />
          <path d="M16 9l5 6M21 9l-5 6" />
        </svg>
      );
    case "rewind":
      return (
        <svg {...common}>
          <path d="M11 18l-8-6 8-6v12zM20 18l-8-6 8-6v12z" />
        </svg>
      );
    case "stop":
      return (
        <svg {...common}>
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
        </svg>
      );
    case "pause":
      return (
        <svg {...common}>
          <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
          <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
        </svg>
      );
    case "fast-forward":
      return (
        <svg {...common}>
          <path d="M13 18l8-6-8-6v12zM4 18l8-6-8-6v12z" />
        </svg>
      );
    case "maximize":
      return (
        <svg {...common}>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      );
    case "reply":
      return (
        <svg {...common} className={`${className} rtl:-scale-x-100`}>
          <path d="M9 14L4 9l5-5" />
          <path d="M20 20v-7a4 4 0 00-4-4H4" />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.08a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.08a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.08a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
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
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
  }
}
