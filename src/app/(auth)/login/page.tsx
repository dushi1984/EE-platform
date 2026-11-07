import Link from "next/link";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n-server";
import { firstAllowedPath, getAccessPolicy } from "@/lib/access";
import { BackArrow, Icon, Logo } from "@/components/ui";
import { LoginForm } from "@/components/auth/AuthForms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; identifier?: string }> }) {
  const [{ next, error, identifier }, { t, locale }, policy] = await Promise.all([
    searchParams,
    getI18n(),
    getAccessPolicy(),
  ]);
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const hasVisitorPages = policy.visitorPages.length > 0;
  const visitorHref = firstAllowedPath(null, policy);

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <Logo className="h-14 w-14 text-navy-500 dark:text-white" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{t("auth.login")}</h1>
        <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">{t("auth.loginSubtitle")}</p>
      </div>
      <LoginForm next={destination} error={error} identifier={identifier} />

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-semibold text-blue-600 hover:underline">{t("auth.register")}</Link>
      </p>

      {hasVisitorPages && (
        <div className="mt-4">
          <Link
            href={visitorHref}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-2.5 text-sm font-bold text-navy-600 transition hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-900/40"
          >
            <Icon name="sparkles" className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t("auth.exploreVisitor")}
          </Link>
        </div>
      )}

      <p className="mt-3 text-center text-sm"><Link href="/" className="text-slate-500 hover:text-navy-500 hover:underline dark:text-slate-400"><BackArrow /> {locale === "ar" ? "العودة للرئيسية" : "Back to homepage"}</Link></p>
    </div>
  );
}
