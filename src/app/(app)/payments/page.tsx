import Link from "next/link";
import type { Metadata } from "next";
import { requireTeacher } from "@/lib/roles";
import { getI18n } from "@/lib/i18n-server";
import { fmtDate, fmtMoney, tr } from "@/lib/i18n";
import { fill, methodLabel, tt } from "@/lib/i18n-teacher";
import { PAYMENTS_PAGE_SIZE, getPayments, type PaymentRange } from "@/lib/queries-teacher";
import { TopBar } from "@/components/shell/TopBar";
import { Avatar, Badge, Card } from "@/components/ui";
import { RangeSelect } from "@/components/teacher/RangeSelect";
import { DownloadButton } from "@/components/TaskSubmissionForm";
import { ApprovePaymentButton } from "@/components/teacher/DeleteMaterialButton";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ range?: string; page?: string }> }) {
  await requireTeacher();
  const sp = await searchParams;
  const { locale } = await getI18n();
  const c = tt(locale);
  const range: PaymentRange = sp.range === "30" || sp.range === "all" ? sp.range : "month";
  const { summary, rows, page, totalPages } = await getPayments(range, Number(sp.page) || 1);

  const from = summary.total === 0 ? 0 : (page - 1) * PAYMENTS_PAGE_SIZE + 1;
  const to = Math.min(summary.total, page * PAYMENTS_PAGE_SIZE);
  const href = (p: number) => `/payments?range=${range}&page=${p}`;
  const pages: (number | "…")[] = totalPages <= 5 ? Array.from({ length: totalPages }, (_, i) => i + 1) : [1, 2, 3, "…", totalPages];

  const tone = (s: string) => (s === "paid" ? "done" : s === "failed" ? "overdue" : "in_progress");
  const label = (s: string) => (s === "paid" ? c.paid : s === "failed" ? c.failed : c.pending);

  return (
    <>
      <TopBar title={c.paymentsTitle} />

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{c.transactionSummary}</h2>
          <RangeSelect
            value={range}
            options={[
              { value: "month", label: c.thisMonth },
              { value: "30", label: c.last30 },
              { value: "all", label: c.allTime },
            ]}
          />
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {[
            [c.totalRevenue, fmtMoney(locale, summary.revenue)],
            [c.collected, String(summary.collected)],
            [c.pendingPayments, fmtMoney(locale, summary.pending)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-slate-200 px-5 py-4 dark:bg-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">{k}</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <th className="px-5 py-4 text-start font-semibold">{c.date}</th>
                <th className="px-3 py-4 text-start font-semibold">{c.studentName}</th>
                <th className="px-3 py-4 text-start font-semibold">{c.item}</th>
                <th className="px-3 py-4 text-start font-semibold">{c.amount}</th>
                <th className="px-3 py-4 text-start font-semibold">{c.method}</th>
                <th className="px-3 py-4 text-start font-semibold">{c.status}</th>
                <th className="px-3 py-4 text-end font-semibold">{c.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    {c.noPayments}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="whitespace-nowrap px-5 py-3 font-semibold text-slate-500">{fmtDate(locale, r.date)}</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-100">
                      <Avatar name={r.studentName} src={r.avatarUrl} size={34} />
                      <span className="max-w-[8rem] leading-tight">{r.studentName.split(" ").slice(0, 2).join(" ")}</span>
                    </span>
                  </td>
                  <td className="max-w-[12rem] truncate px-3 py-3 text-slate-500">{tr(locale, r.itemTitle, r.itemTitleAr)}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">{fmtMoney(locale, r.cents)}</td>
                  <td className="px-3 py-3 text-slate-500">{methodLabel(locale, r.method)}</td>
                  <td className="px-3 py-3">
                    <Badge tone={tone(r.status)}>{label(r.status)}</Badge>
                  </td>
                  <td className="px-3 py-3 text-end">
                    <div className="inline-flex items-center justify-end gap-2">
                      {r.status !== "paid" && <ApprovePaymentButton purchaseId={r.id} />}
                      <DownloadButton url={`/api/payments/${r.id}/receipt`} label={c.receipt} compact />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <p className="text-sm text-slate-500">{fill(c.showing, { from, to, total: summary.total })}</p>
          <nav className="flex overflow-hidden rounded-lg border border-slate-300 text-sm font-semibold dark:border-slate-600" dir="ltr" aria-label="pagination">
            {page > 1 ? (
              <Link href={href(page - 1)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">‹</Link>
            ) : (
              <span className="px-3 py-2 text-slate-300">‹</span>
            )}
            {pages.map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="border-s border-slate-300 px-3 py-2 text-slate-400 dark:border-slate-600">…</span>
              ) : (
                <Link
                  key={p}
                  href={href(p)}
                  className={`border-s border-slate-300 px-3.5 py-2 dark:border-slate-600 ${p === page ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  {p}
                </Link>
              ),
            )}
            {page < totalPages ? (
              <Link href={href(page + 1)} className="border-s border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">›</Link>
            ) : (
              <span className="border-s border-slate-300 px-3 py-2 text-slate-300 dark:border-slate-600">›</span>
            )}
          </nav>
        </div>
      </Card>
    </>
  );
}
