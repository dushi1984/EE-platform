import { Badge, Icon } from "@/components/ui";
import type { AccountStatus } from "@/db/schema";
import type { ActivityStatus } from "@/lib/queries-teacher";
import type { Locale } from "@/lib/i18n";
import { tt } from "@/lib/i18n-teacher";

export function StatusPill({ status, locale }: { status: ActivityStatus; locale: Locale }) {
  const c = tt(locale);
  if (status === "active") return <Badge tone="done">{c.active}</Badge>;
  if (status === "idle") return <Badge tone="in_progress">{c.idle}</Badge>;
  return <Badge tone="overdue">{c.inactive}</Badge>;
}

export function AccountStatusPill({ status, locale }: { status: AccountStatus; locale: Locale }) {
  if (status === "pending") {
    return (
      <Badge tone="in_progress">
        <Icon name="clock" className="h-3 w-3" />
        {locale === "ar" ? "بانتظار الموافقة" : "Pending Approval"}
      </Badge>
    );
  }
  if (status === "suspended") {
    return (
      <Badge tone="overdue">
        <Icon name="lock" className="h-3 w-3" />
        {locale === "ar" ? "موقوف مؤقتاً" : "Suspended"}
      </Badge>
    );
  }
  if (status === "blocked") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-extrabold text-white">
        <Icon name="lock" className="h-3 w-3" />
        {locale === "ar" ? "محظور" : "Blocked"}
      </span>
    );
  }
  return (
    <Badge tone="done">
      <Icon name="check" className="h-3 w-3" />
      {locale === "ar" ? "معتمد" : "Approved"}
    </Badge>
  );
}
