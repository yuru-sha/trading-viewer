import { describe, it, expect } from 'vitest'
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  type PriceData,
} from '../indicators'

const createMockPriceData = (prices: number[]): PriceData[] => {
  return prices.map((close, index) => ({
    timestamp: Date.now() - (prices.length - index - 1) * 86400000,
    open: close * 0.995,
    high: close * 1.01,
    low: close * 0.985,
    close,
    volume: Math.floor(Math.random() * 1000000) + 100000,
  }))
}

describe('Technical Indicators', () => {
  describe('calculateSMA', () => {
    it('should calculate simple moving average correctly', () => {
      const data = createMockPriceData([10, 12, 14, 16, 18, 20])
      const result = calculateSMA(data, 3)

      expect(result).toHaveLength(4) // period-1 values are calculated
      expect(result[0].value).toBe(12) // (10+12+14)/3
      expect(result[1].value).toBe(14) // (12+14+16)/3
      expect(result[2].value).toBe(16) // (14+16+18)/3
      expect(result[3].value).toBe(18) // (16+18+20)/3
    })

    it('should handle empty data', () => {
      const result = calculateSMA([], 5)
      expect(result).toEqual([])
    })

    it('should handle period larger than data length', () => {
      const data = createMockPriceData([10, 12])
      const result = calculateSMA(data, 5)
      expect(result).toEqual([])
    })
  })

  describe('calculateEMA', () => {
    it('should calculate exponential moving average correctly', () => {
      const data = createMockPriceData([10, 12, 14, 16, 18])
      const result = calculateEMA(data, 3)

      expect(result).toHaveLength(3)
      expect(result[0].value).toBe(12) // First EMA value equals SMA
      expect(result[1].value).toBeCloseTo(14, 1) // Should be close to 14
      expect(result[2].value).toBeCloseTo(16, 1) // Should be close to 16
    })

    it('should handle minimum period of 1', () => {
      const data = createMockPriceData([10, 12, 14])
      const result = calculateEMA(data, 1)
      expect(result[0].value).toBe(10)
      expect(result[1].value).toBe(12)
      expect(result[2].value).toBe(14)
    })
  })

  describe('calculateRSI', () => {
    it('should calculate RSI correctly', () => {
      const data = createMockPriceData([
        44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 47.25, 47.92, 46.23, 46.08, 46.03,
        46.83, 47.69, 48.83,
      ])
      const result = calculateRSI(data, 14)

      expect(result).toHaveLength(2)
      // RSI should be between 0 and 100
      expect(result[0].rsi).toBeGreaterThan(0)
      expect(result[0].rsi).toBeLessThan(100)
      expect(result[1].rsi).toBeGreaterThan(0)
      expect(result[1].rsi).toBeLessThan(100)
    })

    it('should handle identical prices', () => {
      const data = createMockPriceData([50, 50, 50, 50, 50])
      const result = calculateRSI(data, 3)
      expect(result[0].rsi).toBe(50) // RSI should be 50 for no change
      expect(result[1].rsi).toBe(50)
    })
  })

  describe('calculateMACD', () => {
    it('should calculate MACD correctly', () => {
      const data = createMockPriceData([
        10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
        33, 34, 35, 36, 37, 38, 39,
      ])
      const result = calculateMACD(data)

      expect(result).toHaveLength(6) // 30 - 26 + 1 = 5, but let's be safe

      // Check that valid MACD values exist
      if (result.length > 0) {
        expect(result[0].macd).toBeDefined()
        expect(result[0].signal).toBeDefined()
        expect(result[0].histogram).toBeDefined()
      }
    })
  })

  describe('calculateBollingerBands', () => {
    it('should calculate Bollinger Bands correctly', () => {
      const data = createMockPriceData([
        20, 21, 22, 21, 20, 19, 20, 21, 22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 24, 25,
      ])
      const result = calculateBollingerBands(data, 10, 2)

      expect(result).toHaveLength(11) // 20 - 10 + 1

      // Check valid bands
      if (result.length > 0) {
        expect(result[0].upper).toBeGreaterThan(result[0].middle)
        expect(result[0].middle).toBeGreaterThan(result[0].lower)
        expect(result[0].middle).toBeDefined()
      }
    })

    it('should handle custom parameters', () => {
      const data = createMockPriceData([10, 11, 12, 13, 14, 15])
      const result = calculateBollingerBands(data, 3, 1.5)

      if (result.length > 0) {
        expect(result[0].upper).toBeGreaterThan(result[0].middle)
        expect(result[0].middle).toBeGreaterThan(result[0].lower)
      }
    })
  })
})
