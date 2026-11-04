import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { GRADES, TASK_TYPES, tt } from "@/lib/i18n-teacher";
import { getAllSubjects } from "@/lib/queries";
import { getAcademicLevels, getAcademicTerms } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Card } from "@/components/ui";
import { AssignTaskForm } from "@/components/teacher/AssignTaskForm";

export const metadata: Metadata = { title: "Assign Task" };

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; student?: string; type?: string }>;
}) {
  await requireTeacher();
  const sp = await searchParams;
  const { locale } = await getI18n();
  const c = tt(locale);
  const [subjects, levels, terms, studentRows] = await Promise.all([
    getAllSubjects(),
    getAcademicLevels(),
    getAcademicTerms(),
    db.query.users.findMany({
      where: eq(users.role, "student"),
      orderBy: [asc(users.fullName)],
    }),
  ]);

  const gradeOptions = levels.length > 0 ? levels.map((l) => l.name) : [...GRADES];
  const students = studentRows.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    studentCode: s.studentCode,
    grade: s.grade,
  }));

  const targetStudent = sp.student ? students.find((s) => String(s.id) === sp.student) ?? null : null;
  const defaultAudience = targetStudent
    ? `student:${targetStudent.id}`
    : sp.grade && gradeOptions.includes(sp.grade)
      ? sp.grade
      : "all";
  const defaultTaskType =
    sp.type && (TASK_TYPES as readonly string[]).includes(sp.type) ? sp.type : "";

  return (
    <>
      <TopBar title={c.assignTask} />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4 sm:px-8 dark:border-slate-700">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{c.assignTask}</h1>
          {targetStudent && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
              {locale === "ar" ? `مخصص للطالب: ${targetStudent.fullName}` : `Personal for ${targetStudent.fullName}`}
            </span>
          )}
        </div>
        <AssignTaskForm
          subjects={subjects.map((s) => ({ id: s.id, name: s.name, nameAr: s.nameAr, icon: s.icon }))}
          grades={gradeOptions}
          students={students}
          targetStudent={targetStudent}
          terms={terms.map((tm) => ({ id: tm.id, name: tm.name, nameAr: tm.nameAr, isActive: tm.isActive }))}
          defaultAudience={defaultAudience}
          defaultTaskType={defaultTaskType}
        />
      </Card>
    </>
  );
}
