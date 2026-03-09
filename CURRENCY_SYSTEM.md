# Currency Conversion System with Price Locking

This document describes the currency conversion system implementation that supports multiple currencies with real-time exchange rates and price locking to prevent currency fluctuation issues.

## Overview

The system provides:
- **Real-time currency conversion** for displaying prices across the platform
- **Price locking** when a client accepts an offer to prevent exchange rate fluctuations affecting payment
- **Multi-currency support** for all user roles (Client, Company, Admin, Operator)
- **Country-based default currency** for client users

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRICE FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Company creates offer          2. Client views offer         │
│  ┌──────────────────────┐         ┌──────────────────────┐       │
│  │ price: 100           │   →     │ Convert to user's    │       │
│  │ currency: USD        │         │ preferred currency   │       │
│  └──────────────────────┘         │ (real-time rate)     │       │
│                                   └──────────────────────┘       │
│                                             │                    │
│                                             ▼                    │
│  3. Client accepts offer                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ LOCK THE PRICE AT CURRENT EXCHANGE RATE                  │   │
│  │                                                           │   │
│  │ basePrice: 100                                            │   │
│  │ baseCurrency: USD                                         │   │
│  │ clientCurrency: EGP                                       │   │
│  │ exchangeRateAtAcceptance: 50.85                           │   │
│  │ lockedPrice: 5085                                         │   │
│  │ lockedAt: 2026-03-07T10:00:00Z                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                             │                    │
│                                             ▼                    │
│  4. Payment (even if rate changed)                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ USE LOCKED PRICE: 5085 EGP                                │   │
│  │ (NOT recalculated, regardless of current exchange rate)  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Files

### Constants
- [constants/currencies.ts](constants/currencies.ts) - Currency codes, country mappings, currency metadata

### Services
- [lib/currencyService.ts](lib/currencyService.ts) - Exchange rate fetching, caching, conversion functions

### API Routes
- [app/api/currency/route.ts](app/api/currency/route.ts) - Currency conversion API endpoint

### Models (Updated)
- [lib/models/Request.ts](lib/models/Request.ts) - Added `pricing` field for locked prices
- [lib/models/User.ts](lib/models/User.ts) - Added `preferredCurrency` and `country` fields

### Types (Updated)
- [types/request.ts](types/request.ts) - Added pricing interface
- [types/user.ts](types/user.ts) - Added currency-related fields

### Context
- [app/context/CurrencyContext.tsx](app/context/CurrencyContext.tsx) - React context for currency state

### Components
- [app/components/PriceDisplay.tsx](app/components/PriceDisplay.tsx) - Price display components with conversion

### Updated Routes
- [app/api/requests/[id]/submit-offer/route.ts](app/api/requests/[id]/submit-offer/route.ts) - Price locking on offer acceptance
- [app/api/pay/route.ts](app/api/pay/route.ts) - Use locked price for payment
- [app/checkout/page.tsx](app/checkout/page.tsx) - Display locked prices

## Usage

### 1. Display a Price with Automatic Conversion

```tsx
import { PriceDisplay } from "@/app/components/PriceDisplay";

// Basic usage - converts from USD to user's preferred currency
<PriceDisplay amount={100} currency="USD" />

// Show original price alongside converted
<PriceDisplay amount={100} currency="USD" showOriginal />

// Different sizes
<PriceDisplay amount={100} currency="USD" size="lg" />
```

### 2. Display a Locked Price

```tsx
import { LockedPriceDisplay } from "@/app/components/PriceDisplay";

// For accepted offers with locked pricing
<LockedPriceDisplay
  pricing={request.pricing}
  showLockIcon
  showBreakdown
/>
```

### 3. Currency Selector

```tsx
import { CurrencySelector } from "@/app/components/PriceDisplay";

// Let users choose their preferred currency
<CurrencySelector showLabel compact={false} />
```

### 4. Use Currency Context

```tsx
import { useCurrency, useConvertedPrice } from "@/app/context/CurrencyContext";

function MyComponent() {
  const { currency, convert, formatPrice } = useCurrency();
  
  // Synchronous conversion using cached rates
  const result = convert(100, "USD"); // Converts to user's currency
  
  // Format in specific currency
  const formatted = formatPrice(100, "EGP"); // "E£100.00"
  
  return <div>{result.formatted}</div>;
}
```

### 5. API Usage

```bash
# Get all exchange rates
GET /api/currency

# Get specific rate
GET /api/currency?from=USD&to=EGP

# Convert an amount
GET /api/currency?from=USD&to=EGP&amount=100

# Get currency for country
GET /api/currency?country=Egypt

# Batch convert (POST)
POST /api/currency
{
  "conversions": [
    { "amount": 100, "from": "USD", "to": "EGP" },
    { "amount": 50, "from": "EUR", "to": "SAR" }
  ]
}
```

## Data Model

### Request.pricing (Locked Price Data)

```typescript
interface Pricing {
  basePrice: number;              // Original price (e.g., 100)
  baseCurrency: string;           // Original currency (e.g., "USD")
  clientCurrency: string;         // Client's currency (e.g., "EGP")
  exchangeRateAtAcceptance: number; // Rate at acceptance (e.g., 50.85)
  lockedPrice: number;            // Locked amount (e.g., 5085)
  lockedAt: Date;                 // When price was locked
  finalLockedPrice: number;       // Final amount after any fees
}
```

### User Currency Fields

```typescript
interface User {
  // ... existing fields
  country?: string;              // User's country (for default currency)
  preferredCurrency?: string;    // User's chosen currency
}
```

## Exchange Rate Providers

The system supports multiple exchange rate providers:

1. **Frankfurter** (default) - Free, no API key required
2. **ExchangeRate-API** - Requires API key
3. **Open Exchange Rates** - Requires API key
4. **Fixer** - Requires API key

Configure via environment variables:

```env
EXCHANGE_RATE_PROVIDER=frankfurter  # or exchangerate-api, openexchangerates, fixer
EXCHANGE_RATE_API_KEY=your_api_key  # Required for paid providers
EXCHANGE_RATE_CACHE_TTL=3600000     # Cache duration in ms (default: 1 hour)
```

## Client Currency Determination

For client users, the default currency is determined in this order:

1. **Explicit preference** - User has set a preferred currency
2. **Country-based** - Derived from user's country (e.g., Egypt → EGP)
3. **Fallback** - USD if no other preference

```typescript
// Country to currency mapping examples
Egypt → EGP
Saudi Arabia → SAR
UAE → AED
United States → USD
Germany → EUR
United Kingdom → GBP
```

## Important Rules

1. **Base Price Storage**: All offers must store the original price and currency
2. **Real-Time Display**: Use real-time rates for displaying prices
3. **Lock on Accept**: When client accepts an offer, lock the exchange rate
4. **Payment Uses Locked**: Always use `lockedPrice` for payment, never recalculate
5. **Audit Trail**: Store all rate and conversion details for auditing

## Supported Currencies

The system supports 60+ currencies including:

- **Americas**: USD, CAD, MXN, BRL, ARS, CLP, COP, PEN
- **Europe**: EUR, GBP, CHF, SEK, NOK, DKK, PLN, CZK, HUF, RON
- **Middle East**: EGP, SAR, AED, KWD, QAR, OMR, JOD, LBP
- **Asia**: CNY, JPY, INR, PKR, THB, MYR, SGD, IDR, PHP, VND, KRW
- **Africa**: NGN, ZAR, KES, GHS

See [constants/currencies.ts](constants/currencies.ts) for the full list.
