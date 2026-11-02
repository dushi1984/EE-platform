import Link from "next/link";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, fmtMoney, tr } from "@/lib/i18n";
import { timeAgo, tt } from "@/lib/i18n-teacher";
import { getTeacherMaterials } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Card, Icon } from "@/components/ui";
import { MaterialThumb } from "@/components/MaterialCard";
import { DeleteMaterialButton, PublishMaterialButton } from "./DeleteMaterialButton";

function KindIcon({ kind }: { kind: string }) {
  if (kind === "pdf") {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/20">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M6 2h8l5 5v15H6z" />
          <path d="M14 2v5h5" />
        </svg>
      </span>
    );
  }
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/20">
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="4" />
        <path d="M10 9l5 3-5 3z" fill="currentColor" />
      </svg>
    </span>
  );
}

function PublishPill({ published, label }: { published: boolean; label: string }) {
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${published ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200"}`}>
      {label}
    </span>
  );
}

export async function TeacherMaterialsView({ selected }: { selected?: string }) {
  await requireTeacher();
  const { t, locale } = await getI18n();
  const c = tt(locale);
  const list = await getTeacherMaterials();
  const current = list.find((m) => String(m.id) === selected) ?? list[0] ?? null;
  const firstLesson = current?.lessons[0] ?? null;

  return (
    <>
      <TopBar title={t("materials.title")} />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_390px]">
        <div className="space-y-3">
          <Link
            href="/materials/new"
            className="flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 py-6 text-slate-500 transition hover:border-blue-400 hover:bg-white hover:text-blue-600 dark:border-slate-600 dark:bg-slate-900/60"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-current">
              <Icon name="plus" className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold">{c.addNew}</span>
          </Link>

          {list.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 dark:bg-slate-900">{c.noMaterials}</p>}

          {list.map((m) => {
            const on = current?.id === m.id;
            return (
              <Link
                key={m.id}
                href={`/materials?m=${m.id}`}
                className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 transition hover:shadow-md dark:bg-slate-900 ${on ? "ring-2 ring-blue-500" : "ring-slate-900/5 dark:ring-white/10"}`}
              >
                <KindIcon kind={m.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900 dark:text-white">{tr(locale, m.title, m.titleAr)}</p>
                  <p className="text-sm text-slate-500">
                    {c.updated} {timeAgo(locale, m.updatedAt)}
                  </p>
                </div>
                <PublishPill published={m.published} label={m.published ? c.published : c.draft} />
              </Link>
            );
          })}
        </div>

        {/* Detail */}
        <Card className="overflow-hidden">
          {!current ? (
            <p className="p-8 text-center text-sm text-slate-500">{c.noMaterials}</p>
          ) : (
            <>
              <div className="px-5 pt-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tr(locale, current.title, current.titleAr)}</h2>
                <p className="text-sm text-slate-500">
                  {c.updated} {timeAgo(locale, current.updatedAt)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-700">
                <Link
                  href={`/materials/new?edit=${current.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-100 px-4 py-3 text-sm font-bold text-green-800 transition hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300"
                >
                  <Icon name="pencil" className="h-5 w-5" />
                  {c.edit}
                </Link>
                <DeleteMaterialButton id={current.id} />
              </div>

              <div className="grid gap-4 border-b border-slate-200 p-4 sm:grid-cols-[150px_1fr] dark:border-slate-700">
                <div className="aspect-[3/4] overflow-hidden rounded-lg bg-slate-100 sm:aspect-auto sm:h-48">
                  <MaterialThumb url={current.thumbnailUrl} title={current.title} />
                </div>
                <dl className="space-y-2 text-sm">
                  {[
                    [c.type, current.kind === "pdf" ? c.pdf : c.video],
                    [c.visibility, current.priceCents === 0 ? c.free : fmtMoney(locale, current.priceCents)],
                    [c.createdDate, fmtDate(locale, current.createdAt)],
                    [c.fileSize, current.fileSize || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <dt className="font-semibold text-slate-600 dark:text-slate-300">{k}</dt>
                      <dd className="font-bold text-slate-900 dark:text-white">{v}</dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-semibold text-slate-600 dark:text-slate-300">{c.status}</dt>
                    <dd>
                      <PublishMaterialButton id={current.id} published={current.published} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-semibold text-slate-600 dark:text-slate-300">{c.subject}</dt>
                    <dd className="font-bold text-slate-900 dark:text-white">
                      {current.subject.icon} {tr(locale, current.subject.name, current.subject.nameAr)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-slate-900 dark:text-white">{c.description}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {tr(locale, current.description, current.descriptionAr) || "—"}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  {current.lessons.length} {t("common.lessons")}
                </p>

                {firstLesson && (
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <Link
                      href={`/materials/${current.slug}/lessons/${firstLesson.id}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-navy-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-navy-600"
                    >
                      <Icon name="play" className="h-4 w-4" />
                      {locale === "ar" ? "معاينة الدرس" : "Preview Lesson"}
                    </Link>
                    <Link
                      href={`/materials/${current.slug}/lessons/${firstLesson.id}/pdf`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Icon name="file" className="h-4 w-4" />
                      {locale === "ar" ? "معاينة PDF" : "Preview PDF"}
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
