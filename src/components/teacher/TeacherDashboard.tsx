import Link from "next/link";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, fmtMoney } from "@/lib/i18n";
import { tt } from "@/lib/i18n-teacher";
import { getTeacherDashboard } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, Card, Icon, ProgressBar } from "@/components/ui";
import { StatusPill } from "./StatusPill";

export async function TeacherDashboard() {
  await requireTeacher();
  const { t, locale } = await getI18n();
  const c = tt(locale);
  const data = await getTeacherDashboard();

  const stats = [
    { label: c.totalStudents, value: String(data.totalStudents), icon: "students" as const },
    { label: c.activeTasks, value: String(data.activeTasks), icon: "tasks" as const },
    { label: c.pendingPayments, value: fmtMoney(locale, data.pendingCents), icon: "payments" as const },
  ];

  const actions = [
    { href: "/tasks/new", label: c.assignTask, icon: "assign" as const },
    { href: "/materials/new", label: c.addMaterial, icon: "plus" as const },
    { href: "/students", label: c.addStudent, icon: "students" as const },
    { href: "/payments", label: c.viewPayments, icon: "payments" as const },
  ];

  return (
    <>
      <TopBar title={t("dashboard.title")} />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="flex items-center gap-4 p-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-500/10 text-navy-500 dark:bg-white/10 dark:text-sky-300">
              <Icon name={s.icon} className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="truncate text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400">
                <th className="px-5 py-4 text-start font-semibold">{c.studentName}</th>
                <th className="px-4 py-4 text-start font-semibold">{c.lastLogin}</th>
                <th className="px-4 py-4 text-start font-semibold">{c.taskProgress}</th>
                <th className="px-4 py-4 text-start font-semibold">{c.status}</th>
                <th className="px-4 py-4 text-end font-semibold">{c.action}</th>
              </tr>
            </thead>
            <tbody>
              {data.students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                    {c.noStudents}
                  </td>
                </tr>
              )}
              {data.students.slice(0, 6).map((s) => (
                <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-5 py-3">
                    <Link href={`/students?s=${s.id}`} className="flex items-center gap-3 font-bold text-slate-800 hover:text-navy-500 dark:text-slate-100">
                      <Avatar name={s.fullName} src={s.avatarUrl} size={36} />
                      <span className="max-w-[10rem] leading-tight">{s.fullName.split(" ").slice(0, 2).join(" ")}</span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{s.lastLoginAt ? fmtDate(locale, s.lastLoginAt) : c.never}</td>
                  <td className="px-4 py-3">
                    <ProgressBar percent={s.progressPct} className="w-32 sm:w-40" />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} locale={locale} />
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link href={`/students?s=${s.id}`} aria-label={c.view} className="inline-grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
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
