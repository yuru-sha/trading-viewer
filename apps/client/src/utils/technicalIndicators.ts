import { PriceData } from './indicators'

export interface IndicatorValue {
  timestamp: number
  value: number
}

export interface MACDValue {
  timestamp: number
  macd: number
  signal: number
  histogram: number
}

export interface BollingerBandsValue {
  timestamp: number
  upper: number
  middle: number
  lower: number
}

// Simple Moving Average
export const calculateSMA = (data: PriceData[], period: number): IndicatorValue[] => {
  if (data.length < period) return []

  const result: IndicatorValue[] = []

  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0)
    const average = sum / period

    result.push({
      timestamp: data[i].timestamp,
      value: Number(average.toFixed(4)),
    })
  }

  return result
}

// Exponential Moving Average
export const calculateEMA = (data: PriceData[], period: number): IndicatorValue[] => {
  if (data.length < period) return []

  const result: IndicatorValue[] = []
  const multiplier = 2 / (period + 1)

  // First EMA value is SMA
  const firstSMA = data.slice(0, period).reduce((acc, curr) => acc + curr.close, 0) / period
  result.push({
    timestamp: data[period - 1].timestamp,
    value: Number(firstSMA.toFixed(4)),
  })

  // Calculate remaining EMA values
  for (let i = period; i < data.length; i++) {
    const ema =
      (data[i].close - result[result.length - 1].value) * multiplier +
      result[result.length - 1].value
    result.push({
      timestamp: data[i].timestamp,
      value: Number(ema.toFixed(4)),
    })
  }

  return result
}

// Relative Strength Index
export const calculateRSI = (data: PriceData[], period: number = 14): IndicatorValue[] => {
  if (data.length < period + 1) return []

  const result: IndicatorValue[] = []
  const gains: number[] = []
  const losses: number[] = []

  // Calculate initial gains and losses
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close
    gains.push(Math.max(change, 0))
    losses.push(Math.max(-change, 0))
  }

  // Calculate RSI for each point
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    const rsi = 100 - 100 / (1 + rs)

    result.push({
      timestamp: data[i + 1].timestamp,
      value: Number(rsi.toFixed(2)),
    })
  }

  return result
}

// MACD (Moving Average Convergence Divergence)
export const calculateMACD = (
  data: PriceData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDValue[] => {
  if (data.length < slowPeriod) return []

  const fastEMA = calculateEMA(data, fastPeriod)
  const slowEMA = calculateEMA(data, slowPeriod)

  if (fastEMA.length === 0 || slowEMA.length === 0) return []

  // Calculate MACD line
  const macdLine: IndicatorValue[] = []
  const minLength = Math.min(fastEMA.length, slowEMA.length)

  for (let i = 0; i < minLength; i++) {
    const fastIndex = fastEMA.length - minLength + i
    const slowIndex = slowEMA.length - minLength + i

    if (
      fastEMA[fastIndex] &&
      slowEMA[slowIndex] &&
      fastEMA[fastIndex].timestamp === slowEMA[slowIndex].timestamp
    ) {
      macdLine.push({
        timestamp: fastEMA[fastIndex].timestamp,
        value: fastEMA[fastIndex].value - slowEMA[slowIndex].value,
      })
    }
  }

  if (macdLine.length < signalPeriod) return []

  // Calculate signal line (EMA of MACD)
  const signalEMA = calculateEMA(
    macdLine.map(m => ({
      timestamp: m.timestamp,
      close: m.value,
      open: m.value,
      high: m.value,
      low: m.value,
      volume: 0,
    })),
    signalPeriod
  )

  // Combine MACD and signal
  const result: MACDValue[] = []
  const signalStartIndex = macdLine.length - signalEMA.length

  for (let i = 0; i < signalEMA.length; i++) {
    const macdIndex = signalStartIndex + i
    const macdValue = macdLine[macdIndex].value
    const signalValue = signalEMA[i].value

    result.push({
      timestamp: signalEMA[i].timestamp,
      macd: Number(macdValue.toFixed(4)),
      signal: Number(signalValue.toFixed(4)),
      histogram: Number((macdValue - signalValue).toFixed(4)),
    })
  }

  return result
}

// Bollinger Bands
export const calculateBollingerBands = (
  data: PriceData[],
  period: number = 20,
  standardDeviations: number = 2
): BollingerBandsValue[] => {
  if (data.length < period) return []

  const result: BollingerBandsValue[] = []

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1)
    const prices = slice.map(d => d.close)

    // Calculate middle line (SMA)
    const middle = prices.reduce((a, b) => a + b) / period

    // Calculate standard deviation
    const variance = prices.reduce((acc, price) => acc + Math.pow(price - middle, 2), 0) / period
    const stdDev = Math.sqrt(variance)

    result.push({
      timestamp: data[i].timestamp,
      upper: Number((middle + stdDev * standardDeviations).toFixed(4)),
      middle: Number(middle.toFixed(4)),
      lower: Number((middle - stdDev * standardDeviations).toFixed(4)),
    })
  }

  return result
}

// Volume Moving Average
export const calculateVolumeMA = (data: PriceData[], period: number): IndicatorValue[] => {
  if (data.length < period) return []

  const result: IndicatorValue[] = []

  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + (curr.volume || 0), 0)
    const average = sum / period

    result.push({
      timestamp: data[i].timestamp,
      value: Number(average.toFixed(0)),
    })
  }

  return result
}

// Helper function to get indicator color based on trend
export const getIndicatorColor = (values: IndicatorValue[], index: number): string => {
  if (index === 0) return '#6b7280' // gray for first value

  const current = values[index].value
  const previous = values[index - 1].value

  if (current > previous) return '#10b981' // green for uptrend
  if (current < previous) return '#ef4444' // red for downtrend
  return '#6b7280' // gray for no change
}

// Get MACD histogram color
export const getMACDHistogramColor = (histogram: number): string => {
  if (histogram > 0) return '#10b981' // green
  if (histogram < 0) return '#ef4444' // red
  return '#6b7280' // gray
}

// RSI signal interpretation
export const getRSISignal = (rsi: number): 'overbought' | 'oversold' | 'neutral' => {
  if (rsi >= 70) return 'overbought'
  if (rsi <= 30) return 'oversold'
  return 'neutral'
}
