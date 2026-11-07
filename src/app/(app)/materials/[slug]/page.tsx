import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { fmtMoney, tr } from "@/lib/i18n";
import {
  canAccessMaterialContent,
  canAccessStudentPage,
  canPurchaseMaterials,
  firstAllowedPath,
  getAccessPolicy,
} from "@/lib/access";
import { getMaterialBySlug, recordMaterialView } from "@/lib/queries";
import { parseGoogleDriveUrl } from "@/lib/storage";
import { PurchaseButton } from "@/components/PurchaseModal";
import { TopBar } from "@/components/shell/TopBar";
import { Badge, Card, ForwardArrow, Icon, ProgressBar, SectionTitle, SubjectBadge } from "@/components/ui";
import { MaterialThumb } from "@/components/MaterialCard";
import { DownloadButton } from "@/components/TaskSubmissionForm";
import { PageAccessNotice } from "@/components/PageAccessNotice";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const user = await getCurrentUser();
  const m = await getMaterialBySlug(slug, user ? user.id : -1);
  return { title: m?.title ?? "Material" };
}

export default async function MaterialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [user, policy, { t, locale }] = await Promise.all([
    getCurrentUser(),
    getAccessPolicy(),
    getI18n(),
  ]);

  if (!user && !canAccessStudentPage(null, "materials", policy)) {
    redirect(`/login?next=${encodeURIComponent(`/materials/${slug}`)}`);
  }
  if (user?.role === "student" && !canAccessStudentPage(user, "materials", policy)) {
    return (
      <>
        <TopBar title={t("materials.title")} />
        <PageAccessNotice locale={locale} backHref={firstAllowedPath(user, policy)} />
      </>
    );
  }

  const material = await getMaterialBySlug(slug, user ? user.id : -1);
  if (!material) notFound();
  if (user?.role === "teacher") redirect(`/materials?m=${material.id}`);
  if (user) {
    await recordMaterialView(user.id, material.id);
  }

  const canOpen = canAccessMaterialContent(user, material, policy);
  const canPurchase = user ? canPurchaseMaterials(user, policy) : false;

  const title = tr(locale, material.title, material.titleAr);
  const total = material.lessons.length;
  const done = material.lessons.filter((l) => material.doneSet.has(l.id)).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const minutes = material.lessons.reduce((a, l) => a + l.durationMinutes, 0);
  const quizCount = material.lessons.reduce((a, l) => a + l.questions.length, 0);
  const nextLesson = material.lessons.find((l) => !material.doneSet.has(l.id)) ?? material.lessons[0];

  return (
    <>
      <TopBar title={t("materials.title")} />

      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[420px_1fr]">
          <div className="relative aspect-[2/1] lg:aspect-auto lg:min-h-[260px]">
            <MaterialThumb url={material.thumbnailUrl} title={title} />
            {material.isNew && !canOpen && <Badge tone="new" className="absolute start-3 top-3 shadow">{t("materials.newBadge")}</Badge>}
          </div>
          <div className="flex flex-col p-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-navy-500 dark:text-sky-300">
              <SubjectBadge icon={material.subject.icon} name={material.subject.name} size="xs" />
              <span>{tr(locale, material.subject.name, material.subject.nameAr)}</span>
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-3 leading-relaxed text-slate-700 dark:text-slate-300">{tr(locale, material.description, material.descriptionAr)}</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
              <li>
                {total} {t("common.lessons")}
              </li>
              <li>
                {minutes} {t("common.min")}
              </li>
              <li>
                {quizCount} {t("materials.quizQuestions")}
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              {canOpen ? (
                <>
                  {nextLesson && (
                    <Link href={`/materials/${material.slug}/lessons/${nextLesson.id}`} className="inline-flex items-center gap-2 rounded-xl bg-navy-500 px-5 py-3 font-semibold text-white shadow hover:bg-navy-600">
                      <Icon name="play" className="h-4 w-4" />
                      {!user ? t("materials.open") : percent === 100 ? t("materials.review") : done === 0 ? t("materials.start") : t("materials.continue")}
                    </Link>
                  )}
                  {user && (
                    <div className="min-w-[200px] flex-1">
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>{t("materials.progress")}</span>
                        <span>
                          {done}/{total} · {percent}%
                        </span>
                      </div>
                      <ProgressBar percent={percent} />
                    </div>
                  )}
                  {(material.storagePath || material.fileUrl) && (
                    parseGoogleDriveUrl(material.fileUrl) ? (
                      <a
                        href={parseGoogleDriveUrl(material.fileUrl)!.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-navy-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300"
                      >
                        <Icon name="drive" className="h-4 w-4" />
                        {locale === "ar" ? "فتح في Google Drive" : "Open in Drive"}
                      </a>
                    ) : (
                      <DownloadButton
                        url={`/api/materials/${material.id}/file`}
                        label={locale === "ar" ? "تحميل المستند" : "Download File"}
                      />
                    )
                  )}
                  {user && percent === 100 && (
                    <Link
                      href={`/materials/${material.slug}/certificate`}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:opacity-90"
                    >
                      <Icon name="trophy" className="h-4.5 w-4.5" />
                      {locale === "ar" ? "شهادة الإتمام" : "Certificate"}
                    </Link>
                  )}
                </>
              ) : !user ? (
                <>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-navy-500 px-5 py-3 text-sm font-extrabold text-white shadow hover:bg-navy-600"
                  >
                    <Icon name="sparkles" className="h-4 w-4" />
                    {locale === "ar" ? "أنشئ حساب طالب للفتح" : "Create Student Account to Unlock"}
                  </Link>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-base font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Icon name="tag" className="h-4 w-4 text-slate-500" />
                    {material.priceCents === 0 ? t("common.free") : fmtMoney(locale, material.priceCents)}
                  </span>
                </>
              ) : !canPurchase ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <Icon name="lock" className="h-4 w-4" />
                    {locale === "ar"
                      ? "تُفتح هذه المادة بعد موافقة المعلم على حسابك"
                      : "Unlocks once your teacher approves your account"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-base font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Icon name="tag" className="h-4 w-4 text-slate-500" />
                    {material.priceCents === 0 ? t("common.free") : fmtMoney(locale, material.priceCents)}
                  </span>
                </div>
              ) : (
                <>
                  <PurchaseButton
                    materialId={material.id}
                    title={material.title}
                    titleAr={material.titleAr}
                    thumbnailUrl={material.thumbnailUrl}
                    priceCents={material.priceCents}
                    size="lg"
                  />
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-base font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <Icon name="tag" className="h-4 w-4 text-slate-500" />
                    {material.priceCents === 0 ? t("common.free") : fmtMoney(locale, material.priceCents)}
                  </span>
                  <p className="basis-full text-xs text-slate-500">{t("common.demoNote")}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <SectionTitle>{t("materials.curriculum")}</SectionTitle>
        {!canOpen && (
          <p className="flex items-center gap-2 px-1 text-sm text-slate-600 dark:text-slate-400">
            <Icon name="lock" className="h-4 w-4" /> {t("materials.locked")}
          </p>
        )}
        <Card className="overflow-hidden">
          <ol>
            {material.lessons.map((l, i) => {
              const completed = material.doneSet.has(l.id);
              const row = (
                <div className="flex items-center gap-4 px-5 py-4">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${completed ? "bg-green-500 text-white" : "bg-navy-500/10 text-navy-600 dark:bg-white/10 dark:text-sky-300"}`}>
                    {completed ? <Icon name="check" className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{tr(locale, l.title, l.titleAr)}</p>
                    <p className="text-xs text-slate-500">
                      {l.durationMinutes} {t("common.min")}
                      {l.questions.length > 0 && ` · ${l.questions.length} ${t("materials.quizQuestions")}`}
                    </p>
                  </div>
                  {canOpen ? <span className="text-xs font-semibold text-navy-500 dark:text-sky-300">{t("materials.open")} <ForwardArrow /></span> : <Icon name="lock" className="h-4 w-4 text-slate-400" />}
                </div>
              );
              return (
                <li key={l.id} className="border-t border-slate-100 first:border-0 dark:border-slate-800">
                  {canOpen ? (
                    <Link href={`/materials/${material.slug}/lessons/${l.id}`} className="block hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      </section>
    </>
  );
}
