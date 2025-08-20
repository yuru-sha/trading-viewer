import { Candle } from '@prisma/client'

export interface IndicatorValue {
  timestamp: number
  value: number
}

export interface IndicatorResult {
  type: string
  name: string
  parameters: Record<string, any>
  values: IndicatorValue[]
}

export class IndicatorCalculationService {
  /**
   * Calculate Simple Moving Average (SMA)
   */
  calculateSMA(candles: Candle[], period: number): IndicatorValue[] {
    if (candles.length < period) {
      return []
    }

    const result: IndicatorValue[] = []

    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) {
        sum += candles[j].close
      }
      const average = sum / period

      result.push({
        timestamp: candles[i].timestamp,
        value: average,
      })
    }

    return result
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  calculateEMA(candles: Candle[], period: number): IndicatorValue[] {
    if (candles.length < period) {
      return []
    }

    const result: IndicatorValue[] = []
    const multiplier = 2 / (period + 1)

    // First EMA is simple average of first 'period' values
    let sum = 0
    for (let i = 0; i < period; i++) {
      sum += candles[i].close
    }
    let ema = sum / period

    result.push({
      timestamp: candles[period - 1].timestamp,
      value: ema,
    })

    // Calculate EMA for remaining values
    for (let i = period; i < candles.length; i++) {
      ema = (candles[i].close - ema) * multiplier + ema
      result.push({
        timestamp: candles[i].timestamp,
        value: ema,
      })
    }

    return result
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  calculateRSI(candles: Candle[], period: number = 14): IndicatorValue[] {
    if (candles.length < period + 1) {
      return []
    }

    const result: IndicatorValue[] = []
    const gains: number[] = []
    const losses: number[] = []

    // Calculate price changes
    for (let i = 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period

    for (let i = period; i < gains.length; i++) {
      // Calculate RS and RSI
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      const rsi = 100 - 100 / (1 + rs)

      result.push({
        timestamp: candles[i + 1].timestamp,
        value: rsi,
      })

      // Update average gain and loss for next iteration
      avgGain = (avgGain * (period - 1) + gains[i]) / period
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    }

    return result
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(
    candles: Candle[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macd: IndicatorValue[]; signal: IndicatorValue[]; histogram: IndicatorValue[] } {
    const fastEMA = this.calculateEMA(candles, fastPeriod)
    const slowEMA = this.calculateEMA(candles, slowPeriod)

    if (fastEMA.length === 0 || slowEMA.length === 0) {
      return { macd: [], signal: [], histogram: [] }
    }

    // Calculate MACD line
    const macdLine: IndicatorValue[] = []
    const minLength = Math.min(fastEMA.length, slowEMA.length)

    for (let i = 0; i < minLength; i++) {
      const fastIndex = fastEMA.length - minLength + i
      const slowIndex = slowEMA.length - minLength + i

      macdLine.push({
        timestamp: fastEMA[fastIndex].timestamp,
        value: fastEMA[fastIndex].value - slowEMA[slowIndex].value,
      })
    }

    // Calculate signal line (EMA of MACD)
    const signalLine = this.calculateEMAFromValues(macdLine, signalPeriod)

    // Calculate histogram
    const histogram: IndicatorValue[] = []
    const histMinLength = Math.min(macdLine.length, signalLine.length)

    for (let i = 0; i < histMinLength; i++) {
      const macdIndex = macdLine.length - histMinLength + i
      const signalIndex = signalLine.length - histMinLength + i

      histogram.push({
        timestamp: macdLine[macdIndex].timestamp,
        value: macdLine[macdIndex].value - signalLine[signalIndex].value,
      })
    }

    return {
      macd: macdLine,
      signal: signalLine,
      histogram,
    }
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(
    candles: Candle[],
    period: number = 20,
    standardDeviations: number = 2.1
  ): { 
    upper2: IndicatorValue[]; 
    upper1: IndicatorValue[]; 
    middle: IndicatorValue[]; 
    lower1: IndicatorValue[]; 
    lower2: IndicatorValue[] 
  } {
    if (candles.length < period) {
      return { upper2: [], upper1: [], middle: [], lower1: [], lower2: [] }
    }

    const middle: IndicatorValue[] = []
    const upper2: IndicatorValue[] = []
    const upper1: IndicatorValue[] = []
    const lower1: IndicatorValue[] = []
    const lower2: IndicatorValue[] = []

    for (let i = period - 1; i < candles.length; i++) {
      // Calculate SMA (middle band)
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) {
        sum += candles[j].close
      }
      const sma = sum / period

      // Calculate standard deviation
      let variance = 0
      for (let j = i - period + 1; j <= i; j++) {
        variance += Math.pow(candles[j].close - sma, 2)
      }
      const stdDev = Math.sqrt(variance / period)

      const timestamp = candles[i].timestamp

      middle.push({ timestamp, value: sma })
      // ±2σと±1σの両方を計算
      upper2.push({ timestamp, value: sma + standardDeviations * stdDev })
      upper1.push({ timestamp, value: sma + (standardDeviations / 2) * stdDev })
      lower1.push({ timestamp, value: sma - (standardDeviations / 2) * stdDev })
      lower2.push({ timestamp, value: sma - standardDeviations * stdDev })
    }

    return { upper2, upper1, middle, lower1, lower2 }
  }

  /**
   * Helper method to calculate EMA from indicator values
   */
  private calculateEMAFromValues(values: IndicatorValue[], period: number): IndicatorValue[] {
    if (values.length < period) {
      return []
    }

    const result: IndicatorValue[] = []
    const multiplier = 2 / (period + 1)

    // First EMA is simple average
    let sum = 0
    for (let i = 0; i < period; i++) {
      sum += values[i].value
    }
    let ema: number = sum / period

    result.push({
      timestamp: values[period - 1].timestamp,
      value: ema,
    })

    // Calculate EMA for remaining values
    for (let i = period; i < values.length; i++) {
      ema = (values[i].value - ema) * multiplier + ema
      result.push({
        timestamp: values[i].timestamp,
        value: ema,
      })
    }

    return result
  }

  /**
   * Calculate indicator based on type and parameters
   */
  calculateIndicator(
    type: string,
    candles: Candle[],
    parameters: Record<string, any>,
    name: string
  ): IndicatorResult {
    let values: IndicatorValue[] = []

    switch (type.toLowerCase()) {
      case 'sma':
        values = this.calculateSMA(candles, parameters.period || 20)
        break

      case 'ema':
        values = this.calculateEMA(candles, parameters.period || 20)
        break

      case 'rsi':
        values = this.calculateRSI(candles, parameters.period || 14)
        break

      case 'macd':
        const macdResult = this.calculateMACD(
          candles,
          parameters.fastPeriod || 12,
          parameters.slowPeriod || 26,
          parameters.signalPeriod || 9
        )
        // For simplicity, return just the MACD line
        // In a real implementation, you might want to return all three lines
        values = macdResult.macd
        break

      case 'bollinger':
        const bbResult = this.calculateBollingerBands(
          candles,
          parameters.period || 20,
          parameters.standardDeviations || 2.1
        )
        // Return all five bands as separate arrays
        values = {
          upper2: bbResult.upper2,
          upper1: bbResult.upper1, 
          middle: bbResult.middle,
          lower1: bbResult.lower1,
          lower2: bbResult.lower2
        }
        break

      default:
        throw new Error(`Unsupported indicator type: ${type}`)
    }

    return {
      type,
      name,
      parameters,
      values,
    }
  }
}
