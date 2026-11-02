"use client";

import { useTransition } from "react";
import { useI18n } from "@/lib/i18n-client";
import { tt } from "@/lib/i18n-teacher";
import { approvePaymentAction, deleteMaterialAction, toggleMaterialPublishAction } from "@/lib/teacher-actions";
import { Icon } from "@/components/ui";
import { navigateWithSession, reloadWithSession } from "@/components/shell/Shell";

export function DeleteMaterialButton({ id }: { id: number }) {
  const { locale } = useI18n();
  const c = tt(locale);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(c.confirmDelete)) return;
        startTransition(async () => {
          await deleteMaterialAction(id);
          navigateWithSession("/materials");
        });
      }}
      className="flex items-center justify-center gap-2 rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-200 disabled:opacity-60 dark:bg-red-500/20 dark:text-red-300"
    >
      <Icon name="trash" className="h-5 w-5" />
      {pending ? "…" : c.delete}
    </button>
  );
}

export function PublishMaterialButton({ id, published }: { id: number; published: boolean }) {
  const { locale } = useI18n();
  const c = tt(locale);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleMaterialPublishAction(id);
          reloadWithSession();
        })
      }
      className={`rounded-full px-3 py-1 text-xs font-bold transition disabled:opacity-60 ${
        published
          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300"
          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200"
      }`}
      title={locale === "ar" ? "تبديل النشر/المسودة" : "Click to toggle Published / Draft"}
    >
      {pending ? "…" : published ? c.published : c.draft}
    </button>
  );
}

export function ApprovePaymentButton({ purchaseId }: { purchaseId: number }) {
  const { locale } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await approvePaymentAction(purchaseId);
          reloadWithSession();
        })
      }
      className="rounded-lg bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700 transition hover:bg-green-200 disabled:opacity-60 dark:bg-green-500/20 dark:text-green-300"
    >
      {pending ? "…" : locale === "ar" ? "تأكيد الدفع" : "Approve"}
    </button>
  );
}
