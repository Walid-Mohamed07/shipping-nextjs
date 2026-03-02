"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getDictionary, isRTL, Locale, Dictionary, defaultLocale } from "@/lib/getDictionary";

interface LocaleContextType {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
  isRtl: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = "shiphub-locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [dictionary, setDictionary] = useState<Dictionary>(getDictionary(defaultLocale));
  const [isRtl, setIsRtl] = useState<boolean>(isRTL(defaultLocale));
  const [mounted, setMounted] = useState(false);

  // Initialize locale from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored && (stored === "en" || stored === "ar")) {
      setLocaleState(stored);
      setDictionary(getDictionary(stored));
      setIsRtl(isRTL(stored));
    } else {
      // If no stored locale, use default and set RTL accordingly
      setIsRtl(isRTL(defaultLocale));
    }
    setMounted(true);
  }, []);

  // Update document direction when locale changes
  useEffect(() => {
    if (mounted) {
      const rtl = isRTL(locale);
      setIsRtl(rtl);
      document.documentElement.lang = locale;
      document.documentElement.dir = rtl ? "rtl" : "ltr";
    }
  }, [locale, mounted]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setDictionary(getDictionary(newLocale));
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }, []);

  // Don't render until we've checked localStorage to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, dictionary, setLocale, isRtl }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

export function useTranslation() {
  const { dictionary, locale, isRtl } = useLocale();
  return { t: dictionary, locale, isRtl };
}
