import { describe, expect, it } from 'vitest'
import {
  getCurrencySymbol,
  getCurrencyInfo,
  formatPrice,
  formatPercentage
} from '../currency'

describe('Currency Utilities', () => {
  describe('getCurrencySymbol', () => {
    it('should return correct currency symbols', () => {
      expect(getCurrencySymbol('USD')).toBe('$')
      expect(getCurrencySymbol('JPY')).toBe('¥')
      expect(getCurrencySymbol('EUR')).toBe('€')
      expect(getCurrencySymbol('GBP')).toBe('£')
      expect(getCurrencySymbol('BTC')).toBe('₿')
      expect(getCurrencySymbol('ETH')).toBe('Ξ')
    })

    it('should be case insensitive', () => {
      expect(getCurrencySymbol('usd')).toBe('$')
      expect(getCurrencySymbol('jpy')).toBe('¥')
      expect(getCurrencySymbol('EUR')).toBe('€')
      expect(getCurrencySymbol('Gbp')).toBe('£')
    })

    it('should default to USD symbol for null/undefined', () => {
      expect(getCurrencySymbol(null)).toBe('$')
      expect(getCurrencySymbol(undefined)).toBe('$')
      expect(getCurrencySymbol('')).toBe('$')
    })

    it('should default to USD symbol for unknown currency', () => {
      expect(getCurrencySymbol('XYZ')).toBe('$')
      expect(getCurrencySymbol('INVALID')).toBe('$')
    })

    it('should handle special currency symbols', () => {
      expect(getCurrencySymbol('CAD')).toBe('CA$')
      expect(getCurrencySymbol('AUD')).toBe('AU$')
      expect(getCurrencySymbol('HKD')).toBe('HK$')
      expect(getCurrencySymbol('SGD')).toBe('S$')
      expect(getCurrencySymbol('KRW')).toBe('₩')
      expect(getCurrencySymbol('INR')).toBe('₹')
    })
  })

  describe('getCurrencyInfo', () => {
    it('should return complete currency information', () => {
      const usdInfo = getCurrencyInfo('USD')
      expect(usdInfo).toEqual({
        symbol: '$',
        code: 'USD',
        name: 'US Dollar'
      })

      const jpyInfo = getCurrencyInfo('JPY')
      expect(jpyInfo).toEqual({
        symbol: '¥',
        code: 'JPY',
        name: 'Japanese Yen'
      })
    })

    it('should be case insensitive', () => {
      const eurInfo = getCurrencyInfo('eur')
      expect(eurInfo.code).toBe('EUR')
      expect(eurInfo.symbol).toBe('€')
      expect(eurInfo.name).toBe('Euro')
    })

    it('should default to USD for null/undefined', () => {
      expect(getCurrencyInfo(null)).toEqual({
        symbol: '$',
        code: 'USD',
        name: 'US Dollar'
      })
      expect(getCurrencyInfo(undefined)).toEqual({
        symbol: '$',
        code: 'USD',
        name: 'US Dollar'
      })
    })

    it('should default to USD for unknown currency', () => {
      const unknownInfo = getCurrencyInfo('UNKNOWN')
      expect(unknownInfo).toEqual({
        symbol: '$',
        code: 'USD',
        name: 'US Dollar'
      })
    })

    it('should return crypto currency info', () => {
      const btcInfo = getCurrencyInfo('BTC')
      expect(btcInfo).toEqual({
        symbol: '₿',
        code: 'BTC',
        name: 'Bitcoin'
      })

      const ethInfo = getCurrencyInfo('ETH')
      expect(ethInfo).toEqual({
        symbol: 'Ξ',
        code: 'ETH',
        name: 'Ethereum'
      })
    })
  })

  describe('formatPrice', () => {
    it('should format USD prices with 2 decimal places', () => {
      expect(formatPrice(123.45, 'USD')).toBe('$123.45')
      expect(formatPrice(1234.567, 'USD')).toBe('$1,234.57')
      expect(formatPrice(0.99, 'USD')).toBe('$0.99')
    })

    it('should format JPY prices without decimal places', () => {
      expect(formatPrice(123.45, 'JPY')).toBe('¥123')
      expect(formatPrice(1234.567, 'JPY')).toBe('¥1,235')
      expect(formatPrice(100, 'JPY')).toBe('¥100')
    })

    it('should format KRW prices without decimal places', () => {
      expect(formatPrice(1234.56, 'KRW')).toBe('₩1,235')
      expect(formatPrice(50000, 'KRW')).toBe('₩50,000')
    })

    it('should handle large numbers with thousands separator', () => {
      expect(formatPrice(1234567.89, 'USD')).toBe('$1,234,567.89')
      expect(formatPrice(1000000, 'JPY')).toBe('¥1,000,000')
    })

    it('should handle negative prices', () => {
      expect(formatPrice(-123.45, 'USD')).toBe('$-123.45')
      expect(formatPrice(-1000, 'JPY')).toBe('¥-1,000')
    })

    it('should handle zero price', () => {
      expect(formatPrice(0, 'USD')).toBe('$0.00')
      expect(formatPrice(0, 'JPY')).toBe('¥0')
    })

    it('should use USD as default currency', () => {
      expect(formatPrice(123.45)).toBe('$123.45')
      expect(formatPrice(123.45, null)).toBe('$123.45')
      expect(formatPrice(123.45, undefined)).toBe('$123.45')
    })

    it('should allow custom formatting options', () => {
      expect(formatPrice(123.456, 'USD', { maximumFractionDigits: 3 })).toBe('$123.456')
      expect(formatPrice(123.456, 'USD', { minimumFractionDigits: 0, maximumFractionDigits: 1 })).toBe('$123.5')
    })

    it('should use currency-specific formatting', () => {
      // Test JPY with default behavior (no decimals)
      expect(formatPrice(123.45, 'JPY')).toBe('¥123')
      
      // Test EUR with default behavior (with decimals)
      expect(formatPrice(123.45, 'EUR')).toBe('€123.45')
      
      // Test USD formatting
      expect(formatPrice(123.45, 'USD')).toBe('$123.45')
    })

    it('should handle various international currencies', () => {
      expect(formatPrice(123.45, 'EUR')).toBe('€123.45')
      expect(formatPrice(123.45, 'GBP')).toBe('£123.45')
      expect(formatPrice(123.45, 'CAD')).toBe('CA$123.45')
      expect(formatPrice(123.45, 'AUD')).toBe('AU$123.45')
    })

    it('should handle cryptocurrency', () => {
      expect(formatPrice(0.5, 'BTC')).toBe('₿0.50')
      expect(formatPrice(2.5, 'ETH')).toBe('Ξ2.50')
    })

    it('should handle very small numbers', () => {
      expect(formatPrice(0.001, 'USD')).toBe('$0.00')
      expect(formatPrice(0.001, 'USD', { minimumFractionDigits: 3, maximumFractionDigits: 3 })).toBe('$0.001')
    })

    it('should handle very large numbers', () => {
      expect(formatPrice(999999999.99, 'USD')).toBe('$999,999,999.99')
      expect(formatPrice(1000000000, 'JPY')).toBe('¥1,000,000,000')
    })
  })

  describe('formatPercentage', () => {
    it('should format positive percentages with plus sign', () => {
      expect(formatPercentage(5.23)).toBe('+5.23%')
      expect(formatPercentage(0.01)).toBe('+0.01%')
      expect(formatPercentage(100)).toBe('+100.00%')
    })

    it('should format negative percentages with minus sign', () => {
      expect(formatPercentage(-5.23)).toBe('-5.23%')
      expect(formatPercentage(-0.01)).toBe('-0.01%')
      expect(formatPercentage(-100)).toBe('-100.00%')
    })

    it('should format zero percentage', () => {
      expect(formatPercentage(0)).toBe('+0.00%')
    })

    it('should round to 2 decimal places', () => {
      expect(formatPercentage(5.23456)).toBe('+5.23%')
      expect(formatPercentage(-5.23789)).toBe('-5.24%')
      expect(formatPercentage(5.236)).toBe('+5.24%')
      expect(formatPercentage(-5.235)).toBe('-5.24%')
    })

    it('should handle very small percentages', () => {
      expect(formatPercentage(0.001)).toBe('+0.00%')
      expect(formatPercentage(-0.001)).toBe('-0.00%')
    })

    it('should handle very large percentages', () => {
      expect(formatPercentage(999.99)).toBe('+999.99%')
      expect(formatPercentage(-999.99)).toBe('-999.99%')
    })

    it('should handle edge cases', () => {
      expect(formatPercentage(Infinity)).toBe('+Infinity%')
      expect(formatPercentage(-Infinity)).toBe('-Infinity%')
      expect(formatPercentage(NaN)).toBe('NaN%')
    })
  })
})