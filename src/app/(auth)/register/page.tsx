import Link from "next/link";
import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { academicLevels } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { firstAllowedPath, getAccessPolicy } from "@/lib/access";
import { getI18n } from "@/lib/i18n-server";
import type { TKey } from "@/lib/i18n";
import { gradeLabel } from "@/lib/i18n-teacher";
import { BackArrow, Icon, Logo } from "@/components/ui";
import { RegisterForm } from "@/components/auth/AuthForms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign up" };

const DEFAULT_LEVELS = [
  { name: "Grade 10", nameAr: "الصف الأول الثانوي" },
  { name: "Grade 11", nameAr: "الصف الثاني الثانوي" },
  { name: "Grade 12", nameAr: "الصف الثالث الثانوي" },
];

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { t, locale } = await getI18n();
  const errorKey = error?.startsWith("errors.") ? (error as TKey) : undefined;

  let levels = DEFAULT_LEVELS;
  let visitorHref: string | null = null;
  try {
    await ensureSeeded();
    const [dbLevels, policy] = await Promise.all([
      db.select().from(academicLevels).orderBy(asc(academicLevels.sortOrder), asc(academicLevels.id)),
      getAccessPolicy(),
    ]);
    if (dbLevels.length > 0) {
      levels = dbLevels.map((l) => ({
        name: l.name,
        nameAr: l.nameAr || gradeLabel("ar", l.name),
      }));
    }
    if (policy.visitorPages.length > 0) {
      visitorHref = firstAllowedPath(null, policy);
    }
  } catch {
    // fallback to DEFAULT_LEVELS
  }

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <Logo className="h-14 w-14 text-navy-500 dark:text-white" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{t("auth.register")}</h1>
        <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">{t("auth.registerSubtitle")}</p>
      </div>
      <RegisterForm error={errorKey} levels={levels} />
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          {t("auth.login")}
        </Link>
      </p>
      {visitorHref && (
        <div className="mt-3 flex justify-center">
          <Link
            href={visitorHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-navy-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-sky-300 dark:hover:bg-slate-700"
          >
            <Icon name="eye" className="h-4 w-4" />
            {t("auth.exploreVisitor")}
          </Link>
        </div>
      )}
      <p className="mt-3 text-center text-sm">
        <Link href="/" className="text-slate-500 hover:text-navy-500 hover:underline dark:text-slate-400">
          <BackArrow /> {locale === "ar" ? "العودة للرئيسية" : "Back to homepage"}
        </Link>
      </p>
    </div>
  );
}
