import Link from "next/link";
import { getI18n } from "@/lib/i18n-server";
import { Logo } from "@/components/ui";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
        <Logo className="mx-auto h-14 w-14 text-navy-500 dark:text-white" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{t("common.notFound")}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{t("common.notFoundBody")}</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-2xl bg-blue-500 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600">
          {t("common.goDashboard")}
        </Link>
      </div>
    </main>
  );
}
