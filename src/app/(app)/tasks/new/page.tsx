import Link from "next/link";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { GRADES, TASK_TYPES, tt } from "@/lib/i18n-teacher";
import { getAllSubjects } from "@/lib/queries";
import { getAcademicClasses, getAcademicLevels, getAcademicTerms } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { BackArrow, Card } from "@/components/ui";
import { AssignTaskForm } from "@/components/teacher/AssignTaskForm";

export const metadata: Metadata = { title: "Assign Task" };

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; classId?: string; student?: string; type?: string }>;
}) {
  await requireTeacher();
  const sp = await searchParams;
  const { locale } = await getI18n();
  const c = tt(locale);
  const [subjects, levels, classes, terms] = await Promise.all([
    getAllSubjects(),
    getAcademicLevels(),
    getAcademicClasses(),
    getAcademicTerms(),
  ]);

  const gradeOptions = levels.length > 0 ? levels.map((l) => l.name) : [...GRADES];

  let targetStudent: {
    id: number;
    fullName: string;
    studentCode: string;
    grade: string;
    avatarUrl: string | null;
  } | null = null;

  if (sp.student) {
    const sid = Number(sp.student);
    const st = sid ? await db.query.users.findFirst({ where: eq(users.id, sid) }) : null;
    if (st && st.role === "student") {
      targetStudent = {
        id: st.id,
        fullName: st.fullName,
        studentCode: st.studentCode,
        grade: st.grade,
        avatarUrl: st.avatarUrl,
      };
    }
  }

  const classOptions = classes.map((cl) => ({
    id: cl.id,
    name: cl.name,
    nameAr: cl.nameAr || cl.name,
    levelName: cl.levelName,
    levelNameAr: cl.levelNameAr,
  }));

  const defaultAudience = targetStudent
    ? `student:${targetStudent.id}`
    : sp.classId && classOptions.some((cl) => String(cl.id) === sp.classId)
      ? `class:${sp.classId}`
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
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {targetStudent
                ? locale === "ar"
                  ? "إسناد مهمة شخصية لطالب"
                  : "Assign Personal Task to Student"
                : c.assignTask}
            </h1>
            <p className="text-xs text-slate-500">
              {targetStudent
                ? locale === "ar"
                  ? "تم فتح النموذج من الملف الشخصي للطالب — ستظهر المهمة لهذا الطالب فقط."
                  : "Opened from student profile — this task will be assigned only to this student."
                : locale === "ar"
                  ? "إسناد المهام للفصول الدراسية أو الصفوف أو جميع الطلاب."
                  : "Assign tasks to classes, grade levels, or all students."}
            </p>
          </div>
          {targetStudent ? (
            <Link
              href={`/students/${targetStudent.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-800 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-200"
            >
              <BackArrow />
              {locale === "ar" ? `ملف الطالب: ${targetStudent.fullName}` : `Back to ${targetStudent.fullName}`}
            </Link>
          ) : (
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline dark:text-sky-400"
            >
              <BackArrow /> {c.backToTasks}
            </Link>
          )}
        </div>
        <AssignTaskForm
          subjects={subjects.map((s) => ({ id: s.id, name: s.name, nameAr: s.nameAr, icon: s.icon }))}
          grades={gradeOptions}
          classes={classOptions}
          targetStudent={targetStudent}
          terms={terms.map((tm) => ({ id: tm.id, name: tm.name, nameAr: tm.nameAr, isActive: tm.isActive }))}
          defaultAudience={defaultAudience}
          defaultTaskType={defaultTaskType}
        />
      </Card>
    </>
  );
}
