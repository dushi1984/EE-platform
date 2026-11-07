"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useActionState } from "react";
import { useI18n } from "@/lib/i18n-client";
import { fmtMoney, tr } from "@/lib/i18n";
import { checkoutAction, type CheckoutState } from "@/lib/actions";
import { formatCardNumber } from "@/lib/gateway";
import { ForwardArrow, Icon, Logo, type IconName } from "@/components/ui";
import { navigateWithSession } from "@/components/shell/Shell";

export type PayMethod = "instapay" | "card" | "wallet";

export type BuyableMaterial = {
  id: number;
  slug: string;
  title: string;
  titleAr: string;
  thumbnailUrl: string | null;
  priceCents: number;
  purchased: boolean;
};

type PaidResult = NonNullable<CheckoutState> & { ok: true; stage: "paid" };

/* ---------- Trigger buttons ---------- */

export function BuyButton({ material }: { material: BuyableMaterial }) {
  const { t } = useI18n();
  if (material.purchased) {
    return (
      <Link href={`/materials/${material.slug}`} className="inline-flex items-center gap-2 rounded-lg bg-navy-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-navy-600">
        <Icon name="play" className="h-4 w-4" />
        {t("materials.open")}
      </Link>
    );
  }
  return (
    <PurchaseButton
      materialId={material.id}
      title={material.title}
      titleAr={material.titleAr}
      thumbnailUrl={material.thumbnailUrl}
      priceCents={material.priceCents}
    />
  );
}

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-white";
const lbl = "mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300";

/* ---------- Portal overlay: renders above every card, table and dropdown ---------- */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;
  // zIndex 200 keeps checkout above the sidebar (z-50), dropdowns (z-30) and header
  return createPortal(
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-slate-900/65 p-4 backdrop-blur-sm sm:items-center"
      style={{ zIndex: 200 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ---------- Main checkout ---------- */

export function PurchaseButton({
  materialId,
  title,
  titleAr,
  thumbnailUrl,
  priceCents,
  size = "sm",
}: {
  materialId: number;
  title: string;
  titleAr: string;
  thumbnailUrl: string | null;
  priceCents: number;
  size?: "sm" | "lg";
}) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PayMethod>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [done, setDone] = useState<PaidResult | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isFree = priceCents === 0;
  const name = tr(locale, title, titleAr);
  const total = fmtMoney(locale, priceCents);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDone(null);
          setOpen(true);
        }}
        className={
          size === "lg"
            ? "inline-flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600 active:scale-[0.98]"
            : "inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow shadow-blue-500/30 transition hover:bg-blue-600 active:scale-95"
        }
      >
        <Icon name="lock" className="h-4 w-4" />
        {isFree ? locale === "ar" ? "احصل عليه مجاناً" : "Get for free" : locale === "ar" ? "شراء" : "Buy"}
      </button>

      {open && (
        <Overlay onClose={() => setOpen(false)}>
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={locale === "ar" ? "تأكيد الشراء" : "Confirm Purchase"}
            className="my-auto w-full max-w-md animate-fade-up rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Logo className="h-8 w-8 text-navy-500 dark:text-white" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {locale === "ar" ? "تأكيد الشراء" : "Confirm Purchase"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            {/* Item summary */}
            <div className="flex items-center gap-3 rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
                {thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnailUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-navy-400 to-navy-700 text-xl font-black text-white/80">
                    {name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900 dark:text-white">{name}</p>
                <p className="text-xs text-slate-500">
                  {isFree ? (locale === "ar" ? "وصول كامل مجاني" : "Full free access") : locale === "ar" ? "وصول كامل مدى الحياة" : "Lifetime access"}
                </p>
              </div>
              <p className="shrink-0 text-lg font-extrabold text-blue-600">{total}</p>
            </div>

            {done ? (
              <SuccessPanel result={done} name={name} onClose={() => setOpen(false)} />
            ) : isFree ? (
              <FreeCheckout materialId={materialId} />
            ) : (
              <PaidCheckout
                materialId={materialId}
                method={method}
                setMethod={setMethod}
                cardNumber={cardNumber}
                setCardNumber={setCardNumber}
                total={total}
              />
            )}
          </div>
        </Overlay>
      )}
    </>
  );
}

/* ---------- Free enrollment ---------- */

function FreeCheckout({ materialId }: { materialId: number }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, null);
  const navigated = useRef(false);

  useEffect(() => {
    if (state?.ok && state.redirectTo && !navigated.current) {
      navigated.current = true;
      setTimeout(() => navigateWithSession(state.redirectTo!), 900);
    }
  }, [state]);

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="materialId" value={materialId} />
      <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-200">
        {locale === "ar" ? "هذه المادة مجانية بالكامل — لن يتم خصم أي مبلغ." : "This material is completely free — no payment required."}
      </p>
      {state?.stage === "failed" && (
        <p role="alert" className="mt-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {state.error ?? t("common.errorGeneric")}
        </p>
      )}
      <button type="submit" disabled={pending || navigated.current} className="mt-3 w-full rounded-2xl bg-blue-500 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600 disabled:opacity-60">
        {pending ? locale === "ar" ? "جارٍ التسجيل…" : "Enrolling…" : locale === "ar" ? "تسجيل مجاني" : "Enrol for free"}
      </button>
      <p className="mt-2 inline-flex w-full items-center justify-center gap-1 text-[11px] text-slate-400">
        <Icon name="shield" className="h-3.5 w-3.5" /> {t("purchase.secure")}
      </p>
    </form>
  );
}

/* ---------- Paid checkout ---------- */

function PaidCheckout({
  materialId,
  method,
  setMethod,
  cardNumber,
  setCardNumber,
  total,
}: {
  materialId: number;
  method: PayMethod;
  setMethod: (m: PayMethod) => void;
  cardNumber: string;
  setCardNumber: (v: string) => void;
  total: string;
}) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (state && !state.ok) setShowError(true);
    if (state?.ok) setShowError(false);
  }, [state]);

  const methods: { key: PayMethod; label: string; icon: IconName; hint: string }[] = [
    { key: "card", label: t("purchase.card"), icon: "card", hint: "Visa · Mastercard · Amex" },
    { key: "instapay", label: t("purchase.instapay"), icon: "bank", hint: locale === "ar" ? "تحويل بنكي فوري" : "Instant bank transfer" },
    { key: "wallet", label: t("purchase.wallet"), icon: "wallet", hint: locale === "ar" ? "محفظة الهاتف" : "Mobile wallet" },
  ];

  const digits = cardNumber.replace(/\s/g, "");
  const brand = /^4/.test(digits) ? "Visa" : /^5[1-5]/.test(digits) ? "Mastercard" : /^3[47]/.test(digits) ? "Amex" : null;

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="materialId" value={materialId} />
      <input type="hidden" name="method" value={method} />

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          {locale === "ar" ? "١ · طريقة الدفع" : "1 · Payment method"}
        </p>
        <div className="space-y-2" role="radiogroup" aria-label={t("purchase.method")}>
          {methods.map((m) => (
            <label
              key={m.key}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                method === m.key
                  ? "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500 dark:bg-blue-500/10"
                  : "border-slate-300 hover:border-slate-400 dark:border-slate-600"
              }`}
            >
              <input type="radio" name="methodPick" checked={method === m.key} onChange={() => setMethod(m.key)} className="h-4 w-4 accent-blue-600" />
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-navy-600 dark:bg-slate-800 dark:text-sky-300">
                <Icon name={m.icon} className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900 dark:text-white">{m.label}</span>
                <span className="block text-[11px] text-slate-500">{m.hint}</span>
              </span>
              {method === m.key && <Icon name="check" className="h-4 w-4 shrink-0 text-blue-600" />}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          {locale === "ar" ? "٢ · بيانات الدفع" : "2 · Payment details"}
        </p>

        {method === "card" ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
            <div>
              <label className={lbl} htmlFor="cardName">{locale === "ar" ? "الاسم على البطاقة" : "Name on card"}</label>
              <input id="cardName" name="cardName" required autoComplete="cc-name" placeholder="FATMA S MAHMOUD" className={input} />
            </div>
            <div>
              <label className={lbl} htmlFor="cardNumber">{locale === "ar" ? "رقم البطاقة" : "Card number"}</label>
              <div className="relative">
                <input
                  id="cardNumber"
                  name="cardNumber"
                  required
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  dir="ltr"
                  className={`${input} pe-20 font-mono tracking-wider`}
                />
                {brand && <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">{brand}</span>}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {locale === "ar" ? "اختبار: 4242… ينجح · 4000 0000 0000 0002 يُرفض" : "Test: 4242… succeeds · 4000 0000 0000 0002 declines"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={lbl} htmlFor="expMonth">{locale === "ar" ? "الشهر" : "Month"}</label>
                <input id="expMonth" name="expMonth" required inputMode="numeric" placeholder="12" maxLength={2} className={input} dir="ltr" />
              </div>
              <div>
                <label className={lbl} htmlFor="expYear">{locale === "ar" ? "السنة" : "Year"}</label>
                <input id="expYear" name="expYear" required inputMode="numeric" placeholder="2029" maxLength={4} className={input} dir="ltr" />
              </div>
              <div>
                <label className={lbl} htmlFor="cardCvc">CVC</label>
                <input id="cardCvc" name="cardCvc" required inputMode="numeric" placeholder="123" maxLength={4} autoComplete="cc-csc" className={input} dir="ltr" />
              </div>
            </div>
          </div>
        ) : method === "instapay" ? (
          <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
            <label className={lbl} htmlFor="instapayHandle">{locale === "ar" ? "عنوان Instapay / IPN" : "Instapay address / IPN"}</label>
            <input id="instapayHandle" name="instapayHandle" required placeholder="fatma@instapay" className={input} dir="ltr" />
            <p className="mt-1.5 text-[11px] text-slate-400">
              {locale === "ar" ? "ستؤكد التحويل من تطبيق البنك." : "You will confirm the transfer in your banking app."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
            <label className={lbl} htmlFor="walletNumber">{locale === "ar" ? "رقم المحفظة" : "Mobile wallet number"}</label>
            <input id="walletNumber" name="walletNumber" required inputMode="tel" placeholder="01012345678" className={input} dir="ltr" />
            <p className="mt-1.5 text-[11px] text-slate-400">
              {locale === "ar" ? "فودافون كاش · اتصالات كاش · أورنج موني" : "Vodafone Cash · Etisalat Cash · Orange Money"}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{locale === "ar" ? "الإجمالي المستحق" : "Total due"}</span>
        <span className="text-xl font-extrabold text-slate-900 dark:text-white">{total}</span>
      </div>

      {showError && state?.stage === "failed" && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error ?? (state.errorKey ? t(state.errorKey) : "")}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        onClick={() => setShowError(false)}
        className="w-full rounded-2xl bg-blue-500 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-600 disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {locale === "ar" ? "جارٍ تأكيد الدفع…" : "Authorising payment…"}
          </span>
        ) : (
          `${t("purchase.confirm")} · ${total}`
        )}
      </button>

      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1 text-[11px] leading-snug text-slate-400">
          <Icon name="shield" className="h-3.5 w-3.5" /> {t("purchase.secure")}
        </p>
      </div>

      <SuccessBridge state={state} />
    </form>
  );
}

function SuccessBridge({ state }: { state: CheckoutState }) {
  useEffect(() => {
    if (state?.ok && state.stage === "paid" && state.redirectTo) {
      const timer = setTimeout(() => navigateWithSession(state.redirectTo!), 2600);
      return () => clearTimeout(timer);
    }
  }, [state]);
  return null;
}

/* ---------- Success receipt ---------- */

function SuccessPanel({ result, name, onClose }: { result: PaidResult; name: string; onClose: () => void }) {
  const { locale } = useI18n();
  return (
    <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-center dark:border-green-900 dark:bg-green-500/10">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white">
        <Icon name="check" className="h-8 w-8" />
      </span>
      <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
        {locale === "ar" ? "تم الدفع بنجاح" : "Payment successful"}
      </h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{name}</p>
      {result.amountCents != null && result.amountCents > 0 && (
        <p className="mt-1 text-2xl font-extrabold text-green-700 dark:text-green-300">{fmtMoney(locale, result.amountCents)}</p>
      )}
      {result.reference && (
        <p className="mt-2 text-xs text-slate-500">
          {locale === "ar" ? "رقم المرجع" : "Reference"}:{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-700 dark:bg-slate-900 dark:text-slate-200" dir="ltr">
            {result.reference}
          </code>
        </p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        {locale === "ar" ? "جارٍ نقلك إلى المادة…" : "Taking you to the material…"}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {result.receiptUrl && (
          <Link
            href={result.receiptUrl}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-600 shadow-sm hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-300"
          >
            <Icon name="receipt" className="h-3.5 w-3.5" />
            {locale === "ar" ? "الإيصال" : "Receipt"}
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            onClose();
            if (result.redirectTo) navigateWithSession(result.redirectTo);
          }}
          className="rounded-lg bg-navy-500 px-4 py-2 text-xs font-bold text-white hover:bg-navy-600"
        >
          {locale === "ar" ? "ابدأ التعلم" : "Start learning"} <ForwardArrow />
        </button>
      </div>
    </div>
  );
}
