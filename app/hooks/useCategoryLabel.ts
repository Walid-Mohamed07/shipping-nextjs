"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/app/context/LocaleContext";

type CategoryEntry = { en: string; ar: string };
type CategoryMap = Record<string, CategoryEntry>;

// Module-level cache to avoid re-fetching on every component mount
let cachedCategoryMap: CategoryMap | null = null;
let fetchPromise: Promise<CategoryMap> | null = null;

async function fetchCategoryMap(): Promise<CategoryMap> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/admin/categories")
    .then((res) => res.json())
    .then((data) => {
      const map: CategoryMap = {};
      for (const cat of data.categories || []) {
        if (cat.name && typeof cat.name === "object") {
          const enName = (cat.name.en || "").trim();
          if (enName) {
            map[enName] = { en: cat.name.en || "", ar: cat.name.ar || "" };
          }
        } else if (typeof cat.name === "string" && cat.name.trim()) {
          map[cat.name] = { en: cat.name, ar: cat.name };
        }
      }
      cachedCategoryMap = map;
      return map;
    })
    .catch(() => {
      fetchPromise = null;
      return {};
    });
  return fetchPromise;
}

/**
 * Hook that provides a function to get the localized category label
 * based on the English category name stored in item.category.
 * Categories are fetched once and cached at module level.
 */
export function useCategoryLabel() {
  const { locale } = useTranslation();
  const [categoryMap, setCategoryMap] = useState<CategoryMap>(
    cachedCategoryMap || {}
  );

  useEffect(() => {
    if (cachedCategoryMap) {
      setCategoryMap(cachedCategoryMap);
      return;
    }
    fetchCategoryMap().then((map) => setCategoryMap(map));
  }, []);

  const getCategoryLabel = useCallback(
    (englishName: string): string => {
      if (!englishName) return "";
      const entry = categoryMap[englishName];
      if (!entry) return englishName; // fallback to the raw value
      return locale === "ar" ? entry.ar || entry.en : entry.en;
    },
    [categoryMap, locale]
  );

  return { getCategoryLabel };
}
