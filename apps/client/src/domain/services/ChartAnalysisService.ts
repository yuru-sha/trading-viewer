import type { ChartData, ChartIndicator } from '@/domain/entities/Chart'

export interface ChartAnalysisService {
  calculateSMA(data: ChartData[], period: number): number[]
  calculateEMA(data: ChartData[], period: number): number[]
  calculateRSI(data: ChartData[], period: number): number[]
  calculateMACD(
    data: ChartData[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number
  ): {
    macd: number[]
    signal: number[]
    histogram: number[]
  }
  calculateBollingerBands(
    data: ChartData[],
    period: number,
    stdDev: number
  ): {
    upper: number[]
    middle: number[]
    lower: number[]
  }
  validateIndicatorParameters(indicator: ChartIndicator): boolean
}

export class ChartAnalysisServiceImpl implements ChartAnalysisService {
  calculateSMA(data: ChartData[], period: number): number[] {
    if (period <= 0 || period > data.length) {
      throw new Error(`Invalid SMA period: ${period}`)
    }

    const result: number[] = []

    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0)
      result.push(sum / period)
    }

    return result
  }

  calculateEMA(data: ChartData[], period: number): number[] {
    if (period <= 0 || period > data.length) {
      throw new Error(`Invalid EMA period: ${period}`)
    }

    const result: number[] = []
    const multiplier = 2 / (period + 1)

    // First value is SMA
    let ema = data.slice(0, period).reduce((acc, candle) => acc + candle.close, 0) / period
    result.push(ema)

    // Calculate EMA for remaining values
    for (let i = period; i < data.length; i++) {
      ema = data[i].close * multiplier + ema * (1 - multiplier)
      result.push(ema)
    }

    return result
  }

  calculateRSI(data: ChartData[], period: number): number[] {
    if (period <= 0 || period >= data.length) {
      throw new Error(`Invalid RSI period: ${period}`)
    }

    const result: number[] = []
    const gains: number[] = []
    const losses: number[] = []

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

    // Calculate RSI
    for (let i = period; i < gains.length; i++) {
      const rs = avgGain / avgLoss
      const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs)
      result.push(rsi)

      // Update averages using Wilder's smoothing
      avgGain = (avgGain * (period - 1) + gains[i]) / period
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period
    }

    return result
  }

  calculateMACD(
    data: ChartData[],
    fastPeriod: number,
    slowPeriod: number,
    signalPeriod: number
  ): { macd: number[]; signal: number[]; histogram: number[] } {
    if (fastPeriod >= slowPeriod) {
      throw new Error('Fast period must be less than slow period')
    }
    if (slowPeriod >= data.length) {
      throw new Error('Slow period exceeds data length')
    }

    const fastEMA = this.calculateEMA(data, fastPeriod)
    const slowEMA = this.calculateEMA(data, slowPeriod)

    // MACD line = Fast EMA - Slow EMA
    const macd: number[] = []
    const startIndex = slowPeriod - fastPeriod

    for (let i = 0; i < slowEMA.length; i++) {
      macd.push(fastEMA[i + startIndex] - slowEMA[i])
    }

    // Signal line = EMA of MACD
    const signal = this.calculateEMAFromValues(macd, signalPeriod)

    // Histogram = MACD - Signal
    const histogram: number[] = []
    const histogramStartIndex = signalPeriod - 1

    for (let i = 0; i < signal.length; i++) {
      histogram.push(macd[i + histogramStartIndex] - signal[i])
    }

    return { macd, signal, histogram }
  }

  calculateBollingerBands(
    data: ChartData[],
    period: number,
    stdDev: number
  ): { upper: number[]; middle: number[]; lower: number[] } {
    if (period <= 0 || period > data.length) {
      throw new Error(`Invalid Bollinger Bands period: ${period}`)
    }
    if (stdDev <= 0) {
      throw new Error(`Standard deviation must be positive: ${stdDev}`)
    }

    const middle = this.calculateSMA(data, period)
    const upper: number[] = []
    const lower: number[] = []

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1)
      const mean = middle[i - period + 1]

      // Calculate standard deviation
      const variance =
        slice.reduce((acc, candle) => {
          const diff = candle.close - mean
          return acc + diff * diff
        }, 0) / period

      const standardDeviation = Math.sqrt(variance)

      upper.push(mean + standardDeviation * stdDev)
      lower.push(mean - standardDeviation * stdDev)
    }

    return { upper, middle, lower }
  }

  validateIndicatorParameters(indicator: ChartIndicator): boolean {
    try {
      switch (indicator.type) {
        case 'sma':
        case 'ema': {
          const period = indicator.parameters.period as number
          return Number.isInteger(period) && period > 0 && period <= 200
        }

        case 'rsi': {
          const period = indicator.parameters.period as number
          return Number.isInteger(period) && period >= 2 && period <= 50
        }

        case 'macd': {
          const fastPeriod = indicator.parameters.fastPeriod as number
          const slowPeriod = indicator.parameters.slowPeriod as number
          const signalPeriod = indicator.parameters.signalPeriod as number

          return (
            Number.isInteger(fastPeriod) &&
            fastPeriod > 0 &&
            Number.isInteger(slowPeriod) &&
            slowPeriod > 0 &&
            Number.isInteger(signalPeriod) &&
            signalPeriod > 0 &&
            fastPeriod < slowPeriod
          )
        }

        case 'bollinger': {
          const period = indicator.parameters.period as number
          const stdDev = indicator.parameters.stdDev as number

          return (
            Number.isInteger(period) &&
            period > 0 &&
            period <= 50 &&
            typeof stdDev === 'number' &&
            stdDev > 0 &&
            stdDev <= 5
          )
        }

        default:
          return false
      }
    } catch {
      return false
    }
  }

  private calculateEMAFromValues(values: number[], period: number): number[] {
    if (period <= 0 || period > values.length) {
      throw new Error(`Invalid EMA period: ${period}`)
    }

    const result: number[] = []
    const multiplier = 2 / (period + 1)

    // First value is SMA
    let ema = values.slice(0, period).reduce((acc, val) => acc + val, 0) / period
    result.push(ema)

    // Calculate EMA for remaining values
    for (let i = period; i < values.length; i++) {
      ema = values[i] * multiplier + ema * (1 - multiplier)
      result.push(ema)
    }

    return result
  }
}

export class ChartPatternDetectionService {
  detectCandlestickPatterns(data: ChartData[]): PatternDetectionResult[] {
    const results: PatternDetectionResult[] = []

    for (let i = 2; i < data.length; i++) {
      const current = data[i]
      const previous = data[i - 1]
      const beforePrevious = data[i - 2]

      // Detect Doji
      if (this.isDoji(current)) {
        results.push({
          pattern: 'doji',
          index: i,
          confidence: this.calculateDojiConfidence(current),
          signal: 'neutral',
        })
      }

      // Detect Hammer
      if (this.isHammer(current)) {
        results.push({
          pattern: 'hammer',
          index: i,
          confidence: this.calculateHammerConfidence(current),
          signal: 'bullish',
        })
      }

      // Detect Shooting Star
      if (this.isShootingStar(current)) {
        results.push({
          pattern: 'shooting_star',
          index: i,
          confidence: this.calculateShootingStarConfidence(current),
          signal: 'bearish',
        })
      }

      // Detect Bullish Engulfing
      if (this.isBullishEngulfing(previous, current)) {
        results.push({
          pattern: 'bullish_engulfing',
          index: i,
          confidence: this.calculateEngulfingConfidence(previous, current),
          signal: 'bullish',
        })
      }

      // Detect Bearish Engulfing
      if (this.isBearishEngulfing(previous, current)) {
        results.push({
          pattern: 'bearish_engulfing',
          index: i,
          confidence: this.calculateEngulfingConfidence(previous, current),
          signal: 'bearish',
        })
      }

      // Three-candle patterns
      if (i >= 2) {
        // Morning Star
        if (this.isMorningStar(beforePrevious, previous, current)) {
          results.push({
            pattern: 'morning_star',
            index: i,
            confidence: this.calculateMorningStarConfidence(beforePrevious, previous, current),
            signal: 'bullish',
          })
        }

        // Evening Star
        if (this.isEveningStar(beforePrevious, previous, current)) {
          results.push({
            pattern: 'evening_star',
            index: i,
            confidence: this.calculateEveningStarConfidence(beforePrevious, previous, current),
            signal: 'bearish',
          })
        }
      }
    }

    return results
  }

  detectSupportResistance(
    data: ChartData[],
    lookbackPeriod: number = 20
  ): SupportResistanceLevel[] {
    const levels: SupportResistanceLevel[] = []

    for (let i = lookbackPeriod; i < data.length - lookbackPeriod; i++) {
      const current = data[i]
      const leftRange = data.slice(i - lookbackPeriod, i)
      const rightRange = data.slice(i + 1, i + lookbackPeriod + 1)

      // Check for resistance (local high)
      const isResistance =
        leftRange.every(candle => candle.high <= current.high) &&
        rightRange.every(candle => candle.high <= current.high)

      if (isResistance) {
        levels.push({
          level: current.high,
          type: 'resistance',
          strength: this.calculateLevelStrength(data, current.high, i, lookbackPeriod),
          index: i,
        })
      }

      // Check for support (local low)
      const isSupport =
        leftRange.every(candle => candle.low >= current.low) &&
        rightRange.every(candle => candle.low >= current.low)

      if (isSupport) {
        levels.push({
          level: current.low,
          type: 'support',
          strength: this.calculateLevelStrength(data, current.low, i, lookbackPeriod),
          index: i,
        })
      }
    }

    // Consolidate nearby levels
    return this.consolidateLevels(levels, data)
  }

  private isDoji(candle: ChartData): boolean {
    const bodySize = candle.getBodySize()
    const totalRange = candle.getPriceRange()
    return totalRange > 0 && bodySize / totalRange < 0.1
  }

  private isHammer(candle: ChartData): boolean {
    const bodySize = candle.getBodySize()
    const lowerShadow = candle.getLowerShadow()
    const upperShadow = candle.getUpperShadow()

    return lowerShadow >= bodySize * 2 && upperShadow <= bodySize * 0.5
  }

  private isShootingStar(candle: ChartData): boolean {
    const bodySize = candle.getBodySize()
    const lowerShadow = candle.getLowerShadow()
    const upperShadow = candle.getUpperShadow()

    return upperShadow >= bodySize * 2 && lowerShadow <= bodySize * 0.5
  }

  private isBullishEngulfing(previous: ChartData, current: ChartData): boolean {
    return (
      previous.isRed() &&
      current.isGreen() &&
      current.open < previous.close &&
      current.close > previous.open
    )
  }

  private isBearishEngulfing(previous: ChartData, current: ChartData): boolean {
    return (
      previous.isGreen() &&
      current.isRed() &&
      current.open > previous.close &&
      current.close < previous.open
    )
  }

  private isMorningStar(first: ChartData, second: ChartData, third: ChartData): boolean {
    return (
      first.isRed() &&
      this.isDoji(second) &&
      third.isGreen() &&
      second.close < first.close &&
      third.close > (first.open + first.close) / 2
    )
  }

  private isEveningStar(first: ChartData, second: ChartData, third: ChartData): boolean {
    return (
      first.isGreen() &&
      this.isDoji(second) &&
      third.isRed() &&
      second.close > first.close &&
      third.close < (first.open + first.close) / 2
    )
  }

  private calculateDojiConfidence(candle: ChartData): number {
    const bodyRatio = candle.getBodySize() / candle.getPriceRange()
    return Math.max(0, 100 - bodyRatio * 1000)
  }

  private calculateHammerConfidence(candle: ChartData): number {
    const bodySize = candle.getBodySize()
    const lowerShadow = candle.getLowerShadow()
    const shadowRatio = lowerShadow / bodySize
    return Math.min(100, shadowRatio * 20)
  }

  private calculateShootingStarConfidence(candle: ChartData): number {
    const bodySize = candle.getBodySize()
    const upperShadow = candle.getUpperShadow()
    const shadowRatio = upperShadow / bodySize
    return Math.min(100, shadowRatio * 20)
  }

  private calculateEngulfingConfidence(previous: ChartData, current: ChartData): number {
    const engulfingRatio = current.getBodySize() / previous.getBodySize()
    return Math.min(100, engulfingRatio * 30)
  }

  private calculateMorningStarConfidence(
    first: ChartData,
    second: ChartData,
    third: ChartData
  ): number {
    const gapDown = first.close - second.high
    const gapUp = third.low - second.high
    const confidence = ((gapDown + gapUp) / (first.getBodySize() + third.getBodySize())) * 100
    return Math.min(100, Math.max(0, confidence))
  }

  private calculateEveningStarConfidence(
    first: ChartData,
    second: ChartData,
    third: ChartData
  ): number {
    const gapUp = second.low - first.high
    const gapDown = second.low - third.high
    const confidence = ((gapUp + gapDown) / (first.getBodySize() + third.getBodySize())) * 100
    return Math.min(100, Math.max(0, confidence))
  }

  private calculateLevelStrength(
    data: ChartData[],
    level: number,
    index: number,
    lookback: number
  ): number {
    let touches = 0
    const tolerance = level * 0.01 // 1% tolerance

    // Count how many times price touched this level
    for (let i = Math.max(0, index - lookback); i < Math.min(data.length, index + lookback); i++) {
      if (i === index) continue

      const candle = data[i]
      if (
        (candle.high >= level - tolerance && candle.high <= level + tolerance) ||
        (candle.low >= level - tolerance && candle.low <= level + tolerance)
      ) {
        touches++
      }
    }

    return Math.min(100, touches * 20)
  }

  private consolidateLevels(
    levels: SupportResistanceLevel[],
    _data: ChartData[]
  ): SupportResistanceLevel[] {
    if (levels.length === 0) return []

    const consolidated: SupportResistanceLevel[] = []
    const sorted = levels.sort((a, b) => a.level - b.level)

    for (const level of sorted) {
      const nearby = consolidated.find(
        existing => Math.abs(existing.level - level.level) / level.level < 0.02 // 2% tolerance
      )

      if (nearby) {
        // Merge with existing level
        if (level.strength > nearby.strength) {
          nearby.level = level.level
          nearby.strength = level.strength
          nearby.index = level.index
        }
      } else {
        consolidated.push(level)
      }
    }

    return consolidated
  }
}

export type PatternDetectionResult = {
  pattern:
    | 'doji'
    | 'hammer'
    | 'shooting_star'
    | 'bullish_engulfing'
    | 'bearish_engulfing'
    | 'morning_star'
    | 'evening_star'
  index: number
  confidence: number
  signal: 'bullish' | 'bearish' | 'neutral'
}

export type SupportResistanceLevel = {
  level: number
  type: 'support' | 'resistance'
  strength: number
  index: number
}
