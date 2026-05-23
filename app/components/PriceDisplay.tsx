"use client";

import React, { useMemo, useState } from "react";
import { useCurrency, useConvertedPrice, useLockedPrice } from "@/app/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { Lock, RefreshCw, AlertTriangle } from "lucide-react";
import { BASE_CURRENCY } from "@/constants/currencies";

/** Internal tooltip — no external UI-library dependency */
function SimpleTooltip({
  content,
  children,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 min-w-max rounded-md border bg-popover text-popover-foreground shadow-md px-3 py-1.5 text-sm pointer-events-none">
          {content}
        </span>
      )}
    </span>
  );
}

interface PriceDisplayProps {
  /** The amount to display */
  amount: number;
  /** The currency the amount is in (default: USD) */
  currency?: string;
  /** Show original price alongside converted price */
  showOriginal?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show loading state while rates are fetching */
  showLoading?: boolean;
}

/**
 * Display a price with automatic currency conversion based on user preference
 */
export function PriceDisplay({
  amount,
  currency = BASE_CURRENCY,
  showOriginal = false,
  className,
  size = "md",
  showLoading = true,
}: PriceDisplayProps) {
  const { isLoading, formatPrice } = useCurrency();
  const converted = useConvertedPrice(amount, currency);

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-semibold",
  };

  if (isLoading && showLoading) {
    return (
      <span className={cn("animate-pulse bg-muted rounded", sizeClasses[size], className)}>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      </span>
    );
  }

  // Same currency, no conversion needed
  if (currency === converted.targetCurrency) {
    return (
      <span className={cn(sizeClasses[size], className)}>
        {converted.formatted}
      </span>
    );
  }

  return (
    <SimpleTooltip
      content={
        <>
          <p>Original: {formatPrice(amount, currency)}</p>
          <p className="text-xs text-muted-foreground">
            Rate: 1 {currency} = {converted.rate.toFixed(4)} {converted.targetCurrency}
          </p>
        </>
      }
    >
      <span className={cn(sizeClasses[size], className)}>
        {converted.formatted}
        {showOriginal && (
          <span className="text-muted-foreground text-xs ml-1">
            ({formatPrice(amount, currency)})
          </span>
        )}
      </span>
    </SimpleTooltip>
  );
}

interface LockedPriceDisplayProps {
  /** Locked price data from request.pricing */
  pricing?: {
    basePrice: number;
    baseCurrency: string;
    clientCurrency: string;
    exchangeRateAtAcceptance: number;
    lockedPrice: number;
    lockedAt?: string;
    finalLockedPrice?: number;
  };
  /** Fallback amount if no locked price */
  fallbackAmount?: number;
  /** Fallback currency if no locked price */
  fallbackCurrency?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show lock icon to indicate locked price */
  showLockIcon?: boolean;
  /** Show detailed breakdown */
  showBreakdown?: boolean;
}

/**
 * Display a locked price (from accepted offer)
 * This price won't change with exchange rate fluctuations
 */
export function LockedPriceDisplay({
  pricing,
  fallbackAmount,
  fallbackCurrency = BASE_CURRENCY,
  className,
  size = "md",
  showLockIcon = true,
  showBreakdown = false,
}: LockedPriceDisplayProps) {
  const { formatPrice, currency: userCurrency } = useCurrency();
  const lockedData = useLockedPrice(
    pricing?.finalLockedPrice || pricing?.lockedPrice,
    pricing?.clientCurrency
  );

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-semibold",
  };

  // If no locked pricing, fall back to regular price display
  if (!pricing || !lockedData) {
    if (fallbackAmount !== undefined) {
      return (
        <PriceDisplay
          amount={fallbackAmount}
          currency={fallbackCurrency}
          className={className}
          size={size}
        />
      );
    }
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  const displayPrice = lockedData.formatted;
  const lockedDate = pricing.lockedAt ? new Date(pricing.lockedAt) : null;

  return (
    <SimpleTooltip
      content={
        <div className="space-y-1 max-w-xs">
          <p className="font-medium flex items-center gap-1">
            <Lock className="h-3 w-3" /> Price Locked
          </p>
          <p className="text-xs">
            Original: {formatPrice(pricing.basePrice, pricing.baseCurrency)}
          </p>
          <p className="text-xs">
            Rate: 1 {pricing.baseCurrency} = {pricing.exchangeRateAtAcceptance.toFixed(4)}{" "}
            {pricing.clientCurrency}
          </p>
          {lockedDate && (
            <p className="text-xs text-muted-foreground">
              Locked at: {lockedDate.toLocaleString()}
            </p>
          )}
          {lockedData.currencyMismatch && (
            <p className="text-xs text-amber-500">
              Price is in {pricing.clientCurrency}, your currency is {userCurrency}
            </p>
          )}
        </div>
      }
    >
      <span className={cn("inline-flex items-center gap-1", sizeClasses[size], className)}>
        {showLockIcon && (
          <Lock className="h-3 w-3 text-green-600" aria-label="Price locked" />
        )}
        <span>{displayPrice}</span>
        {lockedData.currencyMismatch && (
          <AlertTriangle className="h-3 w-3 text-amber-500" />
        )}
      </span>
    </SimpleTooltip>
  );
}

interface CurrencySelectorProps {
  /** Additional CSS classes */
  className?: string;
  /** Show label */
  showLabel?: boolean;
  /** Compact mode */
  compact?: boolean;
}

/**
 * Currency selector dropdown
 */
export function CurrencySelector({
  className,
  showLabel = true,
  compact = false,
}: CurrencySelectorProps) {
  const { currency, setCurrency, supportedCurrencies, isLoading, refreshRates } = useCurrency();

  const popularCurrencies = ["USD", "EUR", "GBP", "EGP", "SAR", "AED", "INR"];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && !compact && (
        <label htmlFor="currency-select" className="text-sm text-muted-foreground">
          Currency:
        </label>
      )}
      <div className="relative">
        <select
          id="currency-select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as typeof currency)}
          className={cn(
            "appearance-none bg-background border rounded-md px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary",
            compact && "px-2 py-1"
          )}
          disabled={isLoading}
        >
          <optgroup label="Popular">
            {popularCurrencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </optgroup>
          <optgroup label="All Currencies">
            {supportedCurrencies
              .filter((code) => !popularCurrencies.includes(code))
              .map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
          </optgroup>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {!compact && (
        <button
          onClick={refreshRates}
          disabled={isLoading}
          className="p-1 hover:bg-muted rounded-md transition-colors"
          title="Refresh exchange rates"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </button>
      )}
    </div>
  );
}

interface OfferPriceProps {
  /** Offer cost */
  cost: number;
  /** Offer currency */
  currency?: string;
  /** Final price with markup */
  finalPrice?: number;
  /** Whether this offer is selected/accepted */
  isSelected?: boolean;
  /** Show both original and converted */
  showBothPrices?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Display an offer price with optional conversion
 */
export function OfferPrice({
  cost,
  currency = BASE_CURRENCY,
  finalPrice,
  isSelected = false,
  showBothPrices = true,
  className,
}: OfferPriceProps) {
  const displayAmount = finalPrice || cost;
  const { formatPrice, currency: userCurrency } = useCurrency();
  const converted = useConvertedPrice(displayAmount, currency);

  const needsConversion = currency !== userCurrency;

  return (
    <div className={cn("flex flex-col", className)}>
      <span className="font-semibold text-lg">
        {needsConversion ? converted.formatted : formatPrice(displayAmount, currency)}
      </span>
      {showBothPrices && needsConversion && (
        <span className="text-xs text-muted-foreground">
          ({formatPrice(displayAmount, currency)})
        </span>
      )}
      {isSelected && (
        <span className="text-xs text-green-600 font-medium">Selected</span>
      )}
    </div>
  );
}

/**
 * Hook to get payment amount (uses locked price if available)
 */
export function usePaymentAmount(request: {
  pricing?: {
    lockedPrice?: number;
    finalLockedPrice?: number;
    clientCurrency?: string;
  };
  selectedDriver?: {
    finalPrice?: number;
    cost?: number;
    currency?: string;
  };
}) {
  const { formatPrice } = useCurrency();

  return useMemo(() => {
    // Priority: locked price > selectedDriver.finalPrice > selectedDriver.cost
    if (request.pricing?.finalLockedPrice || request.pricing?.lockedPrice) {
      const amount = request.pricing.finalLockedPrice || request.pricing.lockedPrice!;
      const currency = request.pricing.clientCurrency || BASE_CURRENCY;
      return {
        amount,
        currency,
        formatted: formatPrice(amount, currency),
        isLocked: true,
      };
    }

    if (request.selectedDriver) {
      const amount = request.selectedDriver.finalPrice || request.selectedDriver.cost || 0;
      const currency = request.selectedDriver.currency || BASE_CURRENCY;
      return {
        amount,
        currency,
        formatted: formatPrice(amount, currency),
        isLocked: false,
      };
    }

    return {
      amount: 0,
      currency: BASE_CURRENCY,
      formatted: formatPrice(0, BASE_CURRENCY),
      isLocked: false,
    };
  }, [request, formatPrice]);
}
