import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accessSettings,
  type AccountStatus,
  type StudentPageKey,
  type User,
  type VisitorPageKey,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";

export const ALL_STUDENT_PAGES: readonly StudentPageKey[] = [
  "dashboard",
  "materials",
  "tasks",
  "grades",
  "messages",
  "notifications",
  "profile",
] as const;

export const ALL_VISITOR_PAGES: readonly VisitorPageKey[] = [
  "dashboard",
  "materials",
  "tasks",
] as const;

export const DEFAULT_PENDING_PAGES: StudentPageKey[] = [
  "dashboard",
  "materials",
  "messages",
  "notifications",
  "profile",
];

export const DEFAULT_VISITOR_PAGES: VisitorPageKey[] = ["dashboard", "materials"];

export type AccessPolicy = {
  pendingPages: StudentPageKey[];
  visitorPages: VisitorPageKey[];
  pendingCanSubmitTasks: boolean;
  pendingCanPurchase: boolean;
};

export function normalizeAccountStatus(raw?: string | null): AccountStatus {
  if (raw === "pending" || raw === "suspended" || raw === "blocked") return raw;
  return "approved";
}

function sanitizePendingPages(raw: unknown): StudentPageKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_PENDING_PAGES];
  const valid = new Set<string>(ALL_STUDENT_PAGES);
  const filtered = raw.filter((x): x is StudentPageKey => typeof x === "string" && valid.has(x));
  // Ensure profile remains reachable so signed-in pending students can view account info & sign out
  if (!filtered.includes("profile")) filtered.push("profile");
  return Array.from(new Set(filtered));
}

function sanitizeVisitorPages(raw: unknown): VisitorPageKey[] {
  if (!Array.isArray(raw)) return [...DEFAULT_VISITOR_PAGES];
  const valid = new Set<string>(ALL_VISITOR_PAGES);
  return Array.from(
    new Set(raw.filter((x): x is VisitorPageKey => typeof x === "string" && valid.has(x))),
  );
}

export const getAccessPolicy = cache(async (): Promise<AccessPolicy> => {
  await ensureSeeded();
  try {
    const row = await db.query.accessSettings.findFirst({ where: eq(accessSettings.id, 1) });
    if (!row) {
      await db
        .insert(accessSettings)
        .values({
          id: 1,
          pendingPages: DEFAULT_PENDING_PAGES,
          visitorPages: DEFAULT_VISITOR_PAGES,
          pendingCanSubmitTasks: false,
          pendingCanPurchase: false,
        })
        .onConflictDoNothing();
      return {
        pendingPages: [...DEFAULT_PENDING_PAGES],
        visitorPages: [...DEFAULT_VISITOR_PAGES],
        pendingCanSubmitTasks: false,
        pendingCanPurchase: false,
      };
    }
    return {
      pendingPages: sanitizePendingPages(row.pendingPages),
      visitorPages: sanitizeVisitorPages(row.visitorPages),
      pendingCanSubmitTasks: Boolean(row.pendingCanSubmitTasks),
      pendingCanPurchase: Boolean(row.pendingCanPurchase),
    };
  } catch {
    return {
      pendingPages: [...DEFAULT_PENDING_PAGES],
      visitorPages: [...DEFAULT_VISITOR_PAGES],
      pendingCanSubmitTasks: false,
      pendingCanPurchase: false,
    };
  }
});

export function canAccessStudentPage(
  user: Pick<User, "role" | "accountStatus"> | null,
  page: StudentPageKey,
  policy: AccessPolicy,
): boolean {
  if (user?.role === "teacher") return true;
  if (!user) {
    return (ALL_VISITOR_PAGES as readonly string[]).includes(page) &&
      policy.visitorPages.includes(page as VisitorPageKey);
  }
  const status = normalizeAccountStatus(user.accountStatus);
  if (status === "blocked") return false;
  if (status === "suspended") {
    return page === "messages" || page === "notifications" || page === "profile";
  }
  if (status === "pending") {
    return policy.pendingPages.includes(page);
  }
  return true;
}

export function canAccessMaterialContent(
  user: Pick<User, "role" | "accountStatus"> | null,
  material: {
    published?: boolean;
    priceCents?: number;
    purchased?: boolean;
    allowPendingStudents?: boolean;
    allowVisitors?: boolean;
  },
  policy: AccessPolicy,
): boolean {
  if (user?.role === "teacher") return true;
  if (material.published === false) return false;
  if (!user) {
    return (
      policy.visitorPages.includes("materials") &&
      (material.priceCents ?? 0) === 0 &&
      Boolean(material.allowVisitors)
    );
  }
  const status = normalizeAccountStatus(user.accountStatus);
  if (status === "blocked" || status === "suspended") return false;
  if (material.purchased === false) return false;
  if (status === "pending") {
    if (!policy.pendingPages.includes("materials")) return false;
    if (material.purchased && (material.priceCents ?? 0) > 0) return true;
    return Boolean(material.allowPendingStudents);
  }
  return true;
}

export function canAccessTaskContent(
  user: Pick<User, "role" | "accountStatus"> | null,
  task: { allowPendingStudents?: boolean; allowVisitors?: boolean },
  policy: AccessPolicy,
): boolean {
  if (user?.role === "teacher") return true;
  if (!user) {
    return policy.visitorPages.includes("tasks") && Boolean(task.allowVisitors);
  }
  const status = normalizeAccountStatus(user.accountStatus);
  if (status === "blocked" || status === "suspended") return false;
  if (status === "pending") {
    return policy.pendingPages.includes("tasks") && Boolean(task.allowPendingStudents);
  }
  return true;
}

export function canSubmitTasks(
  user: Pick<User, "role" | "accountStatus"> | null,
  policy: AccessPolicy,
): boolean {
  if (!user || user.role !== "student") return false;
  const status = normalizeAccountStatus(user.accountStatus);
  if (status === "approved") return true;
  if (status === "pending") return policy.pendingCanSubmitTasks;
  return false;
}

export function canPurchaseMaterials(
  user: Pick<User, "role" | "accountStatus"> | null,
  policy: AccessPolicy,
): boolean {
  if (!user || user.role !== "student") return false;
  const status = normalizeAccountStatus(user.accountStatus);
  if (status === "approved") return true;
  if (status === "pending") return policy.pendingCanPurchase;
  return false;
}

export function firstAllowedPath(
  user: Pick<User, "role" | "accountStatus"> | null,
  policy: AccessPolicy,
): string {
  if (user?.role === "teacher") return "/dashboard";
  if (!user) {
    const first = policy.visitorPages[0];
    return first ? `/${first}` : "/login";
  }
  const status = normalizeAccountStatus(user.accountStatus);
  if (status === "blocked") return "/dashboard";
  if (status === "suspended") return "/messages";
  if (status === "pending") {
    const preferred: StudentPageKey[] = [
      "dashboard",
      "materials",
      "tasks",
      "messages",
      "notifications",
      "profile",
    ];
    for (const p of preferred) {
      if (policy.pendingPages.includes(p)) return `/${p}`;
    }
    return "/profile";
  }
  return "/dashboard";
}
