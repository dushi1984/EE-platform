"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n-client";
import { Icon } from "@/components/ui";
import { DownloadButton } from "@/components/TaskSubmissionForm";
import { navigateWithSession } from "@/components/shell/Shell";

const LEVELS = [80, 100, 120, 150];

function Toolbar({ title, lessonId, zoom }: { title: string; lessonId: number; zoom: number }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const sp = useSearchParams();

  const setZoom = (z: number) => {
    const p = new URLSearchParams(sp.toString());
    p.set("zoom", String(z));
    navigateWithSession(`${pathname}?${p.toString()}`);
  };

  const stepZoom = (dir: 1 | -1) => {
    const i = LEVELS.indexOf(zoom);
    const next = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, (i === -1 ? 1 : i) + dir))];
    setZoom(next);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
      <h2 className="min-w-0 flex-1 truncate font-bold text-slate-900 dark:text-white">{title}</h2>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-slate-100 px-1 py-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => stepZoom(-1)}
            aria-label={t("pdf.zoomOut")}
            title={t("pdf.zoomOut")}
            className="grid h-7 w-7 place-items-center rounded-full text-lg font-bold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
          >
            −
          </button>
          <span className="w-11 text-center text-xs font-bold text-slate-700 dark:text-slate-200">{zoom}%</span>
          <button
            type="button"
            onClick={() => stepZoom(1)}
            aria-label={t("pdf.zoomIn")}
            title={t("pdf.zoomIn")}
            className="grid h-7 w-7 place-items-center rounded-full text-lg font-bold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
          >
            +
          </button>
        </div>
        <DownloadButton url={`/api/lessons/${lessonId}/download`} label={t("pdf.download")} />
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
        >
          <Icon name="print" className="h-4 w-4" />
          {t("pdf.print")}
        </button>
      </div>
    </div>
  );
}

export function PdfToolbar(props: { title: string; lessonId: number; zoom: number }) {
  return (
    <Suspense fallback={null}>
      <Toolbar {...props} />
    </Suspense>
  );
}
