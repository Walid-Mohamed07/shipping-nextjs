"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  CurrencyCode,
  BASE_CURRENCY,
  FALLBACK_CURRENCY,
  getCurrencyFromCountry,
  formatCurrency,
  getCurrencyInfo,
  CurrencyInfo,
  SUPPORTED_CURRENCIES,
} from "@/constants/currencies";
import { useAuth } from "@/app/context/AuthContext";

// Types
interface ExchangeRates {
  [key: string]: number;
}

interface ConversionResult {
  amount: number;
  rate: number;
  formatted: string;
}

interface CurrencyContextType {
  // Current user's preferred currency
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  
  // Exchange rates
  rates: ExchangeRates;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Conversion functions
  convert: (amount: number, from?: string, to?: string) => ConversionResult;
  convertAsync: (amount: number, from?: string, to?: string) => Promise<ConversionResult>;
  formatPrice: (amount: number, currencyCode?: string) => string;
  
  // Currency info
  getCurrencyInfo: (code: string) => CurrencyInfo | undefined;
  supportedCurrencies: readonly CurrencyCode[];
  
  // Refresh rates
  refreshRates: () => Promise<void>;
}

// Default context value
const defaultContext: CurrencyContextType = {
  currency: FALLBACK_CURRENCY,
  setCurrency: () => {},
  rates: {},
  isLoading: true,
  error: null,
  lastUpdated: null,
  convert: (amount, _from, to) => ({ amount, rate: 1, formatted: formatCurrency(amount, to || FALLBACK_CURRENCY) }),
  convertAsync: async (amount, _from, to) => ({ amount, rate: 1, formatted: formatCurrency(amount, to || FALLBACK_CURRENCY) }),
  formatPrice: (amount, currencyCode) => formatCurrency(amount, currencyCode || FALLBACK_CURRENCY),
  getCurrencyInfo: () => undefined,
  supportedCurrencies: SUPPORTED_CURRENCIES,
  refreshRates: async () => {},
};

// Create context
const CurrencyContext = createContext<CurrencyContextType>(defaultContext);

// Storage key for persisting currency preference
const CURRENCY_STORAGE_KEY = "shiphub_preferred_currency";

interface CurrencyProviderProps {
  children: React.ReactNode;
  initialCurrency?: CurrencyCode;
  userCountry?: string;
}

export function CurrencyProvider({
  children,
  initialCurrency,
  userCountry,
}: CurrencyProviderProps) {
  const { user } = useAuth();

  // Determine initial currency
  const getInitialCurrency = useCallback((): CurrencyCode => {
    // Priority: user.preferredCurrency > initialCurrency prop > localStorage > country-based > fallback
    if (user?.preferredCurrency && SUPPORTED_CURRENCIES.includes(user.preferredCurrency as CurrencyCode)) {
      return user.preferredCurrency as CurrencyCode;
    }
    
    if (initialCurrency) return initialCurrency;
    
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored && SUPPORTED_CURRENCIES.includes(stored as CurrencyCode)) {
        return stored as CurrencyCode;
      }
    }
    
    // Use user's country to determine currency
    if (user?.country) {
      return getCurrencyFromCountry(user.country);
    }
    
    if (userCountry) {
      return getCurrencyFromCountry(userCountry);
    }
    
    return FALLBACK_CURRENCY;
  }, [initialCurrency, userCountry, user]);

  const [currency, setCurrencyState] = useState<CurrencyCode>(getInitialCurrency);
  const [rates, setRates] = useState<ExchangeRates>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Sync currency when user logs in/changes
  useEffect(() => {
    if (user?.preferredCurrency && SUPPORTED_CURRENCIES.includes(user.preferredCurrency as CurrencyCode)) {
      setCurrencyState(user.preferredCurrency as CurrencyCode);
      if (typeof window !== "undefined") {
        localStorage.setItem(CURRENCY_STORAGE_KEY, user.preferredCurrency);
      }
    } else if (user?.country) {
      // Fallback to user's country-based currency
      const countryCurrency = getCurrencyFromCountry(user.country);
      setCurrencyState(countryCurrency);
    }
  }, [user?.preferredCurrency, user?.country]);

  // Set currency and persist to localStorage + user profile
  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
      
      // Also save to user profile if logged in (fire and forget)
      if (user?.id) {
        fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ preferredCurrency: newCurrency }),
        }).catch((err) => console.error("[CurrencyContext] Failed to save to profile:", err));
      }
    }
  }, [user?.id]);

  // Fetch exchange rates
  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/currency");
      const data = await response.json();
      
      if (!response.ok) {
        // Include detailed error from API if available
        const errorMsg = data.details || data.error || "Failed to fetch exchange rates";
        throw new Error(errorMsg);
      }
      
      setRates(data.rates || {});
      setLastUpdated(new Date());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch rates";
      console.error("[CurrencyContext] Failed to fetch rates:", errorMsg);
      setError(errorMsg);
      // Use fallback rates if available from constants
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh rates
  const refreshRates = useCallback(async () => {
    await fetchRates();
  }, [fetchRates]);

  // Fetch rates on mount
  useEffect(() => {
    fetchRates();
    
    // Refresh rates every hour
    const interval = setInterval(fetchRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  // Synchronous conversion using API-fetched rates only
  // Returns original amount formatted in target currency while rates are still loading
  const convert = useCallback(
    (amount: number, from: string = BASE_CURRENCY, to?: string): ConversionResult => {
      const targetCurrency = to || currency;
      const rounded = Number(amount.toFixed(2));

      if (from === targetCurrency) {
        return {
          amount: rounded,
          rate: 1,
          formatted: formatCurrency(rounded, targetCurrency),
        };
      }

      // Only use rates fetched from the API — no static fallback on the client
      if (Object.keys(rates).length === 0) {
        // Rates not yet loaded from API; display original amount unmodified
        return {
          amount: rounded,
          rate: 1,
          formatted: formatCurrency(rounded, from),
        };
      }

      let rate: number;

      if (from === BASE_CURRENCY) {
        rate = rates[targetCurrency] ?? 1;
      } else if (targetCurrency === BASE_CURRENCY) {
        rate = 1 / (rates[from] ?? 1);
      } else {
        // Cross-rate through base currency
        const fromRate = rates[from] ?? 1;
        const toRate = rates[targetCurrency] ?? 1;
        rate = toRate / fromRate;
      }

      const convertedAmount = Number((amount * rate).toFixed(2));

      return {
        amount: convertedAmount,
        rate,
        formatted: formatCurrency(convertedAmount, targetCurrency),
      };
    },
    [currency, rates]
  );

  // Async conversion with fresh rates from API
  const convertAsync = useCallback(
    async (amount: number, from: string = BASE_CURRENCY, to?: string): Promise<ConversionResult> => {
      const targetCurrency = to || currency;
      
      if (from === targetCurrency) {
        return {
          amount,
          rate: 1,
          formatted: formatCurrency(amount, targetCurrency),
        };
      }

      try {
        const response = await fetch("/api/currency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, from, to: targetCurrency }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          const errorMsg = data.details || data.error || "Conversion failed";
          throw new Error(errorMsg);
        }
        
        return {
          amount: data.converted.amount,
          rate: data.rate,
          formatted: data.converted.formatted,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Async conversion failed";
        console.error("[CurrencyContext] Async conversion failed:", errorMsg);
        // Fall back to synchronous conversion
        return convert(amount, from, targetCurrency);
      }
    },
    [currency, convert]
  );

  // Format price in specified or current currency
  const formatPrice = useCallback(
    (amount: number, currencyCode?: string): string => {
      return formatCurrency(amount, currencyCode || currency);
    },
    [currency]
  );

  // Memoized context value
  const contextValue = useMemo<CurrencyContextType>(
    () => ({
      currency,
      setCurrency,
      rates,
      isLoading,
      error,
      lastUpdated,
      convert,
      convertAsync,
      formatPrice,
      getCurrencyInfo,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      refreshRates,
    }),
    [
      currency,
      setCurrency,
      rates,
      isLoading,
      error,
      lastUpdated,
      convert,
      convertAsync,
      formatPrice,
      refreshRates,
    ]
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Hook to use currency context
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

// Hook to convert and display a price
export function useConvertedPrice(
  amount: number,
  fromCurrency: string = BASE_CURRENCY
) {
  const { convert, currency, isLoading } = useCurrency();
  
  return useMemo(() => {
    const result = convert(amount, fromCurrency, currency);
    return {
      ...result,
      isLoading,
      originalAmount: amount,
      originalCurrency: fromCurrency,
      targetCurrency: currency,
    };
  }, [amount, fromCurrency, currency, convert, isLoading]);
}

// Hook for locked prices (no conversion, just formatting)
export function useLockedPrice(
  lockedPrice: number | undefined,
  clientCurrency: string | undefined
) {
  const { formatPrice, currency } = useCurrency();
  
  return useMemo(() => {
    if (lockedPrice === undefined || !clientCurrency) {
      return null;
    }
    
    return {
      amount: lockedPrice,
      currency: clientCurrency,
      formatted: formatPrice(lockedPrice, clientCurrency),
      // Warn if displaying in different currency than current user preference
      currencyMismatch: clientCurrency !== currency,
    };
  }, [lockedPrice, clientCurrency, formatPrice, currency]);
}

export default CurrencyContext;
