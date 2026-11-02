/**
 * Payment gateway simulation.
 *
 * Mirrors a real PSP integration: validate → authorise → capture.
 * Deterministic test card numbers reproduce common issuer responses so the
 * whole buyer journey (success, decline, insufficient funds, expiry) can be
 * exercised without a live merchant account.
 */

export type Method = "card" | "wallet" | "instapay";

export type AuthInput = {
  method: Method;
  cardNumber?: string;
  walletNumber?: string;
  instapayHandle?: string;
};

export type AuthResult =
  | { approved: true; code: "authorized"; message: string; gatewayRef: string }
  | { approved: false; code: string; message: string };

export function luhnValid(digits: string) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function cardBrand(digits: string) {
  if (/^4/.test(digits)) return "Visa";
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6/.test(digits)) return "Discover";
  return "Card";
}

export function formatCardNumber(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 19);
  return d.replace(/(.{4})/g, "$1 ").trim();
}

/** Issuer response codes used by the simulated gateway. */
const DECLINES: Record<string, { code: string; message: string; messageAr: string }> = {
  "4000000000000002": { code: "card_declined", message: "Your card was declined by the issuer.", messageAr: "تم رفض بطاقتك من جهة الإصدار." },
  "4000000000009995": { code: "insufficient_funds", message: "Insufficient funds on this card.", messageAr: "الرصيد غير كافٍ في هذه البطاقة." },
  "4000000000000069": { code: "expired_card", message: "This card has expired.", messageAr: "انتهت صلاحية هذه البطاقة." },
  "4000000000000119": { code: "processing_error", message: "The gateway could not process this card. Try again.", messageAr: "لم يتمكن البوابة من معالجة البطاقة. حاول مرة أخرى." },
  "4000000000000127": { code: "invalid_cvc", message: "The security code is incorrect.", messageAr: "رمز التحقق غير صحيح." },
};

export function isExpired(expMonth: number, expYear: number, now = new Date()) {
  const thisYear = now.getFullYear();
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) return true;
  if (!Number.isInteger(expYear) || expYear < thisYear || expYear > thisYear + 20) return true;
  if (expYear === thisYear && expMonth < now.getMonth() + 1) return true;
  return false;
}

function randRef(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export function gatewayAuthorize(input: AuthInput, locale: "en" | "ar" = "en"): AuthResult {
  if (input.method === "card") {
    const digits = (input.cardNumber ?? "").replace(/\D/g, "");
    if (!digits) return { approved: false, code: "missing_card", message: locale === "ar" ? "أدخل رقم البطاقة." : "Enter your card number." };
    if (!luhnValid(digits)) return { approved: false, code: "invalid_number", message: locale === "ar" ? "رقم البطاقة غير صحيح." : "That card number is not valid." };
    const decline = DECLINES[digits];
    if (decline) return { approved: false, code: decline.code, message: locale === "ar" ? decline.messageAr : decline.message };
    return { approved: true, code: "authorized", message: "Approved", gatewayRef: randRef("AUTH") };
  }
  if (input.method === "wallet") {
    const w = (input.walletNumber ?? "").trim();
    if (w.length < 8) return { approved: false, code: "invalid_wallet", message: locale === "ar" ? "رقم المحفظة غير صحيح." : "Enter a valid mobile wallet number." };
    return { approved: true, code: "authorized", message: "Approved", gatewayRef: randRef("WLT") };
  }
  const h = (input.instapayHandle ?? "").trim();
  if (h.length < 5) return { approved: false, code: "invalid_instapay", message: locale === "ar" ? "عنوان Instapay غير صحيح." : "Enter a valid Instapay address." };
  return { approved: true, code: "authorized", message: "Approved", gatewayRef: randRef("INS") };
}
