"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n-client";
import { ForwardArrow } from "@/components/ui";

export function CertificateActions() {
  const { locale } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl bg-navy-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-navy-600"
      >
        🖨️ {locale === "ar" ? "طباعة / حفظ PDF" : "Print / Save PDF"}
      </button>
      <Link href="/grades" className="rounded-xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
        {locale === "ar" ? "الدرجات" : "Grades"} <ForwardArrow />
      </Link>
      <Link href="/materials" className="rounded-xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
        {locale === "ar" ? "مادة أخرى" : "Another material"} <ForwardArrow />
      </Link>
    </div>
  );
}
