import Link from "next/link";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n-server";
import { BackArrow, Logo } from "@/components/ui";
import { QrScanner } from "@/components/auth/QrScanner";

export const metadata: Metadata = { title: "QR sign in" };

export default async function QrLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { t } = await getI18n();

  return (
    <div className="mx-auto max-w-md">
      <div className="flex flex-col items-center text-center">
        <Logo className="h-14 w-14 text-navy-500 dark:text-white" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{t("auth.qrTitle")}</h1>
        <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">{t("auth.qrScan")}</p>
      </div>

      <QrScanner />

      {error === "invalid" && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {t("auth.qrInvalid")}
        </p>
      )}

      <form action="/api/auth/qr" method="get" className="mt-6">
        <p className="mb-2 text-center text-sm font-medium text-slate-600 dark:text-slate-300">{t("auth.qrManual")}</p>
        <div className="flex gap-2" dir="ltr">
          <input
            name="token"
            required
            autoComplete="off"
            placeholder={t("profile.qrCode")}
            className="min-w-0 flex-1 rounded-2xl border border-slate-400 px-4 py-3 font-mono text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
          />
          <button type="submit" className="rounded-2xl bg-blue-500 px-5 py-3 font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600">
            {t("auth.qrSubmit")}
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          <BackArrow /> {t("auth.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
