import { describe, it, expect, beforeEach } from 'vitest'
import { IndicatorCalculationService } from '../../application/services/IndicatorCalculationService'
import type { Candle } from '@prisma/client'

// Helper function to create mock candles
const createMockCandles = (prices: number[]): Candle[] => {
  return prices.map((price, index) => ({
    id: `candle-${index}`,
    symbol: 'TEST',
    timestamp: new Date(Date.now() + index * 60000), // 1 minute intervals
    open: price - 0.5,
    high: price + 1,
    low: price - 1,
    close: price,
    volume: 1000000,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}

describe('IndicatorCalculationService', () => {
  let service: IndicatorCalculationService

  beforeEach(() => {
    service = new IndicatorCalculationService()
  })

  describe('calculateSMA', () => {
    it('should calculate Simple Moving Average correctly', () => {
      const candles = createMockCandles([10, 12, 14, 16, 18, 20, 22, 24, 26, 28])
      const period = 5

      const result = service.calculateSMA(candles, period)

      expect(result).toHaveLength(6) // 10 - 5 + 1 = 6 values
      expect(result[0].value).toBe(14) // (10+12+14+16+18)/5
      expect(result[1].value).toBe(16) // (12+14+16+18+20)/5
      expect(result[5].value).toBe(24) // (20+22+24+26+28)/5
    })

    it('should return empty array when candles length is less than period', () => {
      const candles = createMockCandles([10, 12, 14])
      const period = 5

      const result = service.calculateSMA(candles, period)

      expect(result).toHaveLength(0)
    })

    it('should handle single period correctly', () => {
      const candles = createMockCandles([10])
      const period = 1

      const result = service.calculateSMA(candles, period)

      expect(result).toHaveLength(1)
      expect(result[0].value).toBe(10)
    })
  })

  describe('calculateEMA', () => {
    it('should calculate Exponential Moving Average correctly', () => {
      const candles = createMockCandles([10, 12, 14, 16, 18, 20])
      const period = 3

      const result = service.calculateEMA(candles, period)

      expect(result).toHaveLength(4) // 6 - 3 + 1 = 4 values
      expect(result[0].value).toBe(12) // First EMA = SMA of first 3 values

      // Subsequent values should use EMA formula
      expect(result[1].value).toBeCloseTo(14, 1) // More recent values weighted more
      expect(result[3].value).toBeCloseTo(18, 1) // Final EMA value should be closer to recent price
    })

    it('should return empty array when candles length is less than period', () => {
      const candles = createMockCandles([10, 12])
      const period = 5

      const result = service.calculateEMA(candles, period)

      expect(result).toHaveLength(0)
    })

    it('should handle minimum period correctly', () => {
      const candles = createMockCandles([10, 15, 20])
      const period = 2

      const result = service.calculateEMA(candles, period)

      expect(result).toHaveLength(2)
      expect(result[0].value).toBe(12.5) // SMA of first 2 values
    })
  })

  describe('calculateRSI', () => {
    it('should calculate RSI correctly with typical price movements', () => {
      // Price series that goes up and down to test RSI calculation - need period+1 data points
      const candles = createMockCandles([
        44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89, 46.03, 46.83, 47.69,
        46.49, 46.26, 47.0,
      ])
      const period = 14

      const result = service.calculateRSI(candles, period)

      expect(result).toHaveLength(1) // Only one RSI value for this data
      expect(result[0].value).toBeGreaterThan(0)
      expect(result[0].value).toBeLessThan(100)
      expect(result[0].value).toBeCloseTo(66, 1) // Should be around 66 for this trend
    })

    it('should return empty array when insufficient data', () => {
      const candles = createMockCandles([10, 12, 14])
      const period = 14

      const result = service.calculateRSI(candles, period)

      expect(result).toHaveLength(0)
    })

    it('should handle edge case where all gains or all losses', () => {
      // All increasing prices (all gains, no losses) - need period+1 data points
      const candles = createMockCandles([
        10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      ])
      const period = 14

      const result = service.calculateRSI(candles, period)

      expect(result).toHaveLength(1)
      expect(result[0].value).toBeCloseTo(99, 0) // Should be close to 100 when minimal losses
    })
  })

  describe('calculateMACD', () => {
    it('should calculate MACD with default parameters', () => {
      const candles = createMockCandles(
        Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.1) * 10)
      )

      const result = service.calculateMACD(candles)

      expect(result.macd.length).toBeGreaterThan(0)
      expect(result.signal.length).toBeGreaterThan(0)
      expect(result.histogram.length).toBeGreaterThan(0)

      // Check that all arrays have IndicatorValue structure
      result.macd.forEach(point => {
        expect(point).toHaveProperty('timestamp')
        expect(point).toHaveProperty('value')
        expect(typeof point.value).toBe('number')
      })
    })

    it('should calculate MACD with custom parameters', () => {
      const candles = createMockCandles(Array.from({ length: 30 }, (_, i) => 50 + i))
      const fastPeriod = 5
      const slowPeriod = 10
      const signalPeriod = 3

      const result = service.calculateMACD(candles, fastPeriod, slowPeriod, signalPeriod)

      expect(result.macd.length).toBeGreaterThan(0)
      expect(result.signal.length).toBeGreaterThan(0)
      expect(result.histogram.length).toBeGreaterThan(0)
    })

    it('should return empty arrays when insufficient data', () => {
      const candles = createMockCandles([10, 12, 14])

      const result = service.calculateMACD(candles)

      expect(result.macd).toHaveLength(0)
      expect(result.signal).toHaveLength(0)
      expect(result.histogram).toHaveLength(0)
    })
  })

  describe('calculateBollingerBands', () => {
    it('should calculate Bollinger Bands correctly', () => {
      const candles = createMockCandles([
        20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
      ])
      const period = 10
      const standardDeviations = 2

      const result = service.calculateBollingerBands(candles, period, standardDeviations)

      expect(result.middle.length).toBe(candles.length - period + 1)
      expect(result.upper2.length).toBe(candles.length - period + 1)
      expect(result.lower2.length).toBe(candles.length - period + 1)

      // Check structure of result
      expect(result).toHaveProperty('upper2')
      expect(result).toHaveProperty('upper1')
      expect(result).toHaveProperty('middle')
      expect(result).toHaveProperty('lower1')
      expect(result).toHaveProperty('lower2')

      // Check that bands are in correct order
      for (let i = 0; i < result.middle.length; i++) {
        expect(result.upper2[i].value).toBeGreaterThan(result.upper1[i].value)
        expect(result.upper1[i].value).toBeGreaterThan(result.middle[i].value)
        expect(result.middle[i].value).toBeGreaterThan(result.lower1[i].value)
        expect(result.lower1[i].value).toBeGreaterThan(result.lower2[i].value)
      }
    })

    it('should handle custom standard deviations correctly', () => {
      const candles = createMockCandles([10, 12, 14, 16, 18, 20, 22, 24, 26, 28])
      const period = 5
      const stdDev1 = 1.0
      const stdDev2 = 2.0

      const result1 = service.calculateBollingerBands(candles, period, stdDev1)
      const result2 = service.calculateBollingerBands(candles, period, stdDev2)

      expect(result1.middle.length).toBe(result2.middle.length)

      // With higher standard deviation, bands should be wider
      for (let i = 0; i < result1.middle.length; i++) {
        const band1 = result1.upper2[i].value - result1.lower2[i].value
        const band2 = result2.upper2[i].value - result2.lower2[i].value
        expect(band2).toBeGreaterThan(band1)
      }
    })

    it('should return empty arrays when insufficient data', () => {
      const candles = createMockCandles([10, 12])
      const period = 5

      const result = service.calculateBollingerBands(candles, period)

      expect(result.upper2).toHaveLength(0)
      expect(result.middle).toHaveLength(0)
      expect(result.lower2).toHaveLength(0)
    })
  })

  describe('calculateIndicator', () => {
    const sampleCandles = createMockCandles([10, 12, 14, 16, 18, 20, 22, 24, 26, 28])

    it('should calculate SMA indicator', () => {
      const result = service.calculateIndicator('sma', sampleCandles, { period: 5 }, 'SMA-5')

      expect(result.values.length).toBe(6)
      expect(result.values[0].value).toBe(14)
      expect(result.type).toBe('sma')
      expect(result.name).toBe('SMA-5')
    })

    it('should calculate EMA indicator', () => {
      const result = service.calculateIndicator('ema', sampleCandles, { period: 5 }, 'EMA-5')

      expect(result.values.length).toBe(6)
      expect(result.values[0].value).toBe(14) // First value should be SMA
      expect(result.type).toBe('ema')
    })

    it('should calculate RSI indicator', () => {
      const longCandles = createMockCandles(
        Array.from({ length: 20 }, (_, i) => 100 + Math.sin(i * 0.3) * 10)
      )
      const result = service.calculateIndicator('rsi', longCandles, { period: 14 }, 'RSI-14')

      expect(result.values.length).toBeGreaterThan(0)
      result.values.forEach(point => {
        expect(point.value).toBeGreaterThanOrEqual(0)
        expect(point.value).toBeLessThanOrEqual(100)
      })
    })

    it('should calculate MACD indicator', () => {
      const longCandles = createMockCandles(Array.from({ length: 50 }, (_, i) => 100 + i * 0.5))
      const result = service.calculateIndicator('macd', longCandles, {}, 'MACD')

      expect(result.values.length).toBeGreaterThan(0)
      // MACD returns just the MACD line values
      result.values.forEach(point => {
        expect(typeof point.value).toBe('number')
      })
    })

    it('should calculate Bollinger Bands indicator', () => {
      const result = service.calculateIndicator(
        'bollinger',
        sampleCandles,
        { period: 5, standardDeviations: 2 },
        'BB'
      )

      expect(result.values.length).toBe(6)
      // Bollinger implementation returns upper2 array as values
      result.values.forEach(point => {
        expect(typeof point.value).toBe('number')
      })
    })

    it('should throw error for unknown indicator type', () => {
      expect(() => {
        service.calculateIndicator('unknown' as any, sampleCandles, {}, 'Unknown')
      }).toThrow('Unsupported indicator type: unknown')
    })

    it('should use default parameters when missing', () => {
      const result = service.calculateIndicator('sma', sampleCandles, {}, 'SMA-Default')

      // Should use default period of 20, but we only have 10 candles, so empty result
      expect(result.values).toHaveLength(0)
    })
  })
})
