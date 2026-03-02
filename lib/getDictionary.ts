import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

export type Locale = "en" | "ar";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  ar,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.en;
}

export function isRTL(locale: Locale): boolean {
  return locale === "ar";
}

export const locales: Locale[] = ["ar", "en"];
export const defaultLocale: Locale = "ar";
