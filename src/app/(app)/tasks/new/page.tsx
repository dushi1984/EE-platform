import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { tt } from "@/lib/i18n-teacher";
import { getAllSubjects } from "@/lib/queries";
import { getAcademicLevels, getAcademicTerms } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Card } from "@/components/ui";
import { AssignTaskForm } from "@/components/teacher/AssignTaskForm";

export const metadata: Metadata = { title: "Assign Task" };

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  await requireTeacher();
  const { student } = await searchParams;
  const { t, locale } = await getI18n();
  const c = tt(locale);
  const [subjects, levels, terms] = await Promise.all([getAllSubjects(), getAcademicLevels(), getAcademicTerms()]);
  const target = student ? await db.query.users.findFirst({ where: eq(users.id, Number(student)) }) : null;

  return (
    <>
      <TopBar title={t("tasks.title")} />
      <Card className="overflow-hidden">
        <h1 className="border-b border-slate-200 px-5 py-4 text-xl font-bold text-slate-900 sm:px-6 dark:border-slate-700 dark:text-white">{c.assignTask}</h1>
        <AssignTaskForm
          subjects={subjects.map((s) => ({ id: s.id, name: s.name, nameAr: s.nameAr, icon: s.icon }))}
          defaultAudience={target && target.role === "student" ? target.grade : "all"}
          levels={levels.map((l) => ({ id: l.id, name: l.name, nameAr: l.nameAr }))}
          terms={terms.map((tm) => ({ id: tm.id, name: tm.name, nameAr: tm.nameAr, isActive: tm.isActive }))}
        />
      </Card>
    </>
  );
}
