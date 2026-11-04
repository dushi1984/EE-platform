"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StudentPageKey, VisitorPageKey } from "@/db/schema";
import type { AccessPolicy } from "@/lib/access";
import type { Locale } from "@/lib/i18n";
import {
  saveAccessPolicyAction,
  setMaterialGuestAccessAction,
  setTaskGuestAccessAction,
} from "@/lib/teacher-actions";
import { Card, Icon } from "@/components/ui";

type MaterialAccessItem = {
  id: number;
  title: string;
  titleAr: string;
  subjectName: string;
  subjectNameAr: string;
  priceCents: number;
  published: boolean;
  allowPendingStudents: boolean;
  allowVisitors: boolean;
};

type TaskAccessItem = {
  id: number;
  title: string;
  titleAr: string;
  subjectName: string;
  subjectNameAr: string;
  targetLabel: string;
  isPersonal: boolean;
  allowPendingStudents: boolean;
  allowVisitors: boolean;
};

const PENDING_PAGE_OPTIONS: {
  key: StudentPageKey;
  en: string;
  ar: string;
  locked?: boolean;
}[] = [
  { key: "dashboard", en: "Dashboard", ar: "لوحة التحكم" },
  { key: "materials", en: "Materials & Lessons", ar: "المواد والدروس" },
  { key: "tasks", en: "Tasks & Quizzes", ar: "المهام والاختبارات" },
  { key: "grades", en: "Grades & Insights", ar: "الدرجات والتقارير" },
  { key: "messages", en: "Messages with Teacher", ar: "مراسلة المعلم" },
  { key: "notifications", en: "Notifications", ar: "الإشعارات" },
  { key: "profile", en: "Profile & Account (Always on)", ar: "الملف الشخصي (مفعّل دائماً)", locked: true },
];

const VISITOR_PAGE_OPTIONS: {
  key: VisitorPageKey;
  en: string;
  ar: string;
}[] = [
  { key: "dashboard", en: "Visitor Dashboard", ar: "لوحة تحكم الزائر" },
  { key: "materials", en: "Free Materials Catalog", ar: "تصفح المواد المجانية" },
  { key: "tasks", en: "Sample Tasks & Quizzes", ar: "معاينة المهام التجريبية" },
];

export function AccessControlSettings({
  locale,
  initialPolicy,
  materialsList,
  tasksList,
}: {
  locale: Locale;
  initialPolicy: AccessPolicy;
  materialsList: MaterialAccessItem[];
  tasksList: TaskAccessItem[];
}) {
  const router = useRouter();
  const [pendingPages, setPendingPages] = useState<StudentPageKey[]>(initialPolicy.pendingPages);
  const [visitorPages, setVisitorPages] = useState<VisitorPageKey[]>(initialPolicy.visitorPages);
  const [pendingCanSubmitTasks, setPendingCanSubmitTasks] = useState(
    initialPolicy.pendingCanSubmitTasks,
  );
  const [pendingCanPurchase, setPendingCanPurchase] = useState(initialPolicy.pendingCanPurchase);

  const [matRows, setMatRows] = useState<MaterialAccessItem[]>(materialsList);
  const [taskRows, setTaskRows] = useState<TaskAccessItem[]>(tasksList);
  const [contentTab, setContentTab] = useState<"materials" | "tasks">("materials");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const togglePendingPage = (key: StudentPageKey) => {
    if (key === "profile") return;
    setSavedNotice(null);
    setPendingPages((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleVisitorPage = (key: VisitorPageKey) => {
    setSavedNotice(null);
    setVisitorPages((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const savePagesPolicy = () => {
    setSavedNotice(null);
    startTransition(async () => {
      const res = await saveAccessPolicyAction({
        pendingPages,
        visitorPages,
        pendingCanSubmitTasks,
        pendingCanPurchase,
      });
      if (res.ok) {
        setSavedNotice(
          locale === "ar"
            ? "تم حفظ صلاحيات الصفحات للطلاب الجدد والزوار بنجاح."
            : "Page & feature access rules saved.",
        );
        router.refresh();
      }
    });
  };

  const toggleMaterialAccess = (id: number, target: "pending" | "visitors", nextVal: boolean) => {
    setMatRows((prev) =>
      prev.map((m) =>
        m.id === id
          ? target === "pending"
            ? { ...m, allowPendingStudents: nextVal }
            : { ...m, allowVisitors: nextVal }
          : m,
      ),
    );
    startTransition(async () => {
      await setMaterialGuestAccessAction(id, target, nextVal);
      router.refresh();
    });
  };

  const toggleTaskAccess = (id: number, target: "pending" | "visitors", nextVal: boolean) => {
    setTaskRows((prev) =>
      prev.map((t) =>
        t.id === id
          ? target === "pending"
            ? { ...t, allowPendingStudents: nextVal }
            : { ...t, allowVisitors: nextVal }
          : t,
      ),
    );
    startTransition(async () => {
      await setTaskGuestAccessAction(id, target, nextVal);
      router.refresh();
    });
  };

  return (
    <Card className="overflow-hidden border-2 border-navy-500/20 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-500/10 px-3 py-1 text-xs font-extrabold text-navy-600 dark:bg-sky-400/15 dark:text-sky-300">
            <Icon name="lock" className="h-3.5 w-3.5" />
            {locale === "ar" ? "إدارة صلاحيات الوصول" : "Student & Visitor Access Control"}
          </span>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
            {locale === "ar"
              ? "الصفحات والمحتوى المتاح للطلاب قيد المراجعة والطلاب الزوار"
              : "Pages & Content Open to Unapproved Students & Visitors"}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {locale === "ar"
              ? "تحكّم بدقة في الصفحات والمواد والمهام التي يمكن للطلاب المسجلين الجدد (قبل موافقة المعلم) والطلاب الزوار الوصول إليها."
              : "Choose exactly which pages, study materials, and tasks are accessible to newly signed-up students awaiting approval and to unauthenticated visitor students."}
          </p>
        </div>
      </div>

      {/* Page & Feature Matrix */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Pending Signed-up Students */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/25 text-amber-800 dark:text-amber-300">
              <Icon name="clock" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">
                {locale === "ar"
                  ? "الطلاب المسجلون بانتظار الموافقة"
                  : "Signed-Up Students (Pending Approval)"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === "ar"
                  ? "الطلاب الذين أنشأوا حساباً واختاروا صفهم ولم يُعتمدوا بعد"
                  : "Students who registered with their grade and are awaiting teacher review"}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            {locale === "ar" ? "الصفحات المسموح بتصفحها" : "Accessible Pages"}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {PENDING_PAGE_OPTIONS.map((opt) => {
              const checked = pendingPages.includes(opt.key);
              return (
                <label
                  key={opt.key}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    checked
                      ? "border-navy-500/40 bg-white text-slate-900 shadow-2xs dark:border-sky-500/40 dark:bg-slate-900 dark:text-white"
                      : "border-slate-200/80 bg-white/50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={opt.locked}
                    onChange={() => togglePendingPage(opt.key)}
                    className="h-4 w-4 accent-navy-600"
                  />
                  <span>{locale === "ar" ? opt.ar : opt.en}</span>
                </label>
              );
            })}
          </div>

          <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            {locale === "ar" ? "صلاحيات التفاعل قبل الموافقة" : "Actions Before Approval"}
          </p>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <input
                type="checkbox"
                checked={pendingCanSubmitTasks}
                onChange={(e) => {
                  setSavedNotice(null);
                  setPendingCanSubmitTasks(e.target.checked);
                }}
                className="h-4 w-4 accent-navy-600"
              />
              <span>
                {locale === "ar"
                  ? "السماح بتسليم المهام والاختبارات المفتوحة قبل موافقة المعلم"
                  : "Allow submitting open tasks & quizzes before approval"}
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <input
                type="checkbox"
                checked={pendingCanPurchase}
                onChange={(e) => {
                  setSavedNotice(null);
                  setPendingCanPurchase(e.target.checked);
                }}
                className="h-4 w-4 accent-navy-600"
              />
              <span>
                {locale === "ar"
                  ? "السماح بشراء المواد المدفوعة قبل موافقة المعلم"
                  : "Allow purchasing paid materials before approval"}
              </span>
            </label>
          </div>
        </div>

        {/* Unauthenticated Visitor Students */}
        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/40 p-4 dark:border-sky-800/50 dark:bg-sky-950/20">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/20 text-sky-800 dark:text-sky-300">
              <Icon name="sparkles" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">
                {locale === "ar"
                  ? "الطلاب الزوار (بدون تسجيل دخول)"
                  : "Visitor Students (Unauthenticated Guests)"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {locale === "ar"
                  ? "الزوار الذين يستكشفون المنصة قبل إنشاء حساب"
                  : "Prospective students browsing the platform without signing in"}
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            {locale === "ar" ? "الصفحات المفتوحة للزوار" : "Visitor-Accessible Pages"}
          </p>
          <div className="mt-2 space-y-2">
            {VISITOR_PAGE_OPTIONS.map((opt) => {
              const checked = visitorPages.includes(opt.key);
              return (
                <label
                  key={opt.key}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                    checked
                      ? "border-sky-500/50 bg-white text-slate-900 shadow-2xs dark:border-sky-500/40 dark:bg-slate-900 dark:text-white"
                      : "border-slate-200/80 bg-white/50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVisitorPage(opt.key)}
                    className="h-4 w-4 accent-navy-600"
                  />
                  <span>{locale === "ar" ? opt.ar : opt.en}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-sky-200/70 bg-white/80 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
            {locale === "ar"
              ? "ملاحظة: الزوار يمكنهم المعاينة فقط ولا يمكنهم تسليم المهام أو حفظ الدرجات أو إرسال رسائل حتى ينشئوا حساب طالب."
              : "Note: Visitors have read-only preview access and cannot submit tasks, record grades, or send messages until they create a student account."}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5 dark:border-slate-700">
        <div>
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Icon name="check" className="h-4 w-4" />
              {savedNotice}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={savePagesPolicy}
          className="inline-flex items-center gap-2 rounded-xl bg-navy-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-navy-500/20 transition hover:bg-navy-600 disabled:opacity-60"
        >
          <Icon name="check" className="h-4 w-4" />
          {locale === "ar" ? "حفظ إعدادات الصفحات" : "Save Page Access Rules"}
        </button>
      </div>

      {/* Per-Content Access Selector (Materials & Tasks) */}
      <div className="mt-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {locale === "ar"
                ? "تخصيص المحتوى المسموح به (لكل مادة أو مهمة)"
                : "Content-Level Visibility (Per Material & Task)"}
            </h3>
            <p className="text-xs text-slate-500">
              {locale === "ar"
                ? "اختر المواد الدراسية والمهام التي تظهر للطلاب بانتظار الموافقة أو للزوار (يُحفظ تلقائياً عند التبديل)."
                : "Choose individual study materials and tasks to open for pending students or visitors (saves immediately)."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setContentTab("materials")}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                contentTab === "materials"
                  ? "bg-navy-500 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {locale === "ar" ? `المواد (${matRows.length})` : `Materials (${matRows.length})`}
            </button>
            <button
              type="button"
              onClick={() => setContentTab("tasks")}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                contentTab === "tasks"
                  ? "bg-navy-500 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {locale === "ar" ? `المهام (${taskRows.length})` : `Tasks (${taskRows.length})`}
            </button>
          </div>
        </div>

        {contentTab === "materials" ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <th className="px-4 py-3 text-start font-bold">
                    {locale === "ar" ? "المادة التعليمية" : "Material"}
                  </th>
                  <th className="px-3 py-3 text-start font-bold">
                    {locale === "ar" ? "النوع" : "Pricing"}
                  </th>
                  <th className="px-3 py-3 text-center font-bold">
                    {locale === "ar" ? "الطلاب بانتظار الموافقة" : "Pending Students"}
                  </th>
                  <th className="px-3 py-3 text-center font-bold">
                    {locale === "ar" ? "الطلاب الزوار" : "Visitor Students"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {matRows.map((m) => {
                  const isPaid = m.priceCents > 0;
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {locale === "ar" ? m.titleAr || m.title : m.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {locale === "ar" ? m.subjectNameAr || m.subjectName : m.subjectName}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                        {isPaid
                          ? locale === "ar"
                            ? "مدفوعة"
                            : "Paid"
                          : locale === "ar"
                            ? "مجانية"
                            : "Free"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={m.allowPendingStudents}
                          disabled={isPaid}
                          title={
                            isPaid
                              ? locale === "ar"
                                ? "المواد المدفوعة تتطلب الشراء"
                                : "Paid materials require purchase"
                              : ""
                          }
                          onChange={(e) => toggleMaterialAccess(m.id, "pending", e.target.checked)}
                          className="h-4 w-4 accent-navy-600 disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={m.allowVisitors}
                          disabled={isPaid}
                          title={
                            isPaid
                              ? locale === "ar"
                                ? "المواد المدفوعة غير متاحة للزوار"
                                : "Paid materials cannot be opened by visitors"
                              : ""
                          }
                          onChange={(e) => toggleMaterialAccess(m.id, "visitors", e.target.checked)}
                          className="h-4 w-4 accent-navy-600 disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <th className="px-4 py-3 text-start font-bold">
                    {locale === "ar" ? "المهمة / الاختبار" : "Task / Quiz"}
                  </th>
                  <th className="px-3 py-3 text-start font-bold">
                    {locale === "ar" ? "الفئة المستهدفة" : "Target"}
                  </th>
                  <th className="px-3 py-3 text-center font-bold">
                    {locale === "ar" ? "الطلاب بانتظار الموافقة" : "Pending Students"}
                  </th>
                  <th className="px-3 py-3 text-center font-bold">
                    {locale === "ar" ? "الطلاب الزوار" : "Visitor Students"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {taskRows.map((tk) => (
                  <tr key={tk.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {locale === "ar" ? tk.titleAr || tk.title : tk.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {locale === "ar" ? tk.subjectNameAr || tk.subjectName : tk.subjectName}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {tk.targetLabel}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={tk.allowPendingStudents}
                        onChange={(e) => toggleTaskAccess(tk.id, "pending", e.target.checked)}
                        className="h-4 w-4 accent-navy-600"
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={tk.allowVisitors}
                        disabled={tk.isPersonal}
                        title={
                          tk.isPersonal
                            ? locale === "ar"
                              ? "المهام الفردية لطالب بعينه لا تُعرض للزوار"
                              : "Personal student tasks are not shown to visitors"
                            : ""
                        }
                        onChange={(e) => toggleTaskAccess(tk.id, "visitors", e.target.checked)}
                        className="h-4 w-4 accent-navy-600 disabled:opacity-40"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
