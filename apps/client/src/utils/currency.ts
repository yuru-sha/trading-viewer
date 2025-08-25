/**
 * Currency utility functions for formatting prices with appropriate symbols
 */

interface CurrencyInfo {
  symbol: string
  code: string
  name: string
}

const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  USD: { symbol: '$', code: 'USD', name: 'US Dollar' },
  JPY: { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound' },
  CAD: { symbol: 'CA$', code: 'CAD', name: 'Canadian Dollar' },
  AUD: { symbol: 'AU$', code: 'AUD', name: 'Australian Dollar' },
  CHF: { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc' },
  CNY: { symbol: '¥', code: 'CNY', name: 'Chinese Yuan' },
  KRW: { symbol: '₩', code: 'KRW', name: 'South Korean Won' },
  HKD: { symbol: 'HK$', code: 'HKD', name: 'Hong Kong Dollar' },
  SGD: { symbol: 'S$', code: 'SGD', name: 'Singapore Dollar' },
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
  BTC: { symbol: '₿', code: 'BTC', name: 'Bitcoin' },
  ETH: { symbol: 'Ξ', code: 'ETH', name: 'Ethereum' },
}

/**
 * Get currency symbol from currency code
 */
export const getCurrencySymbol = (currencyCode: string | null | undefined): string => {
  if (!currencyCode) return '$' // Default to USD

  const currency = CURRENCY_MAP[currencyCode.toUpperCase()]
  return currency?.symbol || '$'
}

/**
 * Get currency info from currency code
 */
export const getCurrencyInfo = (currencyCode: string | null | undefined): CurrencyInfo => {
  if (!currencyCode) return CURRENCY_MAP.USD!

  const currency = CURRENCY_MAP[currencyCode.toUpperCase()]
  return currency || CURRENCY_MAP.USD!
}

/**
 * Format price with appropriate currency symbol
 */
export const formatPrice = (
  price: number,
  currencyCode?: string | null,
  options: Intl.NumberFormatOptions = {}
): string => {
  const symbol = getCurrencySymbol(currencyCode)
  const code = currencyCode?.toUpperCase() || 'USD'

  // For JPY and KRW, typically no decimal places
  const defaultOptions =
    code === 'JPY' || code === 'KRW'
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }

  const formattedNumber = new Intl.NumberFormat('en-US', {
    ...defaultOptions,
    ...options,
  }).format(price)

  return `${symbol}${formattedNumber}`
}

/**
 * Format percentage change
 */
export const formatPercentage = (percentage: number): string => {
  const sign = percentage >= 0 ? '+' : ''
  return `${sign}${percentage.toFixed(2)}%`
}
