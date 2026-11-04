import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lessons, materials } from "@/db/schema";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { tt } from "@/lib/i18n-teacher";
import { getAllSubjects } from "@/lib/queries";
import { getAcademicTerms } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Card } from "@/components/ui";
import { MaterialForm, type MaterialFormValues } from "@/components/teacher/MaterialForm";

export const metadata: Metadata = { title: "Material" };

export default async function NewMaterialPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireTeacher();
  const { edit } = await searchParams;
  const { t, locale } = await getI18n();
  const c = tt(locale);
  const [subjects, terms] = await Promise.all([getAllSubjects(), getAcademicTerms()]);

  let initial: (MaterialFormValues & { termId?: number | null }) | null = null;
  if (edit) {
    const m = await db.query.materials.findFirst({ where: eq(materials.id, Number(edit)) });
    if (m) {
      const first = await db.query.lessons.findFirst({
        where: eq(lessons.materialId, m.id),
        orderBy: [asc(lessons.position)],
      });
      initial = {
        id: m.id,
        title: m.title,
        titleAr: m.titleAr,
        description: m.description,
        kind: m.kind,
        priceCents: m.priceCents,
        published: m.published,
        thumbnailUrl: m.thumbnailUrl ?? "",
        subjectId: m.subjectId,
        fileSize: m.fileSize,
        fileName: m.fileName,
        fileUrl: m.fileUrl,
        storagePath: m.storagePath,
        mimeType: m.mimeType,
        videoUrl: first?.videoUrl ?? "",
        termId: m.termId,
        content: first?.content ?? "",
      };
    }
  }

  return (
    <>
      <TopBar title={t("materials.title")} />
      <Card className="overflow-hidden">
        <h1 className="border-b border-slate-200 px-5 py-4 text-xl font-bold text-slate-900 sm:px-6 dark:border-slate-700 dark:text-white">
          {initial ? c.editMaterial : c.newMaterial}
        </h1>
        <MaterialForm
          subjects={subjects.map((s) => ({ id: s.id, name: s.name, nameAr: s.nameAr, icon: s.icon }))}
          terms={terms.map((tm) => ({ id: tm.id, name: tm.name, nameAr: tm.nameAr, isActive: tm.isActive }))}
          initial={initial}
        />
      </Card>
    </>
  );
}
