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
const CACHE_TTL = parseInt(process.env.EXCHANGE_RATE_CACHE_TTL || "3600000", 10);

// In-memory cache
let exchangeRateCache: ExchangeRateCache | null = null;

/**
 * Configuration for ExchangeRate.host API
 */
interface ExchangeRateConfig {
  apiKey: string;
  baseCurrency: string;
}

function getConfig(): ExchangeRateConfig {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    throw new Error("EXCHANGE_RATE_API_KEY environment variable is required");
  }
  
  return {
    apiKey,
    baseCurrency: BASE_CURRENCY,
  };
}

/**
 * Fetch exchange rates from ExchangeRate.host API
 */
async function fetchExchangeRates(): Promise<Record<string, number>> {
  const config = getConfig();
  
  // ExchangeRate.host /live endpoint
  const url = `https://api.exchangerate.host/live?access_key=${config.apiKey}&source=${config.baseCurrency}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: CACHE_TTL / 1000 }, // Next.js cache
    });

    if (!response.ok) {
      throw new Error(`Exchange rate API returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      const errorInfo = data.error?.info || data.error?.type || "Unknown error";
      throw new Error(`ExchangeRate.host API returned success=false: ${errorInfo}`);
    }

    // Ensure we have quotes
    if (!data.quotes || typeof data.quotes !== "object") {
      throw new Error(`ExchangeRate.host API returned invalid quotes: ${JSON.stringify(data.quotes)}`);
    }

    // Response quotes are keyed as "USDUSD", "USDEUR", etc.
    // Strip the 3-char source prefix to get plain currency codes
    const quotes: Record<string, number> = data.quotes;
    const prefixLen = config.baseCurrency.length;
    
    const rates = Object.fromEntries(
      Object.entries(quotes).map(([key, value]) => [
        key.slice(prefixLen),
        value as number,
      ])
    );

    // Ensure base currency rate is always 1
    rates[config.baseCurrency] = 1;

    return rates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CurrencyService] Failed to fetch exchange rates:", errorMessage);
    throw error;
  }
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

    // No fallback available, rethrow the error
    throw error;
  }
}

/**
 * Get a specific exchange rate
 */
export async function getExchangeRate(
  from: string,
  to: string
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
  to: string
): Promise<{ amount: number; rate: number }> {
  if (from === to) {
    return { amount: Number(amount.toFixed(2)), rate: 1 };
  }

  // Guard against non-numeric amounts
  if (!isFinite(amount) || isNaN(amount)) {
    console.warn(`[CurrencyService] convertCurrency received invalid amount: ${amount}`);
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
  to: string
): { amount: number; rate: number } {
  if (from === to) {
    return { amount: Number(amount.toFixed(2)), rate: 1 };
  }

  // Use cached rates if available
  const rates = exchangeRateCache?.rates;
  
  if (!rates) {
    console.warn("[CurrencyService] No cached rates available for synchronous conversion");
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
  clientCurrency: string
): Promise<LockedPrice> {
  // Guard against invalid base price
  if (!isFinite(basePrice) || isNaN(basePrice) || basePrice <= 0) {
    throw new Error(`[CurrencyService] lockPrice received invalid basePrice: ${basePrice}`);
  }
  const { amount, rate } = await convertCurrency(
    basePrice,
    baseCurrency,
    clientCurrency
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
  locale?: string
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
  locale?: string
): Promise<{
  originalPrice: string;
  convertedPrice: string;
  rate: number;
  currency: string;
}> {
  const { amount, rate } = await convertCurrency(
    basePrice,
    baseCurrency,
    displayCurrency
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
  to: string
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
