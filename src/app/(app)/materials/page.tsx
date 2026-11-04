import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { getAllSubjects, getMaterialsForUser } from "@/lib/queries";
import { TopBar } from "@/components/shell/TopBar";
import { EmptyState, Icon, SectionTitle, SubjectGlyph } from "@/components/ui";
import { MaterialCard } from "@/components/MaterialCard";
import { TeacherMaterialsView } from "@/components/teacher/TeacherMaterialsView";

export const metadata: Metadata = { title: "Materials" };

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; subject?: string; q?: string; m?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { view: v, subject, q, m } = await searchParams;
  if (user.role === "teacher") return <TeacherMaterialsView selected={m} />;
  const view = v === "list" ? "list" : "grid";
  const { t, locale } = await getI18n();

  const [rawList, subjects] = await Promise.all([getMaterialsForUser(user.id), getAllSubjects()]);

  let list = rawList;
  if (subject && subject !== "all") {
    list = list.filter((m) => m.subject.name.toLowerCase() === subject.toLowerCase());
  }
  if (q && q.trim()) {
    const query = q.toLowerCase();
    list = list.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.titleAr.includes(query) ||
        m.description.toLowerCase().includes(query)
    );
  }

  const mine = list.filter((m) => m.purchased);
  const fresh = list.filter((m) => m.isNew && !m.purchased);
  const rest = list.filter((m) => !m.purchased && !m.isNew);

  const gridCls = view === "list" ? "grid gap-4" : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3";

  const toggle = (
    <Link
      href={`/materials?${new URLSearchParams({
        view: view === "grid" ? "list" : "grid",
        ...(subject ? { subject } : {}),
        ...(q ? { q } : {}),
      }).toString()}`}
      aria-label={view === "grid" ? t("common.listView") : t("common.gridView")}
      title={view === "grid" ? t("common.listView") : t("common.gridView")}
      className="grid h-10 w-10 place-items-center rounded-lg bg-navy-900/60 text-sun-400 ring-1 ring-white/10 hover:bg-navy-900"
    >
      <Icon name={view === "grid" ? "grid" : "list"} className="h-6 w-6" />
    </Link>
  );

  return (
    <>
      <TopBar title={t("materials.title")} extra={toggle} />

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-sm">
          <Link
            href={`/materials?view=${view}${q ? `&q=${q}` : ""}`}
            className={`rounded-xl px-3.5 py-2 font-semibold transition ${
              !subject || subject === "all"
                ? "bg-navy-500 text-white shadow-md shadow-navy-500/20"
                : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            {locale === "ar" ? "كل المواد" : "All"}
          </Link>
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/materials?subject=${s.name.toLowerCase()}&view=${view}${q ? `&q=${q}` : ""}`}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-semibold whitespace-nowrap transition ${
                subject?.toLowerCase() === s.name.toLowerCase()
                  ? "bg-navy-500 text-white shadow-md shadow-navy-500/20"
                  : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              <SubjectGlyph icon={s.icon} name={s.name} className="h-4 w-4" />
              <span>{locale === "ar" ? s.nameAr : s.name}</span>
            </Link>
          ))}
        </div>

        <form method="get" action="/materials" className="relative max-w-xs">
          <input type="hidden" name="view" value={view} />
          {subject && <input type="hidden" name="subject" value={subject} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={locale === "ar" ? "بحث عن مادة..." : "Search materials..."}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </form>
      </div>

      {list.length === 0 && <EmptyState title={t("materials.empty")} />}

      {fresh.length > 0 && (
        <section className="space-y-4">
          <SectionTitle center>{t("materials.new")}</SectionTitle>
          <div className={gridCls}>
            {fresh.map((m) => (
              <MaterialCard key={m.id} material={m} locale={locale} t={t} view={view} />
            ))}
          </div>
        </section>
      )}

      {mine.length > 0 && (
        <section className="space-y-4">
          <SectionTitle center>{t("materials.mine")}</SectionTitle>
          <div className={gridCls}>
            {mine.map((m) => (
              <MaterialCard key={m.id} material={m} locale={locale} t={t} view={view} />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="space-y-4">
          <SectionTitle center>{t("materials.all")}</SectionTitle>
          <div className={gridCls}>
            {rest.map((m) => (
              <MaterialCard key={m.id} material={m} locale={locale} t={t} view={view} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
