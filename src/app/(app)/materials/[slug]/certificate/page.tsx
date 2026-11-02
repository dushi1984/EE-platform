import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { getCertificateData, getMaterialBySlug } from "@/lib/queries";
import { TopBar } from "@/components/shell/TopBar";
import { Logo } from "@/components/ui";
import { CertificateActions } from "@/components/CertificateActions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "Certificate" };
  const data = await getCertificateData(user.id, slug);
  return { title: data ? `Certificate · ${data.materialTitle}` : "Certificate" };
}

export default async function CertificatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { t, locale } = await getI18n();

  const [material, data] = await Promise.all([getMaterialBySlug(slug, user.id), getCertificateData(user.id, slug)]);
  if (!material || !data) notFound();

  const completed = data.lessonsCompleted === data.lessonsTotal && data.lessonsTotal > 0;
  if (!completed) redirect(`/materials/${slug}`);

  const title = tr(locale, data.materialTitle, data.materialTitleAr);
  const grade = data.averageGrade;

  return (
    <>
      <TopBar title={locale === "ar" ? "شهادة إتمام" : "Certificate"} />

      <div className="mx-auto max-w-3xl space-y-5">
        <div className="overflow-hidden rounded-3xl border-4 border-sun-400 bg-white shadow-2xl print:border-2 print:shadow-none">
          {/* Ribbon header */}
          <div className="relative bg-gradient-to-br from-navy-600 via-navy-500 to-blue-700 px-8 py-8 text-center text-white print:from-navy-600 print:to-navy-600">
            <div className="flex justify-center">
              <Logo className="h-14 w-14 text-sun-400" />
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              {locale === "ar" ? "شهادة إتمام" : "Certificate of Completion"}
            </h1>
            <p className="mt-1 text-sm font-medium uppercase tracking-[0.25em] text-blue-200">
              in science · {locale === "ar" ? "منصة تعليمية" : "Learning Platform"}
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-10 text-center sm:px-14">
            <p className="text-sm text-slate-500">{locale === "ar" ? "هذه الشهادة مقدَّمة إلى" : "This certificate is proudly presented to"}</p>
            <p className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">{data.studentName}</p>
            <p className="mt-1 text-sm text-slate-500" dir="ltr">
              {locale === "ar" ? "رقم الطالب" : "Student ID"}: {data.studentCode}
            </p>

            <div className="mx-auto my-7 h-px w-40 bg-slate-200" />

            <p className="text-sm text-slate-500">{locale === "ar" ? "لإتمامه بنجاح كل دروس" : "for successfully completing every lesson in"}</p>
            <p className="mt-2 text-2xl font-bold text-navy-600">{title}</p>
            <p className="mt-1 text-sm text-slate-500">
              {data.subjectIcon} {tr(locale, data.subjectName, data.subjectNameAr)}
            </p>

            {/* Score summary */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-100 px-3 py-4">
                <p className="text-2xl font-extrabold text-slate-900">
                  {data.lessonsCompleted}/{data.lessonsTotal}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{locale === "ar" ? "الدروس" : "Lessons"}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-4">
                <p className="text-2xl font-extrabold text-green-600">100%</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{locale === "ar" ? "الإنجاز" : "Complete"}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-4">
                <p className="text-2xl font-extrabold text-blue-600">{grade != null ? `${grade}%` : "—"}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{locale === "ar" ? "الدرجة" : "Grade"}</p>
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-10 flex items-end justify-between gap-6 text-start">
              <div>
                <p className="text-sm font-bold text-slate-900">{data.issuedBy}</p>
                <p className="text-xs text-slate-500">{locale === "ar" ? "معلمة المادة" : "Subject Instructor"}</p>
                <div className="mt-1 h-px w-40 bg-slate-300" />
              </div>
              <div className="text-end">
                <p className="text-sm font-bold text-slate-900">{fmtDate(locale, new Date())}</p>
                <p className="text-xs text-slate-500">{locale === "ar" ? "تاريخ الإصدار" : "Date issued"}</p>
                <div className="mt-1 h-px w-40 bg-slate-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <CertificateActions />
      </div>
    </>
  );
}
