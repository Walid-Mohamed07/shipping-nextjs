import { NextRequest, NextResponse } from "next/server";
import {
  getExchangeRates,
  getExchangeRate,
  convertCurrency,
  getCacheStatus,
  formatAmount,
} from "@/lib/currencyService";
import {
  SUPPORTED_CURRENCIES,
  BASE_CURRENCY,
  getCurrencyInfo,
  getCurrencyFromCountry,
  getCurrencyFromCountryCode,
  currencyInfo,
} from "@/constants/currencies";

/**
 * @swagger
 * /api/currency:
 *   get:
 *     summary: Get exchange rates and currency information
 *     description: Returns current exchange rates, supported currencies, and optionally converts an amount
 *     tags: [Currency]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: Source currency code (default USD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         description: Target currency code for conversion
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *         description: Amount to convert
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country name to get default currency for
 *       - in: query
 *         name: countryCode
 *         schema:
 *           type: string
 *         description: ISO country code to get default currency for
 *     responses:
 *       200:
 *         description: Currency information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rates:
 *                   type: object
 *                   description: Exchange rates with base currency
 *                 baseCurrency:
 *                   type: string
 *                 supportedCurrencies:
 *                   type: array
 *                   items:
 *                     type: string
 *                 conversion:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                     to:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     convertedAmount:
 *                       type: number
 *                     rate:
 *                       type: number
 *                     formatted:
 *                       type: string
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || BASE_CURRENCY;
    const to = searchParams.get("to");
    const amountStr = searchParams.get("amount");
    const country = searchParams.get("country");
    const countryCode = searchParams.get("countryCode");

    // Get exchange rates
    const rates = await getExchangeRates();
    const cacheStatus = getCacheStatus();

    // Build response
    const response: Record<string, any> = {
      baseCurrency: BASE_CURRENCY,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      currencyInfo: currencyInfo,
      cache: {
        isCached: cacheStatus.cached,
        isStale: cacheStatus.isStale,
        timestamp: cacheStatus.timestamp
          ? new Date(cacheStatus.timestamp).toISOString()
          : null,
      },
    };

    // If requesting all rates
    if (!to && !amountStr) {
      response.rates = rates;
    }

    // If conversion requested
    if (to && amountStr) {
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        return NextResponse.json(
          { error: "Invalid amount" },
          { status: 400 }
        );
      }

      const { amount: convertedAmount, rate } = await convertCurrency(
        amount,
        from,
        to
      );

      response.conversion = {
        from,
        to,
        amount,
        convertedAmount,
        rate,
        formatted: formatAmount(convertedAmount, to),
        originalFormatted: formatAmount(amount, from),
      };
    } else if (to) {
      // Just get the rate
      const rate = await getExchangeRate(from, to);
      response.rate = {
        from,
        to,
        rate,
      };
    }

    // If country lookup requested
    if (country) {
      const currency = getCurrencyFromCountry(country);
      response.countryCurrency = {
        country,
        currency,
        info: getCurrencyInfo(currency),
      };
    }

    // If country code lookup requested
    if (countryCode) {
      const currency = getCurrencyFromCountryCode(countryCode);
      response.countryCodeCurrency = {
        countryCode,
        currency,
        info: getCurrencyInfo(currency),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Currency API] Error:", errorMessage);
    
    // Return detailed error in development, generic in production
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: "Failed to fetch currency data",
        details: isDev ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/currency:
 *   post:
 *     summary: Convert currency amounts
 *     description: Convert one or more amounts between currencies
 *     tags: [Currency]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     amount:
 *                       type: number
 *                     from:
 *                       type: string
 *                     to:
 *                       type: string
 *               from:
 *                 type: string
 *                 description: Source currency (for single conversion)
 *               to:
 *                 type: string
 *                 description: Target currency (for single conversion)
 *               amount:
 *                 type: number
 *                 description: Amount to convert (for single conversion)
 *     responses:
 *       200:
 *         description: Conversion results
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle batch conversions
    if (body.conversions && Array.isArray(body.conversions)) {
      const results = await Promise.all(
        body.conversions.map(
          async (conv: { amount: number; from: string; to: string }) => {
            const { amount: convertedAmount, rate } = await convertCurrency(
              conv.amount,
              conv.from || BASE_CURRENCY,
              conv.to
            );
            return {
              original: {
                amount: conv.amount,
                currency: conv.from || BASE_CURRENCY,
                formatted: formatAmount(conv.amount, conv.from || BASE_CURRENCY),
              },
              converted: {
                amount: convertedAmount,
                currency: conv.to,
                formatted: formatAmount(convertedAmount, conv.to),
              },
              rate,
            };
          }
        )
      );

      return NextResponse.json({ conversions: results });
    }

    // Handle single conversion
    const { amount, from = BASE_CURRENCY, to } = body;

    if (!to) {
      return NextResponse.json(
        { error: "Target currency (to) is required" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || isNaN(amount)) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    const { amount: convertedAmount, rate } = await convertCurrency(
      amount,
      from,
      to
    );

    return NextResponse.json({
      original: {
        amount,
        currency: from,
        formatted: formatAmount(amount, from),
      },
      converted: {
        amount: convertedAmount,
        currency: to,
        formatted: formatAmount(convertedAmount, to),
      },
      rate,
    });
  } catch (error) {
    console.error("[Currency API] Error:", error);
    return NextResponse.json(
      { error: "Failed to convert currency" },
      { status: 500 }
    );
  }
}
