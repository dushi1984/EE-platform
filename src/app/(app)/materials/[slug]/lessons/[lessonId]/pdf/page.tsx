import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, sessionPath } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import { canAccessMaterialContent, canAccessStudentPage, getAccessPolicy } from "@/lib/access";
import { getMaterialBySlug } from "@/lib/queries";
import { createSignedDownloadUrl, parseGoogleDriveUrl } from "@/lib/storage";
import { TopBar } from "@/components/shell/TopBar";
import { Card, CrumbSep, Icon, SectionTitle } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { PdfToolbar } from "@/components/PdfToolbar";
import { DownloadButton } from "@/components/TaskSubmissionForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; lessonId: string }> }): Promise<Metadata> {
  const { slug, lessonId } = await params;
  const user = await getCurrentUser();
  const m = await getMaterialBySlug(slug, user ? user.id : -1);
  const l = m?.lessons.find((x) => x.id === Number(lessonId));
  return { title: l ? `${l.title} · Document` : "Document" };
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
  const [user, policy, { t, locale }] = await Promise.all([
    getCurrentUser(),
    getAccessPolicy(),
    getI18n(),
  ]);

  if (!user && !canAccessStudentPage(null, "materials", policy)) {
    redirect(`/login?next=${encodeURIComponent(`/materials/${slug}`)}`);
  }
  if (user?.role === "student" && !canAccessStudentPage(user, "materials", policy)) {
    redirect(await sessionPath("/dashboard"));
  }

  const material = await getMaterialBySlug(slug, user ? user.id : -1);
  if (!material) notFound();
  if (!canAccessMaterialContent(user, material, policy)) {
    redirect(user ? await sessionPath(`/materials/${slug}`) : `/materials/${slug}`);
  }
  const lesson = material.lessons.find((l) => l.id === Number(lessonId));
  if (!lesson) notFound();

  const zoomNum = Number(zoomParam);
  const zoom = [80, 100, 120, 150].includes(zoomNum) ? zoomNum : 100;
  const title = tr(locale, lesson.title, lesson.titleAr);

  const drive = parseGoogleDriveUrl(material.fileUrl);
  const signedPdfUrl =
    material.storagePath && (material.kind === "pdf" || (material.fileName ?? "").toLowerCase().endsWith(".pdf"))
      ? await createSignedDownloadUrl(material.storagePath, 3600)
      : null;

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
          <span>{material.kind === "doc" ? "DOC" : "PDF"}</span>
        </span>
      </SectionTitle>

      {/* Cloud Document Bar when stored in Supabase `files` bucket or Google Drive */}
      {(material.storagePath || material.fileUrl) && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
              <Icon name={drive ? "drive" : "cloud"} className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {material.fileName || tr(locale, material.title, material.titleAr)}
              </p>
              <p className="text-xs text-slate-500">
                {drive
                  ? "Google Drive"
                  : locale === "ar"
                    ? "محفوظ في سحابة Supabase (حاوية files)"
                    : "Stored in Supabase Cloud (files bucket)"}
                {material.fileSize ? ` · ${material.fileSize}` : ""}
              </p>
            </div>
          </div>
          {drive ? (
            <a
              href={drive.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-500 px-4 py-2 text-xs font-bold text-white hover:bg-navy-600"
            >
              <Icon name="drive" className="h-4 w-4" />
              {locale === "ar" ? "فتح في Google Drive" : "Open in Google Drive"}
            </a>
          ) : (
            <DownloadButton
              url={`/api/materials/${material.id}/file`}
              label={locale === "ar" ? "تحميل الملف الأصلي" : "Download Original File"}
            />
          )}
        </Card>
      )}

      {/* Embedded PDF / Google Drive Preview when available */}
      {(signedPdfUrl || drive) && (
        <Card className="overflow-hidden">
          <iframe
            src={signedPdfUrl || drive!.previewUrl}
            title={title}
            className="h-[72vh] w-full border-0"
          />
        </Card>
      )}

      {/* Formatted Study Sheet */}
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
