import Link from "next/link";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n-server";
import { Logo } from "@/components/ui";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; identifier?: string }> }) {
  const { next, error, identifier } = await searchParams;
  const { t, locale } = await getI18n();
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
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
      <p className="mt-3 text-center text-sm"><Link href="/" className="text-slate-500 hover:text-navy-500 hover:underline dark:text-slate-400">← {locale === "ar" ? "العودة للرئيسية" : "Back to homepage"}</Link></p>
    </div>
  );
}
