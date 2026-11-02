import { Badge } from "@/components/ui";
import type { ActivityStatus } from "@/lib/queries-teacher";
import type { Locale } from "@/lib/i18n";
import { tt } from "@/lib/i18n-teacher";

export function StatusPill({ status, locale }: { status: ActivityStatus; locale: Locale }) {
  const c = tt(locale);
  if (status === "active") return <Badge tone="done">{c.active}</Badge>;
  if (status === "idle") return <Badge tone="in_progress">{c.idle}</Badge>;
  return <Badge tone="overdue">{c.inactive}</Badge>;
}
