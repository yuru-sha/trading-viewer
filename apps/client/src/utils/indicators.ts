// Technical Indicators Utility Functions

export interface PriceData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface IndicatorValue {
  timestamp: number
  value: number
}

export interface MACDResult {
  timestamp: number
  macd: number
  signal: number
  histogram: number
}

export interface BollingerBandsResult {
  timestamp: number
  upper2: number
  upper1: number
  middle: number
  lower1: number
  lower2: number
}

export interface RSIResult {
  timestamp: number
  rsi: number
}

/**
 * Simple Moving Average (SMA)
 */
export const calculateSMA = (data: PriceData[], period: number): IndicatorValue[] => {
  if (data.length < period) return []

  const result: IndicatorValue[] = []

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j]?.close ?? 0
    }

    result.push({
      timestamp: data[i]?.timestamp ?? 0,
      value: sum / period,
    })
  }

  return result
}

/**
 * Exponential Moving Average (EMA)
 */
export const calculateEMA = (data: PriceData[], period: number): IndicatorValue[] => {
  if (data.length < period) return []

  const result: IndicatorValue[] = []
  const multiplier = 2 / (period + 1)

  // First EMA value is SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += data[i]?.close ?? 0
  }
  let ema = sum / period

  result.push({
    timestamp: data[period - 1]?.timestamp ?? 0,
    value: ema,
  })

  // Calculate subsequent EMA values
  for (let i = period; i < data.length; i++) {
    ema = ((data[i]?.close ?? 0) - ema) * multiplier + ema
    result.push({
      timestamp: data[i]?.timestamp ?? 0,
      value: ema,
    })
  }

  return result
}

/**
 * Relative Strength Index (RSI)
 */
export const calculateRSI = (data: PriceData[], period: number = 14): RSIResult[] => {
  if (data.length < period + 1) return []

  const result: RSIResult[] = []
  const gains: number[] = []
  const losses: number[] = []

  // Calculate initial gains and losses
  for (let i = 1; i < period + 1; i++) {
    if (!data[i] || !data[i - 1]) continue
    const change = data[i]!.close - data[i - 1]!.close
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  // Calculate initial averages
  let avgGain = gains.reduce((a, b) => a + b) / period
  let avgLoss = losses.reduce((a, b) => a + b) / period

  // Calculate RSI for the first valid point
  let rs = avgGain / avgLoss
  let rsi = 100 - 100 / (1 + rs)

  if (data[period]) {
    result.push({
      timestamp: data[period].timestamp,
      rsi,
    })
  }

  // Calculate subsequent RSI values using smoothed averages
  for (let i = period + 1; i < data.length; i++) {
    if (!data[i] || !data[i - 1]) continue
    const change = data[i]!.close - data[i - 1]!.close
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    rs = avgGain / avgLoss
    rsi = 100 - 100 / (1 + rs)

    result.push({
      timestamp: data[i]!.timestamp,
      rsi,
    })
  }

  return result
}

/**
 * Moving Average Convergence Divergence (MACD)
 */
export const calculateMACD = (
  data: PriceData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult[] => {
  if (data.length < slowPeriod) return []

  const fastEMA = calculateEMA(data, fastPeriod)
  const slowEMA = calculateEMA(data, slowPeriod)

  if (fastEMA.length === 0 || slowEMA.length === 0) return []

  // Calculate MACD line
  const macdLine: IndicatorValue[] = []
  const startIndex = slowPeriod - fastPeriod

  for (let i = 0; i < slowEMA.length; i++) {
    const fastValue = fastEMA[i + startIndex]?.value
    const slowValue = slowEMA[i]?.value ?? 0

    if (fastValue !== undefined) {
      macdLine.push({
        timestamp: slowEMA[i]?.timestamp ?? 0,
        value: fastValue - slowValue,
      })
    }
  }

  // Calculate signal line (EMA of MACD)
  const signalEMA = calculateEMA(
    macdLine.map(m => ({
      open: data[0]?.open ?? 0,
      high: data[0]?.high ?? 0,
      low: data[0]?.low ?? 0,
      close: m.value,
      timestamp: m.timestamp,
    })),
    signalPeriod
  )

  // Combine MACD and signal
  const result: MACDResult[] = []
  const signalStartIndex = signalPeriod - 1

  for (let i = signalStartIndex; i < macdLine.length; i++) {
    const signalIndex = i - signalStartIndex
    if (signalIndex < signalEMA.length) {
      const macdValue = macdLine[i]?.value ?? 0
      const signalValue = signalEMA[signalIndex]?.value ?? 0

      result.push({
        timestamp: macdLine[i]?.timestamp ?? 0,
        macd: macdValue,
        signal: signalValue,
        histogram: macdValue - signalValue,
      })
    }
  }

  return result
}

/**
 * Bollinger Bands
 */
export const calculateBollingerBands = (
  data: PriceData[],
  period: number = 20,
  standardDeviations: number = 2.1
): BollingerBandsResult[] => {
  if (data.length < period) return []

  const sma = calculateSMA(data, period)
  const result: BollingerBandsResult[] = []

  for (let i = 0; i < sma.length; i++) {
    const dataIndex = i + period - 1
    const middleBand = sma[i]?.value ?? 0

    // Calculate standard deviation
    let sumSquaredDiff = 0
    for (let j = 0; j < period; j++) {
      const diff = (data[dataIndex - j]?.close ?? 0) - middleBand
      sumSquaredDiff += diff * diff
    }
    const stdDev = Math.sqrt(sumSquaredDiff / period)

    result.push({
      timestamp: data[dataIndex]?.timestamp ?? 0,
      upper2: middleBand + standardDeviations * stdDev,
      upper1: middleBand + (standardDeviations / 2) * stdDev,
      middle: middleBand,
      lower1: middleBand - (standardDeviations / 2) * stdDev,
      lower2: middleBand - standardDeviations * stdDev,
    })
  }

  return result
}

/**
 * Volume Moving Average
 */
export const calculateVolumeMA = (data: PriceData[], period: number): IndicatorValue[] => {
  if (data.length < period) return []

  const result: IndicatorValue[] = []

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j]?.volume || 0
    }

    result.push({
      timestamp: data[i]?.timestamp ?? 0,
      value: sum / period,
    })
  }

  return result
}

/**
 * Support and Resistance Levels
 */
export const calculateSupportResistance = (
  data: PriceData[],
  lookback: number = 20
): {
  support: number[]
  resistance: number[]
} => {
  if (data.length < lookback * 2) return { support: [], resistance: [] }

  const support: number[] = []
  const resistance: number[] = []

  for (let i = lookback; i < data.length - lookback; i++) {
    const current = data[i]
    if (!current) continue

    let isSupport = true
    let isResistance = true

    // Check if current low is a support (local minimum)
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && (data[j]?.low ?? 0) <= current.low) {
        isSupport = false
        break
      }
    }

    // Check if current high is a resistance (local maximum)
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && (data[j]?.high ?? 0) >= current.high) {
        isResistance = false
        break
      }
    }

    if (isSupport) support.push(current.low)
    if (isResistance) resistance.push(current.high)
  }

  return { support, resistance }
}

/**
 * Price Change Percentage
 */
export const calculatePriceChange = (
  data: PriceData[]
): {
  change: number
  changePercent: number
} => {
  if (data.length < 2) return { change: 0, changePercent: 0 }

  const latest = data[data.length - 1]
  const previous = data[data.length - 2]

  if (!latest || !previous) return { change: 0, changePercent: 0 }
  const change = latest.close - previous.close
  const changePercent = (change / previous.close) * 100

  return { change, changePercent }
}

/**
 * Volume Profile (simplified)
 */
export const calculateVolumeProfile = (
  data: PriceData[],
  bins: number = 50
): {
  price: number
  volume: number
}[] => {
  if (data.length === 0) return []

  const prices = data.map(d => d?.close ?? 0)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceStep = (maxPrice - minPrice) / bins

  const volumeProfile = Array.from({ length: bins }, (_, i) => ({
    price: minPrice + i * priceStep,
    volume: 0,
  }))

  data.forEach(d => {
    if (!d) return
    const binIndex = Math.min(Math.floor((d.close - minPrice) / priceStep), bins - 1)
    if (volumeProfile[binIndex]) {
      volumeProfile[binIndex].volume += d.volume || 0
    }
  })

  return volumeProfile.filter(vp => vp.volume > 0)
}
