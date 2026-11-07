import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { BackArrow, Card, Icon } from "./ui";

export function PageAccessNotice({
  locale,
  backHref = "/dashboard",
  mode = "pending",
}: {
  locale: Locale;
  backHref?: string;
  mode?: "pending" | "visitor";
}) {
  const isVisitor = mode === "visitor";
  return (
    <Card className="mx-auto mt-6 max-w-xl p-8 text-center">
      <span
        className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${
          isVisitor
            ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
            : "bg-amber-400/20 text-amber-800 dark:text-amber-300"
        }`}
      >
        <Icon name={isVisitor ? "sparkles" : "clock"} className="h-8 w-8" />
      </span>
      <h2 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
        {isVisitor
          ? locale === "ar"
            ? "سجّل الدخول للوصول إلى هذا المحتوى"
            : "Sign up or sign in to unlock this content"
          : locale === "ar"
            ? "متاح فور موافقة المعلم"
            : "Unlocks Once Your Teacher Approves"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {isVisitor
          ? locale === "ar"
            ? "هذا القسم متاح للطلاب المسجلين فقط. أنشئ حساب طالب مجاناً للوصول إلى مهامك ودرجاتك ودروسك الكاملة."
            : "This content is reserved for enrolled students. Create your student account and choose your grade to get full access."
          : locale === "ar"
            ? "قام معلمك بتخصيص هذا القسم للطلاب المعتمدين. ستُفتح لك جميع المزايا تلقائياً بمجرد موافقة المعلم على تسجيلك."
            : "Your teacher configured this section for approved students. Full access will unlock automatically as soon as your registration is approved."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-navy-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <BackArrow />
          {locale === "ar" ? "العودة" : "Go Back"}
        </Link>
        {isVisitor && (
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-navy-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-navy-600"
          >
            <Icon name="sparkles" className="h-4 w-4" />
            {locale === "ar" ? "إنشاء حساب طالب" : "Create Student Account"}
          </Link>
        )}
      </div>
    </Card>
  );
}
