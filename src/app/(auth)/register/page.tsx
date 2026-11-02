import Link from "next/link";
import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n-server";
import type { TKey } from "@/lib/i18n";
import { Logo } from "@/components/ui";
import { RegisterForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Sign up" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { t } = await getI18n();
  const errorKey = error?.startsWith("errors.") ? (error as TKey) : undefined;
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <Logo className="h-14 w-14 text-navy-500 dark:text-white" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{t("auth.register")}</h1>
        <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">{t("auth.registerSubtitle")}</p>
      </div>
      <RegisterForm error={errorKey} />
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          {t("auth.login")}
        </Link>
      </p>
    </div>
  );
}
