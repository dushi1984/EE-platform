import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, sessionPath } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import { getMaterialBySlug } from "@/lib/queries";
import { TopBar } from "@/components/shell/TopBar";
import { Card, CrumbSep, SectionTitle } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { PdfToolbar } from "@/components/PdfToolbar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lessonId: string }> }): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "PDF" };
  const m = await getMaterialBySlug(slug, user.id);
  const l = m?.lessons.find((x) => x.id === Number(lessonId));
  return { title: l ? `${l.title} · PDF` : "PDF" };
}

export default async function LessonPdfPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
  searchParams: Promise<{ zoom?: string }>;
}) {
  const { slug, lessonId } = await params;
  const { zoom: zoomParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t, locale } = await getI18n();
  const material = await getMaterialBySlug(slug, user.id);
  if (!material) notFound();
  if (!material.purchased) redirect(await sessionPath(`/materials/${slug}`));
  const lesson = material.lessons.find((l) => l.id === Number(lessonId));
  if (!lesson) notFound();

  const zoomNum = Number(zoomParam);
  const zoom = [80, 100, 120, 150].includes(zoomNum) ? zoomNum : 100;
  const title = tr(locale, lesson.title, lesson.titleAr);

  return (
    <>
      <TopBar title={tr(locale, material.title, material.titleAr)} />

      <SectionTitle center>
        <span className="flex flex-wrap items-center justify-center gap-2 text-xl">
          <Link href={`/materials/${material.slug}`} className="font-medium text-navy-500 hover:underline dark:text-sky-300">
            {t("materials.title")}
          </Link>
          <CrumbSep />
          <Link
            href={`/materials/${material.slug}/lessons/${lesson.id}`}
            className="font-medium text-navy-500 hover:underline dark:text-sky-300"
          >
            {title}
          </Link>
          <CrumbSep />
          <span>PDF</span>
        </span>
      </SectionTitle>

      <Card className="overflow-hidden">
        <PdfToolbar title={title} lessonId={lesson.id} zoom={zoom} />
        <div className="bg-slate-200/70 p-4 sm:p-8 dark:bg-slate-800/60 print:bg-white print:p-0">
          <div
            className="mx-auto max-w-3xl rounded bg-white p-6 shadow-lg sm:p-10 print:shadow-none"
            style={{ zoom: zoom / 100 }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">{t("pdf.page")} 1</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {tr(locale, material.title, material.titleAr)} · in science
            </p>
            <hr className="my-5 border-slate-200" />
            <div dir="ltr">
              <Markdown content={lesson.content || "_No content yet._"} />
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
