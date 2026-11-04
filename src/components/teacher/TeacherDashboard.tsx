import Link from "next/link";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, fmtMoney } from "@/lib/i18n";
import { tt } from "@/lib/i18n-teacher";
import { getTeacherDashboard } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, Card, Icon, ProgressBar } from "@/components/ui";
import { AccountStatusPill, StatusPill } from "./StatusPill";
import { StudentModerationControls } from "./StudentModerationControls";

export async function TeacherDashboard() {
  await requireTeacher();
  const { t, locale } = await getI18n();
  const c = tt(locale);
  const data = await getTeacherDashboard();

  const stats = [
    { label: c.totalStudents, value: String(data.totalStudents), icon: "students" as const },
    {
      label: locale === "ar" ? "طلبات تسجيل بانتظار الموافقة" : "Pending Approvals",
      value: String(data.pendingApprovals),
      icon: "clock" as const,
      highlight: data.pendingApprovals > 0,
    },
    { label: c.activeTasks, value: String(data.activeTasks), icon: "tasks" as const },
    { label: c.pendingPayments, value: fmtMoney(locale, data.pendingCents), icon: "payments" as const },
  ];

  const actions = [
    { href: "/tasks/new", label: c.assignTask, icon: "assign" as const },
    { href: "/materials/new", label: c.addMaterial, icon: "plus" as const },
    { href: "/students", label: c.addStudent, icon: "students" as const },
    {
      href: "/settings",
      label: locale === "ar" ? "صلاحيات الطلاب والزوار" : "Access Control",
      icon: "settings" as const,
    },
  ];

  return (
    <>
      <TopBar title={t("dashboard.title")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className={`flex items-center gap-4 p-5 ${
              s.highlight ? "ring-2 ring-amber-400/70 dark:ring-amber-400/50" : ""
            }`}
          >
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                s.highlight
                  ? "bg-amber-400/25 text-amber-800 dark:text-amber-300"
                  : "bg-navy-500/10 text-navy-500 dark:bg-white/10 dark:text-sky-300"
              }`}
            >
              <Icon name={s.icon} className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="truncate text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {data.pendingStudents.length > 0 && (
        <Card className="overflow-hidden border-2 border-amber-300/70 dark:border-amber-700/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/70 bg-amber-50/70 px-5 py-4 dark:border-amber-800/50 dark:bg-amber-950/30">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-navy-900">
                <Icon name="students" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {locale === "ar"
                    ? `طلبات تسجيل طلاب جدد بانتظار موافقتك (${data.pendingStudents.length})`
                    : `New Student Sign-Ups Awaiting Your Review (${data.pendingStudents.length})`}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {locale === "ar"
                    ? "راجع الصف الدراسي المختار واعتمد الحساب أو أوقفه أو احظره أو أرسل رسالة مباشرة."
                    : "Review each student's chosen grade and approve, suspend, block, or send them a message."}
                </p>
              </div>
            </div>
            <Link
              href="/students?filter=pending"
              className="rounded-xl bg-navy-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-600"
            >
              {locale === "ar" ? "عرض الكل" : "Review All"}
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.pendingStudents.slice(0, 6).map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={s.fullName} src={s.avatarUrl} size={42} />
                  <div>
                    <Link
                      href={`/students/${s.id}`}
                      className="font-extrabold text-slate-900 hover:text-navy-500 hover:underline dark:text-white"
                    >
                      {s.fullName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      <span className="font-bold text-navy-600 dark:text-sky-300">{s.grade}</span>
                      {" · "}
                      <span dir="ltr">{s.studentCode}</span>
                      {s.email ? ` · ${s.email}` : s.phone ? ` · ${s.phone}` : ""}
                      {" · "}
                      {fmtDate(locale, s.createdAt)}
                    </p>
                  </div>
                </div>
                <StudentModerationControls
                  studentId={s.id}
                  studentName={s.fullName}
                  studentGrade={s.grade}
                  currentStatus={s.accountStatus}
                  currentClassId={s.classId}
                  currentNote={s.statusNote}
                  locale={locale}
                  compact
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="px-5 py-4 text-start font-semibold">{c.studentName}</th>
                <th className="px-4 py-4 text-start font-semibold">
                  {locale === "ar" ? "الاعتماد" : "Account"}
                </th>
                <th className="px-4 py-4 text-start font-semibold">{c.lastLogin}</th>
                <th className="px-4 py-4 text-start font-semibold">{c.taskProgress}</th>
                <th className="px-4 py-4 text-start font-semibold">{c.status}</th>
                <th className="px-4 py-4 text-end font-semibold">{c.action}</th>
              </tr>
            </thead>
            <tbody>
              {data.students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    {c.noStudents}
                  </td>
                </tr>
              )}
              {data.students.slice(0, 8).map((s) => (
                <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-5 py-3">
                    <Link
                      href={`/students/${s.id}`}
                      className="flex items-center gap-3 font-bold text-slate-800 hover:text-navy-500 dark:text-slate-100"
                    >
                      <Avatar name={s.fullName} src={s.avatarUrl} size={36} />
                      <div>
                        <span className="block max-w-[11rem] leading-tight">
                          {s.fullName.split(" ").slice(0, 2).join(" ")}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">{s.grade}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <AccountStatusPill status={s.accountStatus} locale={locale} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {s.lastLoginAt ? fmtDate(locale, s.lastLoginAt) : c.never}
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar percent={s.progressPct} className="w-32 sm:w-40" />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} locale={locale} />
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link
                      href={`/students/${s.id}`}
                      aria-label={c.view}
                      className="inline-grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Icon name="dots" className="h-5 w-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{c.quickActions}</h2>
        <p className="text-sm text-slate-500">{c.quickActionsHint}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-bold text-navy-600 transition hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:text-sky-300 dark:hover:bg-slate-800"
            >
              <Icon name={a.icon} className="h-6 w-6 text-blue-500" />
              {a.label}
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
