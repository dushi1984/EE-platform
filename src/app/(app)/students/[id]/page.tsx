import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, tr } from "@/lib/i18n";
import { gradeLabel, tt } from "@/lib/i18n-teacher";
import { getStudentDetail, getStudentTrend } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, BackArrow, Card, Icon, ProgressBar, SectionTitle, SubjectBadge } from "@/components/ui";
import { AccountStatusPill, StatusPill } from "@/components/teacher/StatusPill";
import { StudentModerationControls } from "@/components/teacher/StudentModerationControls";
import { TrendChart } from "@/components/teacher/TrendChart";
import { StudentTaskReviewCard } from "@/components/teacher/TeacherTaskReviewControls";

export const metadata: Metadata = { title: "Student Profile" };

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const { locale } = await getI18n();
  const c = tt(locale);
  const detail = await getStudentDetail(Number(id));
  if (!detail) notFound();
  const { student, fullUser, studentClass } = detail;
  const trend = await getStudentTrend(student.id);
  const months = trend.map((p) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { month: "short" }).format(p.date),
  );

  return (
    <>
      <TopBar title={c.navStudents} />
      <SectionTitle
        action={
          <Link href="/students" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline">
            <BackArrow /> {c.backToStudents}
          </Link>
        }
      >
        {c.studentProfile}
      </SectionTitle>

      <div className="grid items-start gap-5 lg:grid-cols-[305px_1fr]">
        <Card className="p-6 text-center">
          <Avatar name={student.fullName} src={student.avatarUrl} size={116} className="mx-auto ring-4 ring-slate-100 dark:ring-slate-800" />
          <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">{student.fullName}</h1>
          <p className="text-sm text-slate-500">
            {gradeLabel(locale, student.grade)}
            {studentClass
              ? ` · ${locale === "ar" ? studentClass.nameAr || studentClass.name : studentClass.name}`
              : ""}{" "}
            · <span dir="ltr">{student.studentCode}</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <AccountStatusPill status={student.accountStatus} locale={locale} />
            <StatusPill status={student.status} locale={locale} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              [student.avgGrade !== null ? `${student.avgGrade}%` : "—", c.avgGrades],
              [student.doneTasks, c.tasksDone],
              [student.openTasks, c.openTasks],
            ].map(([v, l]) => (
              <div key={String(l)} className="rounded-xl bg-slate-100 px-1 py-3 dark:bg-slate-800">
                <p className="text-xl font-extrabold text-slate-900 dark:text-white">{v}</p>
                <p className="text-[10px] font-semibold leading-tight text-slate-500">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2.5">
            <Link
              href={`/tasks/new?student=${student.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-500 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-navy-600"
            >
              <Icon name="assign" className="h-5 w-5" />
              {locale === "ar" ? "إسناد مهمة لهذا الطالب" : "Assign Task to Student"}
            </Link>
            <Link
              href={`/tasks/new?student=${student.id}&type=quiz`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700"
            >
              <Icon name="quiz" className="h-5 w-5" />
              {locale === "ar" ? "إسناد اختبار قصير للطالب" : "Assign Quiz to Student"}
            </Link>
            <Link
              href={`/students/${student.id}/message`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Icon name="mail" className="h-5 w-5" /> {c.message}
            </Link>
          </div>
        </Card>

        <div className="space-y-5">
          <StudentModerationControls
            studentId={student.id}
            studentName={student.fullName}
            studentGrade={student.grade}
            currentStatus={student.accountStatus}
            currentClassId={fullUser.classId}
            currentNote={fullUser.statusNote}
            classes={detail.allClasses.map((cl) => ({
              id: cl.id,
              name: cl.name,
              nameAr: cl.nameAr,
              levelName: cl.level.name,
              levelNameAr: cl.level.nameAr,
            }))}
            locale={locale}
          />

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.contactInfo}</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Info label="Email" value={fullUser.email || "—"} />
              <Info label={locale === "ar" ? "رقم الهاتف" : "Phone"} value={fullUser.phone || "—"} />
              <Info label={c.dateOfBirth} value={fullUser.dateOfBirth ? fmtDate(locale, fullUser.dateOfBirth) : "—"} />
              <Info label={c.parentName} value={fullUser.parentName || "—"} />
              <Info label={c.parentPhone} value={fullUser.parentPhone || "—"} />
              <Info label={c.lastLogin} value={fullUser.lastLoginAt ? fmtDate(locale, fullUser.lastLoginAt) : c.never} />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.academicSummary}</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_240px]">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{c.taskProgress}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{student.progressPct}%</span>
                </div>
                <ProgressBar percent={student.progressPct} className="mt-2 !h-3" />
                <p className="mt-2 text-xs text-slate-500">
                  {student.doneTasks}/{student.totalTasks} {c.tasksDone}
                </p>
              </div>
              <div>
                <TrendChart points={trend.map((p) => p.pct)} labels={months} empty={c.noTrend} />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <h2 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-slate-900 dark:border-slate-700 dark:text-white">
              {c.recentGrades}
            </h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {detail.recentGrades.length === 0 && (
                <li className="p-6 text-center text-sm text-slate-500">{c.noRecentGrades}</li>
              )}
              {detail.recentGrades.map((g) => {
                const pct = Math.round((g.score / g.maxScore) * 100);
                return (
                  <li key={g.id} className="flex items-center gap-3 px-5 py-3">
                    <SubjectBadge icon={g.subject.icon} name={g.subject.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {tr(locale, g.title, g.titleAr)}
                      </p>
                      <p className="text-xs text-slate-500">{fmtDate(locale, g.gradedAt)}</p>
                    </div>
                    <span className={`font-extrabold ${pct >= 70 ? "text-green-600" : "text-red-500"}`}>{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>

      {/* Full-Width Assigned Tasks — Preview, Manual Correction, Check & Status Control */}
      <section className="space-y-3 pt-2">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {locale === "ar"
                  ? `المهام المسندة للطالب (${detail.recentTasks.length}) — معاينة وتصحيح يدوي وحالة المهمة`
                  : `Assigned Tasks (${detail.recentTasks.length}) — Preview, Check, Correct & Change Status`}
              </h2>
              <p className="text-xs text-slate-500">
                {locale === "ar"
                  ? "عاين كل مهمة مسندة للطالب، راجع إجاباته، صحّحها يدوياً، أو غيّر حالة المهمة مباشرة."
                  : "Preview any assigned task or quiz, inspect student work, grade manually, mark checked, or change task status."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/tasks/new?student=${student.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-600"
              >
                <Icon name="assign" className="h-4 w-4" />
                {locale === "ar" ? "+ إسناد مهمة للطالب" : "+ Assign Personal Task"}
              </Link>
              <Link
                href={`/tasks/new?student=${student.id}&type=quiz`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-violet-700"
              >
                <Icon name="quiz" className="h-4 w-4" />
                {locale === "ar" ? "+ إسناد اختبار قصير" : "+ Assign Personal Quiz"}
              </Link>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            {detail.recentTasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">{c.noRecentTasks}</p>
            ) : (
              detail.recentTasks.map(({ task, progress, submission, isPersonal, targetClassName, targetClassNameAr }) => {
                const rawStatus = progress?.status;
                const studentStatus: "todo" | "in_progress" | "done" =
                  rawStatus === "done" || rawStatus === "in_progress"
                    ? rawStatus
                    : submission
                      ? "done"
                      : "todo";
                return (
                  <StudentTaskReviewCard
                    key={task.id}
                    item={{
                      task: {
                        id: task.id,
                        title: task.title,
                        titleAr: task.titleAr,
                        description: task.description,
                        descriptionAr: task.descriptionAr,
                        taskType: task.taskType,
                        status: task.status,
                        maxScore: task.maxScore,
                        dueDate: task.dueDate,
                        attachmentName: task.attachmentName,
                        attachmentUrl: task.attachmentUrl,
                        quizQuestions: task.quizQuestions ?? null,
                        subject: task.subject,
                      },
                      userId: student.id,
                      studentName: student.fullName,
                      isPersonal,
                      targetClassName,
                      targetClassNameAr,
                      studentStatus,
                      submission: submission
                        ? {
                            id: submission.id,
                            fileName: submission.fileName,
                            fileUrl: submission.fileUrl,
                            note: submission.note,
                            teacherFeedback: submission.teacherFeedback ?? "",
                            checkedAt: submission.checkedAt ?? null,
                            quizAnswers: submission.quizAnswers ?? null,
                            submittedAt: submission.submittedAt,
                            score: submission.score,
                            gradedAt: submission.gradedAt,
                          }
                        : null,
                    }}
                  />
                );
              })
            )}
          </div>
        </Card>
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-all font-semibold text-slate-900 dark:text-white" dir="auto">
        {value}
      </dd>
    </div>
  );
}
