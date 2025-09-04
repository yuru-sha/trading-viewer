import type { ChartAnalysisService } from '@/domain/services/ChartAnalysisService'
import type { ChartData, ChartIndicator } from '@/domain/entities/Chart'

export class ChartAnalysisServiceImpl implements ChartAnalysisService {
  calculateSMA(data: ChartData[], period: number): number[] {
    const result: number[] = []

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN)
        continue
      }

      const sum = data.slice(i - period + 1, i + 1).reduce((acc, item) => acc + item.close, 0)
      result.push(sum / period)
    }

    return result
  }

  calculateEMA(data: ChartData[], period: number): number[] {
    const result: number[] = []
    const multiplier = 2 / (period + 1)

    // First EMA is SMA
    const firstSMA = data.slice(0, period).reduce((acc, item) => acc + item.close, 0) / period

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN)
        continue
      }

      if (i === period - 1) {
        result.push(firstSMA)
        continue
      }

      const ema = (data[i].close - result[i - 1]) * multiplier + result[i - 1]
      result.push(ema)
    }

    return result
  }

  calculateRSI(data: ChartData[], period: number): number[] {
    const result: number[] = []
    const gains: number[] = []
    const losses: number[] = []

    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push(NaN)
        continue
      }

      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period

      if (avgLoss === 0) {
        result.push(100)
        continue
      }

      const rs = avgGain / avgLoss
      const rsi = 100 - 100 / (1 + rs)
      result.push(rsi)
    }

    return result
  }

  calculateMACD(data: ChartData[], fastPeriod: number, slowPeriod: number, signalPeriod: number) {
    const fastEMA = this.calculateEMA(data, fastPeriod)
    const slowEMA = this.calculateEMA(data, slowPeriod)

    const macd = fastEMA.map((fast, i) =>
      isNaN(fast) || isNaN(slowEMA[i]) ? NaN : fast - slowEMA[i]
    )

    // Create data for signal line calculation
    const macdData = macd
      .map((value, i) => ({
        timestamp: data[i]?.timestamp || 0,
        open: value,
        high: value,
        low: value,
        close: value,
        volume: 0,
      }))
      .filter(item => !isNaN(item.close))

    const signal = this.calculateEMA(macdData, signalPeriod)

    // Pad signal array to match original length
    const paddedSignal = new Array(data.length - macdData.length).fill(NaN).concat(signal)

    const histogram = macd.map((macdValue, i) =>
      isNaN(macdValue) || isNaN(paddedSignal[i]) ? NaN : macdValue - paddedSignal[i]
    )

    return {
      macd,
      signal: paddedSignal,
      histogram,
    }
  }

  calculateBollingerBands(data: ChartData[], period: number, stdDev: number) {
    const sma = this.calculateSMA(data, period)
    const upper: number[] = []
    const lower: number[] = []

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(NaN)
        lower.push(NaN)
        continue
      }

      const slice = data.slice(i - period + 1, i + 1)
      const variance =
        slice.reduce((acc, item) => acc + Math.pow(item.close - sma[i], 2), 0) / period

      const standardDeviation = Math.sqrt(variance)

      upper.push(sma[i] + standardDeviation * stdDev)
      lower.push(sma[i] - standardDeviation * stdDev)
    }

    return {
      upper,
      middle: sma,
      lower,
    }
  }

  validateIndicatorParameters(indicator: ChartIndicator): boolean {
    switch (indicator.type) {
      case 'sma':
      case 'ema':
      case 'rsi':
        return typeof indicator.parameters.period === 'number' && indicator.parameters.period > 0

      case 'macd':
        return (
          typeof indicator.parameters.fastPeriod === 'number' &&
          typeof indicator.parameters.slowPeriod === 'number' &&
          typeof indicator.parameters.signalPeriod === 'number' &&
          indicator.parameters.fastPeriod > 0 &&
          indicator.parameters.slowPeriod > 0 &&
          indicator.parameters.signalPeriod > 0 &&
          indicator.parameters.fastPeriod < indicator.parameters.slowPeriod
        )

      case 'bollinger':
        return (
          typeof indicator.parameters.period === 'number' &&
          typeof indicator.parameters.stdDev === 'number' &&
          indicator.parameters.period > 0 &&
          indicator.parameters.stdDev > 0
        )

      default:
        return false
    }
  }
}
