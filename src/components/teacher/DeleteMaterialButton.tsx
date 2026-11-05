"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n-client";
import { tt } from "@/lib/i18n-teacher";
import { approvePaymentAction, deleteMaterialAction, toggleMaterialPublishAction } from "@/lib/teacher-actions";
import { Icon } from "@/components/ui";
import { navigateWithSession, reloadWithSession } from "@/components/shell/Shell";

export function DeleteMaterialButton({ id }: { id: number }) {
  const { locale } = useI18n();
  const c = tt(locale);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800/60 dark:bg-red-950/40">
        <span className="text-xs font-bold text-red-800 dark:text-red-200">
          {locale === "ar" ? "تأكيد الحذف؟" : "Confirm delete?"}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteMaterialAction(id);
              navigateWithSession("/materials");
            })
          }
          className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "…" : c.delete}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="cursor-pointer rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
        >
          {c.cancel}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => setConfirming(true)}
      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-200 active:scale-95 disabled:opacity-60 dark:bg-red-500/20 dark:text-red-300"
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
      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 disabled:opacity-60 ${
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
      className="cursor-pointer rounded-lg bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700 transition hover:bg-green-200 active:scale-95 disabled:opacity-60 dark:bg-green-500/20 dark:text-green-300"
    >
      {pending ? "…" : locale === "ar" ? "تأكيد الدفع" : "Approve"}
    </button>
  );
}
