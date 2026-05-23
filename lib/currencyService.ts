/**
 * Currency Service
 * Handles exchange rate fetching, caching, and currency conversions.
 *
 * Features:
 * - Real-time exchange rates from external API
 * - In-memory caching with configurable TTL
 * - Fallback rates for offline/error scenarios
 * - Rate locking for offer acceptance
 */

import {
  CurrencyCode,
  BASE_CURRENCY,
  FALLBACK_CURRENCY,
  getCurrencyInfo,
  formatCurrency as formatCurrencyConst,
} from "@/constants/currencies";

// Exchange rate cache
interface ExchangeRateCache {
  rates: Record<string, number>;
  base: string;
  timestamp: number;
  expiresAt: number;
}

// Cache TTL in milliseconds (default: 1 hour)
const CACHE_TTL = parseInt(
  process.env.EXCHANGE_RATE_CACHE_TTL || "3600000",
  10,
);

// In-memory cache
let exchangeRateCache: ExchangeRateCache | null = null;

/**
 * Hardcoded fallback rates relative to USD.
 * Used only when all external API sources fail.
 * Update periodically if needed.
 */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  EGP: 50.5,
  SAR: 3.75,
  AED: 3.67,
  KWD: 0.307,
  QAR: 3.64,
  OMR: 0.385,
  BHD: 0.377,
  JOD: 0.709,
  LBP: 89500,
  IQD: 1310,
  SYP: 13000,
  YER: 250,
  TND: 3.1,
  MAD: 10.0,
  DZD: 135,
  LYD: 4.85,
  SDG: 575,
  INR: 83.5,
  PKR: 278,
  BDT: 110,
  NGN: 1600,
  ZAR: 18.6,
  KES: 130,
  GHS: 15.5,
  TRY: 32.5,
  RUB: 92,
  CNY: 7.24,
  JPY: 149,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.9,
  SEK: 10.5,
  NOK: 10.6,
  DKK: 6.88,
  PLN: 3.96,
  CZK: 23.1,
  HUF: 357,
  RON: 4.57,
  BGN: 1.8,
  HRK: 6.93,
  RSD: 107,
  UAH: 38.5,
  BYN: 3.27,
  GEL: 2.65,
  AZN: 1.7,
  KZT: 450,
  UZS: 12600,
  THB: 35.1,
  MYR: 4.72,
  SGD: 1.34,
  IDR: 15750,
  PHP: 56.5,
  VND: 24500,
  KRW: 1330,
  TWD: 31.8,
  HKD: 7.82,
  NZD: 1.63,
  MXN: 17.2,
  BRL: 4.97,
  ARS: 875,
  CLP: 970,
  COP: 3950,
  PEN: 3.7,
};

/**
 * Fetch exchange rates from @fawazahmed0/currency-api (free, no key required).
 * Primary URL: jsDelivr CDN. Fallback URL: Cloudflare Pages.
 * Response: { date: "...", usd: { eur: 0.92, egp: 50.5, ... } }
 */
async function fetchExchangeRates(): Promise<Record<string, number>> {
  const base = BASE_CURRENCY.toLowerCase();
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base}.json`,
    `https://latest.currency-api.pages.dev/v1/currencies/${base}.json`,
  ];

  let lastError: unknown;

  for (const url of urls) {
    try {
      console.log("[CurrencyService] Fetching rates from:", url);
      const response = await fetch(url, {
        next: { revalidate: CACHE_TTL / 1000 },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Response shape: { date: "...", usd: { eur: 0.92, egp: 50.5, ... } }
      const rawRates: Record<string, number> = data[base];
      if (!rawRates || typeof rawRates !== "object") {
        throw new Error(`Unexpected response shape from ${url}`);
      }

      // Normalise keys to uppercase
      const rates: Record<string, number> = {};
      for (const [key, value] of Object.entries(rawRates)) {
        rates[key.toUpperCase()] = value as number;
      }
      rates[BASE_CURRENCY] = 1;

      console.log(
        `[CurrencyService] Fetched ${Object.keys(rates).length} rates from ${url}`,
      );
      return rates;
    } catch (error) {
      lastError = error;
      console.warn(
        "[CurrencyService] Source failed, trying next:",
        url,
        error instanceof Error ? error.message : error,
      );
    }
  }

  throw new Error(
    `All exchange rate sources failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

/**
 * Get current exchange rates (with caching)
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();

  // Return cached rates if still valid
  if (exchangeRateCache && exchangeRateCache.expiresAt > now) {
    return exchangeRateCache.rates;
  }

  try {
    const rates = await fetchExchangeRates();

    // Update cache
    exchangeRateCache = {
      rates,
      base: BASE_CURRENCY,
      timestamp: now,
      expiresAt: now + CACHE_TTL,
    };

    return rates;
  } catch (error) {
    // If we have stale cache, use it
    if (exchangeRateCache) {
      console.warn("[CurrencyService] Using stale cache due to API error");
      return exchangeRateCache.rates;
    }

    // Last resort: use hardcoded fallback rates so the app doesn't crash
    console.warn(
      "[CurrencyService] All sources failed, using hardcoded fallback rates",
    );
    return FALLBACK_RATES;
  }
}

/**
 * Get a specific exchange rate
 */
export async function getExchangeRate(
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return 1;

  const rates = await getExchangeRates();

  // If base currency is USD (our base), simple lookup
  if (from === BASE_CURRENCY) {
    return rates[to] || 1;
  }

  // If converting to base currency
  if (to === BASE_CURRENCY) {
    const fromRate = rates[from] || 1;
    return 1 / fromRate;
  }

  // Cross-rate calculation through base currency
  const fromRate = rates[from] || 1;
  const toRate = rates[to] || 1;

  return toRate / fromRate;
}

/**
 * Convert an amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<{ amount: number; rate: number }> {
  if (from === to) {
    return { amount: Number(amount.toFixed(2)), rate: 1 };
  }

  // Guard against non-numeric amounts
  if (!isFinite(amount) || isNaN(amount)) {
    console.warn(
      `[CurrencyService] convertCurrency received invalid amount: ${amount}`,
    );
    return { amount: 0, rate: 1 };
  }

  const rate = await getExchangeRate(from, to);
  const convertedAmount = Number((amount * rate).toFixed(2));

  return {
    amount: convertedAmount,
    rate,
  };
}

/**
 * Convert amount synchronously using cached/fallback rates
 * Use this for UI display when async is not possible
 */
export function convertCurrencySync(
  amount: number,
  from: string,
  to: string,
): { amount: number; rate: number } {
  if (from === to) {
    return { amount: Number(amount.toFixed(2)), rate: 1 };
  }

  // Use cached rates if available
  const rates = exchangeRateCache?.rates;

  if (!rates) {
    console.warn(
      "[CurrencyService] No cached rates available for synchronous conversion",
    );
    return { amount: Number(amount.toFixed(2)), rate: 1 };
  }

  let rate: number;
  if (from === BASE_CURRENCY) {
    rate = rates[to] || 1;
  } else if (to === BASE_CURRENCY) {
    rate = 1 / (rates[from] || 1);
  } else {
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    rate = toRate / fromRate;
  }

  return {
    amount: Number((amount * rate).toFixed(2)),
    rate,
  };
}

/**
 * Lock price interface - returned when accepting an offer
 */
export interface LockedPrice {
  basePrice: number;
  baseCurrency: string;
  clientCurrency: string;
  exchangeRateAtAcceptance: number;
  lockedPrice: number;
  lockedAt: Date;
}

/**
 * Lock the price at the current exchange rate
 * Call this when a client accepts an offer
 */
export async function lockPrice(
  basePrice: number,
  baseCurrency: string,
  clientCurrency: string,
): Promise<LockedPrice> {
  // Guard against invalid base price
  if (!isFinite(basePrice) || isNaN(basePrice) || basePrice <= 0) {
    throw new Error(
      `[CurrencyService] lockPrice received invalid basePrice: ${basePrice}`,
    );
  }
  const { amount, rate } = await convertCurrency(
    basePrice,
    baseCurrency,
    clientCurrency,
  );

  return {
    basePrice,
    baseCurrency,
    clientCurrency,
    exchangeRateAtAcceptance: rate,
    lockedPrice: amount,
    lockedAt: new Date(),
  };
}

/**
 * Format an amount in a specific currency
 */
export function formatAmount(
  amount: number,
  currencyCode: string,
  locale?: string,
): string {
  return formatCurrencyConst(amount, currencyCode, locale);
}

/**
 * Get display-ready price info
 */
export async function getDisplayPrice(
  basePrice: number,
  baseCurrency: string,
  displayCurrency: string,
  locale?: string,
): Promise<{
  originalPrice: string;
  convertedPrice: string;
  rate: number;
  currency: string;
}> {
  const { amount, rate } = await convertCurrency(
    basePrice,
    baseCurrency,
    displayCurrency,
  );

  return {
    originalPrice: formatAmount(basePrice, baseCurrency, locale),
    convertedPrice: formatAmount(amount, displayCurrency, locale),
    rate,
    currency: displayCurrency,
  };
}

/**
 * Batch convert multiple amounts
 */
export async function batchConvert(
  items: Array<{ amount: number; from: string }>,
  to: string,
): Promise<Array<{ amount: number; rate: number }>> {
  const rates = await getExchangeRates();

  return items.map(({ amount, from }) => {
    if (from === to) {
      return { amount, rate: 1 };
    }

    let rate: number;
    if (from === BASE_CURRENCY) {
      rate = rates[to] || 1;
    } else if (to === BASE_CURRENCY) {
      rate = 1 / (rates[from] || 1);
    } else {
      const fromRate = rates[from] || 1;
      const toRate = rates[to] || 1;
      rate = toRate / fromRate;
    }

    return {
      amount: amount * rate,
      rate,
    };
  });
}

/**
 * Refresh the exchange rate cache manually
 */
export async function refreshRates(): Promise<void> {
  exchangeRateCache = null;
  await getExchangeRates();
}

/**
 * Get cache status for monitoring
 */
export function getCacheStatus(): {
  cached: boolean;
  timestamp: number | null;
  expiresAt: number | null;
  isStale: boolean;
} {
  const now = Date.now();
  return {
    cached: exchangeRateCache !== null,
    timestamp: exchangeRateCache?.timestamp || null,
    expiresAt: exchangeRateCache?.expiresAt || null,
    isStale: exchangeRateCache ? exchangeRateCache.expiresAt < now : true,
  };
}

export { formatCurrencyConst as formatCurrency };
export type { ExchangeRateConfig };
