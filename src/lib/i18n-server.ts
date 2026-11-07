import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getT, type Locale } from "./i18n";

export const LOCALE_COOKIE = "locale";
export const THEME_COOKIE = "theme";
export type Theme = "light" | "dark";

export const getLocale = cache(async (): Promise<Locale> => {
  const header = (await headers()).get("x-locale");
  if (header === "ar" || header === "en") return header;
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value || store.get(`${LOCALE_COOKIE}_p`)?.value;
  return value === "ar" ? "ar" : "en";
});

export const getTheme = cache(async (): Promise<Theme> => {
  const header = (await headers()).get("x-theme");
  if (header === "dark" || header === "light") return header;
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value || store.get(`${THEME_COOKIE}_p`)?.value;
  return value === "dark" ? "dark" : "light";
});

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getT(locale), dir: locale === "ar" ? "rtl" : "ltr" } as const;
}
