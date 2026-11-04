import Link from "next/link";
import type { MaterialCardData } from "@/lib/queries";
import { fmtMoney, tr, type Locale, type Translator } from "@/lib/i18n";
import { Badge, Icon, ProgressBar } from "@/components/ui";
import { BuyButton } from "@/components/PurchaseModal";

export function MaterialThumb({ url, title, className = "" }: { url: string | null; title: string; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={title} className={`h-full w-full object-cover ${className}`} />;
  }
  return <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-navy-400 to-navy-700 text-5xl font-black text-white/80 ${className}`}>{title.slice(0, 1)}</div>;
}

export function PriceTag({ material, locale, t }: { material: MaterialCardData; locale: Locale; t: Translator }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <Icon name="tag" className="h-4 w-4 text-slate-500" />
      {material.purchased ? t("materials.purchased") : material.priceCents === 0 ? t("common.free") : fmtMoney(locale, material.priceCents)}
    </span>
  );
}

function ActionArea({
  material,
  locale,
  t,
  viewerMode = "approved",
  canPurchase = true,
  canOpen = material.purchased,
}: {
  material: MaterialCardData;
  locale: Locale;
  t: Translator;
  viewerMode?: "approved" | "pending" | "suspended" | "visitor";
  canPurchase?: boolean;
  canOpen?: boolean;
}) {
  if (canOpen) {
    return (
      <Link
        href={`/materials/${material.slug}`}
        className="inline-flex items-center gap-2 rounded-lg bg-navy-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-navy-600"
      >
        <Icon name="play" className="h-4 w-4" />
        {t("materials.open")}
      </Link>
    );
  }

  if (viewerMode === "visitor") {
    return (
      <Link
        href="/register"
        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3.5 py-2 text-xs font-bold text-navy-600 ring-1 ring-sky-200 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-800"
      >
        <Icon name="lock" className="h-3.5 w-3.5" />
        {locale === "ar" ? "سجّل للفتح" : "Sign up to unlock"}
      </Link>
    );
  }

  if (!canPurchase || viewerMode === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800">
        <Icon name="lock" className="h-3.5 w-3.5" />
        {viewerMode === "suspended"
          ? locale === "ar"
            ? "المشتريات متوقفة"
            : "Paused"
          : locale === "ar"
            ? "بعد الموافقة"
            : "After approval"}
      </span>
    );
  }

  return <BuyButton material={material} />;
}

export function MaterialCard({
  material,
  locale,
  t,
  view = "grid",
  viewerMode = "approved",
  canPurchase = true,
  canOpen = material.purchased,
}: {
  material: MaterialCardData;
  locale: Locale;
  t: Translator;
  view?: "grid" | "list";
  viewerMode?: "approved" | "pending" | "suspended" | "visitor";
  canPurchase?: boolean;
  canOpen?: boolean;
}) {
  const title = tr(locale, material.title, material.titleAr);
  const info = `${tr(locale, material.subject.name, material.subject.nameAr)} · ${material.lessonCount} ${t("common.lessons")}`;

  if (view === "list") {
    return (
      <div className="flex gap-4 overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
        <Link href={`/materials/${material.slug}`} className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-48">
          <MaterialThumb url={material.thumbnailUrl} title={title} />
          {material.isNew && !canOpen && <Badge tone="new" className="absolute start-2 top-2">{t("materials.newBadge")}</Badge>}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link href={`/materials/${material.slug}`} className="truncate text-lg font-bold text-slate-900 hover:text-navy-500 dark:text-white">
            {title}
          </Link>
          <p className="text-sm text-slate-600 dark:text-slate-400">{info}</p>
          {canOpen && viewerMode !== "visitor" && (
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar percent={material.percent} className="max-w-[200px]" />
              <span className="text-xs text-slate-500">{material.percent}%</span>
            </div>
          )}
          <div className="mt-auto flex items-center justify-between gap-3 pt-3">
            <ActionArea
              material={material}
              locale={locale}
              t={t}
              viewerMode={viewerMode}
              canPurchase={canPurchase}
              canOpen={canOpen}
            />
            <PriceTag material={material} locale={locale} t={t} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 dark:ring-white/10">
      <Link href={`/materials/${material.slug}`} className="relative aspect-[2/1] overflow-hidden">
        <MaterialThumb url={material.thumbnailUrl} title={title} className="transition duration-500 hover:scale-105" />
        {material.isNew && !canOpen && <Badge tone="new" className="absolute start-3 top-3 shadow">{t("materials.newBadge")}</Badge>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/materials/${material.slug}`} className="line-clamp-1 text-xl font-bold text-slate-900 hover:text-navy-500 dark:text-white">
          {title}
        </Link>
        <p className="text-sm text-slate-600 dark:text-slate-400">{info}</p>
        {canOpen && viewerMode !== "visitor" && (
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar percent={material.percent} />
            <span className="text-xs text-slate-500">{material.percent}%</span>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <ActionArea
            material={material}
            locale={locale}
            t={t}
            viewerMode={viewerMode}
            canPurchase={canPurchase}
            canOpen={canOpen}
          />
          <PriceTag material={material} locale={locale} t={t} />
        </div>
      </div>
    </div>
  );
}
