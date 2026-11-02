import type { Metadata } from "next";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { tt } from "@/lib/i18n-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Card } from "@/components/ui";
import { StudentCreateForm } from "@/components/teacher/StudentCreateForm";
import { getAcademicClasses, getAcademicLevels } from "@/lib/queries-teacher";

export const metadata: Metadata = { title: "Add Student" };

export default async function NewStudentPage() {
  await requireTeacher();
  const { locale } = await getI18n();
  const c = tt(locale);

  return (
    <>
      <TopBar title={c.navStudents} />
      <Card className="overflow-hidden">
        <h1 className="border-b border-slate-200 px-5 py-4 text-2xl font-bold text-slate-900 dark:border-slate-700 dark:text-white">
          {c.addStudentTitle}
        </h1>
        <StudentFormLoader locale={locale} />
      </Card>
    </>
  );
}

async function StudentFormLoader({ locale }: { locale: string }) {
  void locale;
  const [levels, classes] = await Promise.all([getAcademicLevels(), getAcademicClasses()]);
  return (
    <StudentCreateForm
      levels={levels.map((l) => ({ id: l.id, name: l.name, nameAr: l.nameAr }))}
      classes={classes.map((cl) => ({ id: cl.id, name: cl.name, nameAr: cl.nameAr, levelId: cl.levelId, levelName: cl.levelName }))}
    />
  );
}
