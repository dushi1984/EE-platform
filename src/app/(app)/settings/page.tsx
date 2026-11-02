import type { Metadata } from "next";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { materials, users } from "@/db/schema";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import { fill, tt } from "@/lib/i18n-teacher";
import {
  getAcademicClasses,
  getAcademicLevels,
  getAcademicSubjectsList,
  getAcademicTerms,
} from "@/lib/queries-teacher";
import {
  createClassAction,
  createLevelAction,
  createSubjectAction,
  createTermAction,
} from "@/lib/teacher-actions";
import { TopBar } from "@/components/shell/TopBar";
import { Card, Icon } from "@/components/ui";
import {
  DeleteClassBtn,
  DeleteLevelBtn,
  DeleteSubjectBtn,
  TermButtons,
} from "@/components/teacher/StructureActions";

export const metadata: Metadata = { title: "Settings" };

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white";

function AddForm({
  action,
  children,
  buttonLabel,
}: {
  action: (fd: FormData) => Promise<void>;
  children: React.ReactNode;
  buttonLabel: string;
}) {
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
      {children}
      <button className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700">
        <Icon name="plus" className="h-4 w-4" />
        {buttonLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-[140px] flex-1">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default async function SettingsPage() {
  await requireTeacher();
  const { locale } = await getI18n();
  const c = tt(locale);

  const [levels, classes, terms, subjectsList, studentCounts, classCounts, subjectUse] = await Promise.all([
    getAcademicLevels(),
    getAcademicClasses(),
    getAcademicTerms(),
    getAcademicSubjectsList(),
    db.select({ grade: users.grade, n: sql<number>`count(*)`.mapWith(Number) }).from(users).where(eq(users.role, "student")).groupBy(users.grade),
    db.select({ classId: users.classId, n: sql<number>`count(*)`.mapWith(Number) }).from(users).where(eq(users.role, "student")).groupBy(users.classId),
    db.select({ subjectId: materials.subjectId, n: sql<number>`count(*)`.mapWith(Number) }).from(materials).groupBy(materials.subjectId),
  ]);
  const studentsByGrade = new Map(studentCounts.map((r) => [r.grade, r.n]));
  const studentsByClass = new Map(classCounts.map((r) => [r.classId, r.n]));
  const useBySubject = new Map(subjectUse.map((r) => [r.subjectId, r.n]));

  return (
    <>
      <TopBar title={c.settingsTitle} />
      <p className="px-1 text-sm text-slate-600 dark:text-slate-300">{c.settingsIntro}</p>

      {/* Correction policy */}
      <Card className="border-2 border-blue-500/25 p-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.correctionPolicy}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.correctionPolicyBody}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-green-100 px-3 py-1.5 text-green-700 dark:bg-green-500/20 dark:text-green-300">✓ {c.autoGrading}</span>
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">✍️ {c.manualGrading}</span>
        </div>
      </Card>

      {/* Grade levels */}
      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.levelsTitle}</h2>
        <p className="text-sm text-slate-500">{c.levelsHint}</p>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {levels.map((l) => {
            const inLevel = classes.filter((x) => x.levelId === l.id);
            return (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{tr(locale, l.name, l.nameAr)}</p>
                  <p className="text-xs text-slate-500">
                    {fill(c.studentsCount, { n: studentsByGrade.get(l.name) ?? 0 })} · {fill(c.classesCount, { n: inLevel.length })}
                  </p>
                </div>
                <DeleteLevelBtn id={l.id} label={c.deleteLabel} />
              </li>
            );
          })}
        </ul>
        <AddForm action={createLevelAction} buttonLabel={c.add}>
          <Field label={c.nameEn}>
            <input name="name" required placeholder="Grade 10" className={input} dir="ltr" />
          </Field>
          <Field label={c.nameArLabel}>
            <input name="nameAr" placeholder="الصف الأول الثانوي" className={input} />
          </Field>
        </AddForm>
      </Card>

      {/* Classes in each grade */}
      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.classesTitle}</h2>
        <p className="text-sm text-slate-500">{c.classesHint}</p>
        <div className="mt-2 space-y-4">
          {levels.map((l) => {
            const inLevel = classes.filter((x) => x.levelId === l.id);
            return (
              <div key={l.id}>
                <p className="font-bold text-slate-800 dark:text-slate-100">{tr(locale, l.name, l.nameAr)}</p>
                {inLevel.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-400">{c.noClassesYet}</p>
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {inLevel.map((cls) => (
                      <li key={cls.id} className="flex items-center gap-2 rounded-full bg-slate-100 py-1.5 pe-3 ps-4 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {tr(locale, cls.name, cls.nameAr)}
                        <span className="text-[11px] font-medium text-slate-400">
                          {studentsByClass.get(cls.id) ?? 0}
                        </span>
                        <DeleteClassBtn id={cls.id} label="✕" />
                      </li>
                    ))}
                  </ul>
                )}
                <AddForm action={createClassAction} buttonLabel={c.add}>
                  <input type="hidden" name="levelId" value={l.id} />
                  <Field label={c.nameEn}>
                    <input name="name" required placeholder="Science A" className={input} dir="ltr" />
                  </Field>
                  <Field label={c.nameArLabel}>
                    <input name="nameAr" placeholder="علمي أ" className={input} />
                  </Field>
                </AddForm>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Terms */}
      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.termsTitle}</h2>
        <p className="text-sm text-slate-500">{c.termsHint}</p>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {terms.map((tm) => (
            <li key={tm.id} className="flex items-center justify-between gap-3 py-3">
              <p className="font-bold text-slate-900 dark:text-white">
                {tr(locale, tm.name, tm.nameAr)}
                {tm.isActive && (
                  <span className="ms-2 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-500/20 dark:text-green-300">
                    {c.activeTerm}
                  </span>
                )}
              </p>
              <TermButtons id={tm.id} isActive={tm.isActive} setActiveLabel={c.setActive} deleteLabelText={c.deleteLabel} />
            </li>
          ))}
        </ul>
        <AddForm action={createTermAction} buttonLabel={c.add}>
          <Field label={c.nameEn}>
            <input name="name" required placeholder="First Term" className={input} dir="ltr" />
          </Field>
          <Field label={c.nameArLabel}>
            <input name="nameAr" placeholder="الترم الأول" className={input} />
          </Field>
        </AddForm>
      </Card>

      {/* Subjects */}
      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.subjectsTitle}</h2>
        <p className="text-sm text-slate-500">{c.subjectsHint}</p>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {subjectsList.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <p className="font-bold text-slate-900 dark:text-white">
                {s.icon} {tr(locale, s.name, s.nameAr)}
              </p>
              <DeleteSubjectBtn id={s.id} label={c.deleteLabel} inUse={(useBySubject.get(s.id) ?? 0) > 0} inUseMsg={c.subjectInUse} />
            </li>
          ))}
        </ul>
        <AddForm action={createSubjectAction} buttonLabel={c.add}>
          <Field label={c.nameEn}>
            <input name="name" required placeholder="Chemistry" className={input} dir="ltr" />
          </Field>
          <Field label={c.nameArLabel}>
            <input name="nameAr" placeholder="الكيمياء" className={input} />
          </Field>
          <Field label={c.subjectIcon}>
            <input name="icon" placeholder="🧪" className={input} />
          </Field>
          <Field label={c.subjectColor}>
            <input name="color" placeholder="emerald" className={input} dir="ltr" />
          </Field>
        </AddForm>
      </Card>
    </>
  );
}
