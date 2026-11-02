"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getT, type Locale, type Translator } from "./i18n";

type Ctx = { locale: Locale; t: Translator; dir: "rtl" | "ltr" };

const I18nContext = createContext<Ctx>({ locale: "en", t: getT("en"), dir: "ltr" });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<Ctx>(() => ({ locale, t: getT(locale), dir: locale === "ar" ? "rtl" : "ltr" }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
