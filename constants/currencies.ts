/**
 * Currency constants and mappings for the currency conversion system.
 * This module provides:
 * - List of supported currencies
 * - Country to currency code mapping
 * - Currency metadata (symbols, decimal places, names)
 */

// Supported currencies in the system
export const SUPPORTED_CURRENCIES = [
  "USD", // US Dollar
  "EUR", // Euro
  "GBP", // British Pound
  "EGP", // Egyptian Pound
  "SAR", // Saudi Riyal
  "AED", // UAE Dirham
  "KWD", // Kuwaiti Dinar
  "QAR", // Qatari Riyal
  "OMR", // Omani Rial
  "BHD", // Bahraini Dinar
  "JOD", // Jordanian Dinar
  "LBP", // Lebanese Pound
  "IQD", // Iraqi Dinar
  "SYP", // Syrian Pound
  "YER", // Yemeni Rial
  "TND", // Tunisian Dinar
  "MAD", // Moroccan Dirham
  "DZD", // Algerian Dinar
  "LYD", // Libyan Dinar
  "SDG", // Sudanese Pound
  "INR", // Indian Rupee
  "PKR", // Pakistani Rupee
  "BDT", // Bangladeshi Taka
  "NGN", // Nigerian Naira
  "ZAR", // South African Rand
  "KES", // Kenyan Shilling
  "GHS", // Ghanaian Cedi
  "TRY", // Turkish Lira
  "RUB", // Russian Ruble
  "CNY", // Chinese Yuan
  "JPY", // Japanese Yen
  "AUD", // Australian Dollar
  "CAD", // Canadian Dollar
  "CHF", // Swiss Franc
  "SEK", // Swedish Krona
  "NOK", // Norwegian Krone
  "DKK", // Danish Krone
  "PLN", // Polish Zloty
  "CZK", // Czech Koruna
  "HUF", // Hungarian Forint
  "RON", // Romanian Leu
  "BGN", // Bulgarian Lev
  "HRK", // Croatian Kuna
  "RSD", // Serbian Dinar
  "UAH", // Ukrainian Hryvnia
  "BYN", // Belarusian Ruble
  "GEL", // Georgian Lari
  "AZN", // Azerbaijani Manat
  "KZT", // Kazakhstani Tenge
  "UZS", // Uzbekistani Som
  "THB", // Thai Baht
  "MYR", // Malaysian Ringgit
  "SGD", // Singapore Dollar
  "IDR", // Indonesian Rupiah
  "PHP", // Philippine Peso
  "VND", // Vietnamese Dong
  "KRW", // South Korean Won
  "TWD", // New Taiwan Dollar
  "HKD", // Hong Kong Dollar
  "NZD", // New Zealand Dollar
  "MXN", // Mexican Peso
  "BRL", // Brazilian Real
  "ARS", // Argentine Peso
  "CLP", // Chilean Peso
  "COP", // Colombian Peso
  "PEN", // Peruvian Sol
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

// Default/base currency for the platform
export const BASE_CURRENCY: CurrencyCode = "USD";
export const FALLBACK_CURRENCY: CurrencyCode = "USD";

// Country name to currency code mapping
export const countryToCurrency: Record<string, CurrencyCode> = {
  // Middle East & North Africa
  "Egypt": "EGP",
  "Saudi Arabia": "SAR",
  "UAE": "AED",
  "Kuwait": "KWD",
  "Qatar": "QAR",
  "Oman": "OMR",
  "Bahrain": "BHD",
  "Jordan": "JOD",
  "Lebanon": "LBP",
  "Iraq": "IQD",
  "Syria": "SYP",
  "Yemen": "YER",
  "Tunisia": "TND",
  "Morocco": "MAD",
  "Algeria": "DZD",
  "Libya": "LYD",
  "Sudan": "SDG",

  // Americas
  "United States": "USD",
  "Canada": "CAD",
  "Mexico": "MXN",
  "Brazil": "BRL",
  "Argentina": "ARS",
  "Chile": "CLP",
  "Colombia": "COP",
  "Peru": "PEN",
  "Ecuador": "USD", // Uses USD
  "Venezuela": "VES" as CurrencyCode, // Not in list, will fallback
  "Bolivia": "BOB" as CurrencyCode,
  "Paraguay": "PYG" as CurrencyCode,
  "Uruguay": "UYU" as CurrencyCode,
  "Costa Rica": "CRC" as CurrencyCode,
  "Panama": "USD", // Uses USD
  "Guatemala": "GTQ" as CurrencyCode,
  "Honduras": "HNL" as CurrencyCode,
  "El Salvador": "USD", // Uses USD
  "Dominican Republic": "DOP" as CurrencyCode,
  "Jamaica": "JMD" as CurrencyCode,
  "Trinidad and Tobago": "TTD" as CurrencyCode,
  "Bahamas": "BSD" as CurrencyCode,
  "Barbados": "BBD" as CurrencyCode,
  "Cuba": "CUP" as CurrencyCode,

  // Europe
  "United Kingdom": "GBP",
  "Germany": "EUR",
  "France": "EUR",
  "Italy": "EUR",
  "Spain": "EUR",
  "Netherlands": "EUR",
  "Belgium": "EUR",
  "Austria": "EUR",
  "Ireland": "EUR",
  "Portugal": "EUR",
  "Greece": "EUR",
  "Finland": "EUR",
  "Luxembourg": "EUR",
  "Malta": "EUR",
  "Cyprus": "EUR",
  "Estonia": "EUR",
  "Latvia": "EUR",
  "Lithuania": "EUR",
  "Slovakia": "EUR",
  "Slovenia": "EUR",
  "Switzerland": "CHF",
  "Sweden": "SEK",
  "Norway": "NOK",
  "Denmark": "DKK",
  "Poland": "PLN",
  "Czech Republic": "CZK",
  "Hungary": "HUF",
  "Romania": "RON",
  "Bulgaria": "BGN",
  "Croatia": "HRK",
  "Serbia": "RSD",
  "Ukraine": "UAH",
  "Belarus": "BYN",
  "Russia": "RUB",
  "Turkey": "TRY",
  "Iceland": "ISK" as CurrencyCode,
  "Andorra": "EUR",
  "Monaco": "EUR",
  "San Marino": "EUR",
  "Vatican City": "EUR",
  "Liechtenstein": "CHF",

  // Asia
  "China": "CNY",
  "Japan": "JPY",
  "South Korea": "KRW",
  "India": "INR",
  "Pakistan": "PKR",
  "Bangladesh": "BDT",
  "Indonesia": "IDR",
  "Malaysia": "MYR",
  "Singapore": "SGD",
  "Thailand": "THB",
  "Vietnam": "VND",
  "Philippines": "PHP",
  "Myanmar": "MMK" as CurrencyCode,
  "Cambodia": "KHR" as CurrencyCode,
  "Sri Lanka": "LKR" as CurrencyCode,
  "Nepal": "NPR" as CurrencyCode,
  "Mongolia": "MNT" as CurrencyCode,
  "Kazakhstan": "KZT",
  "Uzbekistan": "UZS",
  "Georgia": "GEL",
  "Azerbaijan": "AZN",
  "Armenia": "AMD" as CurrencyCode,

  // Africa
  "Nigeria": "NGN",
  "South Africa": "ZAR",
  "Kenya": "KES",
  "Ghana": "GHS",
  "Ethiopia": "ETB" as CurrencyCode,
  "Tanzania": "TZS" as CurrencyCode,
  "Uganda": "UGX" as CurrencyCode,
  "Cameroon": "XAF" as CurrencyCode,
  "Ivory Coast": "XOF" as CurrencyCode,
  "Senegal": "XOF" as CurrencyCode,
  "Botswana": "BWP" as CurrencyCode,
  "Namibia": "NAD" as CurrencyCode,
  "Zimbabwe": "ZWL" as CurrencyCode,

  // Oceania
  "Australia": "AUD",
  "New Zealand": "NZD",
  "Papua New Guinea": "PGK" as CurrencyCode,
  "Fiji": "FJD" as CurrencyCode,
};

// Country code (ISO 3166-1 alpha-2) to currency code mapping
export const countryCodeToCurrency: Record<string, CurrencyCode> = {
  // Middle East & North Africa
  EG: "EGP",
  SA: "SAR",
  AE: "AED",
  KW: "KWD",
  QA: "QAR",
  OM: "OMR",
  BH: "BHD",
  JO: "JOD",
  LB: "LBP",
  IQ: "IQD",
  SY: "SYP",
  YE: "YER",
  TN: "TND",
  MA: "MAD",
  DZ: "DZD",
  LY: "LYD",
  SD: "SDG",

  // Americas
  US: "USD",
  CA: "CAD",
  MX: "MXN",
  BR: "BRL",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",

  // Europe
  GB: "GBP",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  IE: "EUR",
  PT: "EUR",
  GR: "EUR",
  FI: "EUR",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  HR: "HRK",
  RS: "RSD",
  UA: "UAH",
  BY: "BYN",
  RU: "RUB",
  TR: "TRY",

  // Asia
  CN: "CNY",
  JP: "JPY",
  KR: "KRW",
  IN: "INR",
  PK: "PKR",
  BD: "BDT",
  ID: "IDR",
  MY: "MYR",
  SG: "SGD",
  TH: "THB",
  VN: "VND",
  PH: "PHP",
  KZ: "KZT",
  UZ: "UZS",
  GE: "GEL",
  AZ: "AZN",

  // Africa
  NG: "NGN",
  ZA: "ZAR",
  KE: "KES",
  GH: "GHS",

  // Oceania
  AU: "AUD",
  NZ: "NZD",
};

// Currency metadata
export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  symbolNative: string;
  decimalDigits: number;
  namePlural: string;
}

export const currencyInfo: Record<string, CurrencyInfo> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    symbolNative: "$",
    decimalDigits: 2,
    namePlural: "US dollars",
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    symbolNative: "€",
    decimalDigits: 2,
    namePlural: "euros",
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    symbolNative: "£",
    decimalDigits: 2,
    namePlural: "British pounds",
  },
  EGP: {
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "E£",
    symbolNative: "ج.م",
    decimalDigits: 2,
    namePlural: "Egyptian pounds",
  },
  SAR: {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "SR",
    symbolNative: "ر.س",
    decimalDigits: 2,
    namePlural: "Saudi riyals",
  },
  AED: {
    code: "AED",
    name: "UAE Dirham",
    symbol: "AED",
    symbolNative: "د.إ",
    decimalDigits: 2,
    namePlural: "UAE dirhams",
  },
  KWD: {
    code: "KWD",
    name: "Kuwaiti Dinar",
    symbol: "KD",
    symbolNative: "د.ك",
    decimalDigits: 3,
    namePlural: "Kuwaiti dinars",
  },
  QAR: {
    code: "QAR",
    name: "Qatari Riyal",
    symbol: "QR",
    symbolNative: "ر.ق",
    decimalDigits: 2,
    namePlural: "Qatari riyals",
  },
  OMR: {
    code: "OMR",
    name: "Omani Rial",
    symbol: "OMR",
    symbolNative: "ر.ع",
    decimalDigits: 3,
    namePlural: "Omani rials",
  },
  JOD: {
    code: "JOD",
    name: "Jordanian Dinar",
    symbol: "JD",
    symbolNative: "د.أ",
    decimalDigits: 3,
    namePlural: "Jordanian dinars",
  },
  INR: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    symbolNative: "₹",
    decimalDigits: 2,
    namePlural: "Indian rupees",
  },
  PKR: {
    code: "PKR",
    name: "Pakistani Rupee",
    symbol: "Rs",
    symbolNative: "₨",
    decimalDigits: 2,
    namePlural: "Pakistani rupees",
  },
  TRY: {
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    symbolNative: "₺",
    decimalDigits: 2,
    namePlural: "Turkish liras",
  },
  CNY: {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    symbolNative: "¥",
    decimalDigits: 2,
    namePlural: "Chinese yuan",
  },
  JPY: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    symbolNative: "¥",
    decimalDigits: 0,
    namePlural: "Japanese yen",
  },
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    symbolNative: "$",
    decimalDigits: 2,
    namePlural: "Australian dollars",
  },
  CAD: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    symbolNative: "$",
    decimalDigits: 2,
    namePlural: "Canadian dollars",
  },
  CHF: {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    symbolNative: "Fr.",
    decimalDigits: 2,
    namePlural: "Swiss francs",
  },
  NGN: {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    symbolNative: "₦",
    decimalDigits: 2,
    namePlural: "Nigerian nairas",
  },
  ZAR: {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    symbolNative: "R",
    decimalDigits: 2,
    namePlural: "South African rands",
  },
  KES: {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    symbolNative: "Ksh",
    decimalDigits: 2,
    namePlural: "Kenyan shillings",
  },
  BRL: {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    symbolNative: "R$",
    decimalDigits: 2,
    namePlural: "Brazilian reais",
  },
  MXN: {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "MX$",
    symbolNative: "$",
    decimalDigits: 2,
    namePlural: "Mexican pesos",
  },
  RUB: {
    code: "RUB",
    name: "Russian Ruble",
    symbol: "₽",
    symbolNative: "₽",
    decimalDigits: 2,
    namePlural: "Russian rubles",
  },
  KRW: {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    symbolNative: "₩",
    decimalDigits: 0,
    namePlural: "South Korean won",
  },
  SGD: {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    symbolNative: "$",
    decimalDigits: 2,
    namePlural: "Singapore dollars",
  },
  MYR: {
    code: "MYR",
    name: "Malaysian Ringgit",
    symbol: "RM",
    symbolNative: "RM",
    decimalDigits: 2,
    namePlural: "Malaysian ringgits",
  },
  THB: {
    code: "THB",
    name: "Thai Baht",
    symbol: "฿",
    symbolNative: "฿",
    decimalDigits: 2,
    namePlural: "Thai baht",
  },
  IDR: {
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    symbolNative: "Rp",
    decimalDigits: 0,
    namePlural: "Indonesian rupiahs",
  },
  PHP: {
    code: "PHP",
    name: "Philippine Peso",
    symbol: "₱",
    symbolNative: "₱",
    decimalDigits: 2,
    namePlural: "Philippine pesos",
  },
  VND: {
    code: "VND",
    name: "Vietnamese Dong",
    symbol: "₫",
    symbolNative: "₫",
    decimalDigits: 0,
    namePlural: "Vietnamese dong",
  },
};

/**
 * Get currency code from country name
 */
export function getCurrencyFromCountry(country: string): CurrencyCode {
  return countryToCurrency[country] || FALLBACK_CURRENCY;
}

/**
 * Get currency code from country code (ISO 3166-1 alpha-2)
 */
export function getCurrencyFromCountryCode(countryCode: string): CurrencyCode {
  return countryCodeToCurrency[countryCode?.toUpperCase()] || FALLBACK_CURRENCY;
}

/**
 * Get currency info by code
 */
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return currencyInfo[code];
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale?: string
): string {
  const info = getCurrencyInfo(currencyCode);
  const digits = info?.decimalDigits ?? 2;

  // Guard against NaN/non-finite to prevent output like "EGPNaN"
  const safeAmount = typeof amount === "number" && isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(safeAmount);
  } catch {
    // Fallback if Intl doesn't support the currency
    const symbol = info?.symbol || currencyCode;
    return `${symbol}${safeAmount.toFixed(digits)}`;
  }
}

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(code: string): code is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(code as CurrencyCode);
}
