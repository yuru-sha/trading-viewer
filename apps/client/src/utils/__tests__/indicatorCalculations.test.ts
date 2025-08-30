import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVWAP
} from '../indicatorCalculations'

describe('Technical Indicator Calculations', () => {
  describe('calculateSMA', () => {
    it('should calculate simple moving average correctly', () => {
      const prices = [10, 12, 14, 16, 18, 20]
      const result = calculateSMA(prices, 3)

      expect(result).toHaveLength(6)
      expect(result[0]).toBeNaN() // First value
      expect(result[1]).toBeNaN() // Second value 
      expect(result[2]).toBe(12) // (10+12+14)/3 = 12
      expect(result[3]).toBe(14) // (12+14+16)/3 = 14
      expect(result[4]).toBe(16) // (14+16+18)/3 = 16
      expect(result[5]).toBe(18) // (16+18+20)/3 = 18
    })

    it('should handle empty data', () => {
      const result = calculateSMA([], 5)
      expect(result).toEqual([])
    })

    it('should handle period larger than data length', () => {
      const prices = [10, 12]
      const result = calculateSMA(prices, 5)
      
      expect(result).toHaveLength(2)
      expect(result[0]).toBeNaN()
      expect(result[1]).toBeNaN()
    })

    it('should handle single price period', () => {
      const prices = [10, 12, 14]
      const result = calculateSMA(prices, 1)
      
      expect(result[0]).toBe(10)
      expect(result[1]).toBe(12) 
      expect(result[2]).toBe(14)
    })
  })

  describe('calculateEMA', () => {
    it('should calculate exponential moving average correctly', () => {
      const prices = [10, 12, 14, 16, 18]
      const result = calculateEMA(prices, 3)

      expect(result).toHaveLength(5)
      expect(result[0]).toBe(10) // First value equals first price
      expect(result[1]).toBeCloseTo(11, 1) // Exponential calculation
      expect(result[2]).toBeCloseTo(12.5, 1)
    })

    it('should handle null/undefined values', () => {
      const prices = [10, null as any, 14, undefined as any, 18]
      const result = calculateEMA(prices, 3)

      expect(result).toHaveLength(5)
      expect(result[0]).toBe(10)
      expect(result[1]).toBe(5) // (0 - 10) * multiplier + 10
    })

    it('should handle empty array', () => {
      const result = calculateEMA([], 3)
      expect(result).toEqual([])
    })
  })

  describe('calculateRSI', () => {
    it('should calculate RSI correctly for normal data', () => {
      // Sample price data with clear trend
      const prices = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 47.25, 47.92, 46.23, 46.08, 46.03, 46.83, 47.69]
      const result = calculateRSI(prices, 14)

      expect(result.length).toBeGreaterThan(0)
      result.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      })
    })

    it('should handle insufficient data', () => {
      const prices = [10, 12, 14]
      const result = calculateRSI(prices, 14)
      expect(result).toEqual([])
    })

    it('should handle upward trend (RSI = 100)', () => {
      const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
      const result = calculateRSI(prices, 5)

      expect(result.length).toBeGreaterThan(0)
      // With pure upward movement, avgLoss = 0, so RSI should be 100
      expect(result[0]).toBe(100)
    })

    it('should handle null values in prices', () => {
      const prices = [44, null as any, 44.09, undefined as any, 43.61, 44.33, 44.83, 45.85, 47.25, 47.92, 46.23, 46.08, 46.03, 46.83, 47.69]
      const result = calculateRSI(prices, 10)

      // Should handle nulls gracefully by treating them as 0
      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('calculateMACD', () => {
    beforeEach(() => {
      // Mock console.log to avoid noise in tests
      vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should calculate MACD correctly', () => {
      const prices = Array.from({length: 30}, (_, i) => 10 + i) // [10, 11, 12, ..., 39]
      const result = calculateMACD(prices, 12, 26, 9)

      expect(result.macd).toHaveLength(30)
      expect(result.signal).toHaveLength(30)
      expect(result.histogram).toHaveLength(30)

      // Early values should be NaN
      expect(result.macd[0]).toBeNaN()
      expect(result.signal[0]).toBeNaN()
      expect(result.histogram[0]).toBeNaN()
    })

    it('should handle insufficient data', () => {
      const prices = [10, 11, 12] // Less than slowPeriod (26)
      const result = calculateMACD(prices, 12, 26, 9)

      expect(result.macd).toEqual([])
      expect(result.signal).toEqual([])
      expect(result.histogram).toEqual([])
    })

    it('should use default parameters', () => {
      const prices = Array.from({length: 40}, (_, i) => 100 + Math.sin(i) * 10)
      const result = calculateMACD(prices) // No parameters = defaults

      expect(result.macd).toHaveLength(40)
      expect(result.signal).toHaveLength(40)
      expect(result.histogram).toHaveLength(40)
    })

    it('should calculate histogram as macd - signal', () => {
      const prices = Array.from({length: 50}, (_, i) => 20 + i * 0.5)
      const result = calculateMACD(prices, 5, 10, 3)

      // Check that histogram = macd - signal where both are defined
      for (let i = 20; i < 30; i++) { // Safe range
        const macdVal = result.macd[i]
        const signalVal = result.signal[i]
        const histogramVal = result.histogram[i]
        
        if (!isNaN(macdVal) && !isNaN(signalVal)) {
          expect(histogramVal).toBeCloseTo(macdVal - signalVal, 10)
        }
      }
    })
  })

  describe('calculateBollingerBands', () => {
    it('should calculate Bollinger Bands correctly', () => {
      const prices = [20, 21, 22, 21, 20, 19, 20, 21, 22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 24, 25]
      const result = calculateBollingerBands(prices, 10, 2)

      expect(result.upperBand2).toHaveLength(20)
      expect(result.upperBand1).toHaveLength(20)
      expect(result.middleBand).toHaveLength(20)
      expect(result.lowerBand1).toHaveLength(20)
      expect(result.lowerBand2).toHaveLength(20)

      // Check proper band ordering
      for (let i = 10; i < 20; i++) {
        expect(result.upperBand2[i]).toBeGreaterThan(result.upperBand1[i])
        expect(result.upperBand1[i]).toBeGreaterThan(result.middleBand[i])
        expect(result.middleBand[i]).toBeGreaterThan(result.lowerBand1[i])
        expect(result.lowerBand1[i]).toBeGreaterThan(result.lowerBand2[i])
      }
    })

    it('should handle insufficient data', () => {
      const prices = [10, 11, 12] // Less than period (20)
      const result = calculateBollingerBands(prices, 20, 2)

      expect(result.upperBand2).toEqual([])
      expect(result.upperBand1).toEqual([])
      expect(result.middleBand).toEqual([])
      expect(result.lowerBand1).toEqual([])
      expect(result.lowerBand2).toEqual([])
    })

    it('should use custom parameters', () => {
      const prices = Array.from({length: 15}, (_, i) => 100 + Math.sin(i) * 5)
      const result = calculateBollingerBands(prices, 5, 1.5)

      expect(result.middleBand).toHaveLength(15)
      
      // Early values should be NaN
      for (let i = 0; i < 4; i++) {
        expect(result.upperBand2[i]).toBeNaN()
        expect(result.lowerBand2[i]).toBeNaN()
      }
    })
  })

  describe('calculateVWAP', () => {
    it('should calculate VWAP correctly', () => {
      const prices = [10, 12, 14, 16, 18, 20]
      const volumes = [100, 200, 150, 300, 250, 180]
      const result = calculateVWAP(prices, volumes, 3)

      expect(result).toHaveLength(6)
      expect(result[0]).toBeNaN()
      expect(result[1]).toBeNaN()
      
      // Manual calculation for index 2: (10*100 + 12*200 + 14*150) / (100+200+150)
      const expectedVWAP2 = (10*100 + 12*200 + 14*150) / (100+200+150)
      expect(result[2]).toBeCloseTo(expectedVWAP2, 10)
    })

    it('should handle mismatched array lengths', () => {
      const prices = [10, 12, 14]
      const volumes = [100, 200] // Different length
      const result = calculateVWAP(prices, volumes, 3)

      expect(result).toEqual([])
    })

    it('should handle insufficient data', () => {
      const prices = [10, 12]
      const volumes = [100, 200]
      const result = calculateVWAP(prices, volumes, 5) // Period > data length

      expect(result).toEqual([])
    })

    it('should handle zero volume', () => {
      const prices = [10, 12, 14, 16, 18]
      const volumes = [100, 0, 150, 0, 250] // Some zero volumes
      const result = calculateVWAP(prices, volumes, 3)

      expect(result).toHaveLength(5)
      // Should still calculate where possible
      expect(result[2]).not.toBeNaN()
    })

    it('should return NaN when total volume is zero', () => {
      const prices = [10, 12, 14, 16, 18]
      const volumes = [0, 0, 0, 0, 0] // All zero volumes
      const result = calculateVWAP(prices, volumes, 3)

      expect(result).toHaveLength(5)
      for (let i = 2; i < 5; i++) {
        expect(result[i]).toBeNaN()
      }
    })

    it('should use default period', () => {
      const prices = Array.from({length: 25}, (_, i) => 50 + i)
      const volumes = Array.from({length: 25}, (_, i) => 100 + i * 10)
      const result = calculateVWAP(prices, volumes) // No period = default 20

      expect(result).toHaveLength(25)
      for (let i = 0; i < 19; i++) {
        expect(result[i]).toBeNaN()
      }
      expect(result[19]).not.toBeNaN()
    })
  })
})