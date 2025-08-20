/**
 * テクニカルインジケーター計算ユーティリティ
 *
 * useChartOptions.tsx から抽出された計算関数群
 * パフォーマンス改善のためファイル分割
 */

// SMA (Simple Moving Average) 計算
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN) // 期間未満は NaN
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      sma.push(sum / period)
    }
  }

  return sma
}

// EMA (Exponential Moving Average) 計算
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      ema.push(prices[i])
    } else {
      ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1])
    }
  }

  return ema
}

// RSI (Relative Strength Index) 計算
export function calculateRSI(prices: number[], period: number): number[] {
  if (prices.length < period + 1) {
    return []
  }

  const rsi: number[] = []
  let gains: number[] = []
  let losses: number[] = []

  // 初期期間の上昇と下降を計算
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) {
      gains.push(change)
      losses.push(0)
    } else {
      gains.push(0)
      losses.push(-change)
    }
  }

  // 初期 RSI 値
  let avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period
  let avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period

  if (avgLoss === 0) {
    rsi.push(100)
  } else {
    const rs = avgGain / avgLoss
    rsi.push(100 - 100 / (1 + rs))
  }

  // 残りの RSI 値を計算
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0

    // EMA スタイルの平滑化
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    if (avgLoss === 0) {
      rsi.push(100)
    } else {
      const rs = avgGain / avgLoss
      rsi.push(100 - 100 / (1 + rs))
    }
  }

  return rsi
}

// MACD (Moving Average Convergence Divergence) 計算
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  if (prices.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] }
  }

  console.log('🔍 MACD: Calculating EMAs with periods:', { fastPeriod, slowPeriod, signalPeriod })

  // EMA 計算
  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)

  console.log('🔍 MACD: Fast EMA sample:', fastEMA.slice(0, 5))
  console.log('🔍 MACD: Slow EMA sample:', slowEMA.slice(0, 5))

  // MACD ライン計算 (Fast EMA - Slow EMA)
  const macdLine: number[] = []
  for (let i = 0; i < prices.length; i++) {
    if (i < slowPeriod - 1) {
      macdLine.push(NaN)
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i])
    }
  }

  console.log('🔍 MACD: MACD line sample:', macdLine.slice(slowPeriod - 1, slowPeriod + 4))

  // Signal ライン計算 (MACD の EMA)
  const validMacdValues = macdLine.filter(val => !isNaN(val))
  const signalEMA = calculateEMA(validMacdValues, signalPeriod)

  console.log('🔍 MACD: Signal EMA sample:', signalEMA.slice(0, 5))

  // Signal ラインを元のデータ長に合わせる
  const signalLine: number[] = []
  let signalIndex = 0
  for (let i = 0; i < prices.length; i++) {
    if (i < slowPeriod + signalPeriod - 2) {
      signalLine.push(NaN)
    } else {
      signalLine.push(signalEMA[signalIndex] || NaN)
      signalIndex++
    }
  }

  console.log(
    '🔍 MACD: Signal line sample:',
    signalLine.slice(slowPeriod + signalPeriod - 2, slowPeriod + signalPeriod + 2)
  )

  // Histogram 計算 (MACD - Signal)
  const histogram: number[] = []
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN)
    } else {
      histogram.push(macdLine[i] - signalLine[i])
    }
  }

  console.log(
    '🔍 MACD: Histogram sample:',
    histogram.slice(slowPeriod + signalPeriod - 2, slowPeriod + signalPeriod + 2)
  )

  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
  }
}

// Bollinger Bands 計算
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  standardDeviations: number = 2.1
) {
  if (prices.length < period) {
    return { 
      upperBand2: [], 
      upperBand1: [], 
      middleBand: [], 
      lowerBand1: [], 
      lowerBand2: [] 
    }
  }

  const middleBand = calculateSMA(prices, period)
  const upperBand2: number[] = []
  const upperBand1: number[] = []
  const lowerBand1: number[] = []
  const lowerBand2: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upperBand2.push(NaN)
      upperBand1.push(NaN)
      lowerBand1.push(NaN)
      lowerBand2.push(NaN)
    } else {
      // 標準偏差を計算
      const slice = prices.slice(i - period + 1, i + 1)
      const mean = middleBand[i]
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period
      const stdDev = Math.sqrt(variance)

      // ±2σと±1σの両方を計算
      upperBand2.push(mean + standardDeviations * stdDev)
      upperBand1.push(mean + (standardDeviations / 2) * stdDev)
      lowerBand1.push(mean - (standardDeviations / 2) * stdDev)
      lowerBand2.push(mean - standardDeviations * stdDev)
    }
  }

  return { upperBand2, upperBand1, middleBand, lowerBand1, lowerBand2 }
}

// Volume 加重平均価格 (VWAP) 計算
export function calculateVWAP(prices: number[], volumes: number[], period: number = 20): number[] {
  if (prices.length !== volumes.length || prices.length < period) {
    return []
  }

  const vwap: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      vwap.push(NaN)
    } else {
      let totalVolumePrice = 0
      let totalVolume = 0

      for (let j = i - period + 1; j <= i; j++) {
        totalVolumePrice += prices[j] * volumes[j]
        totalVolume += volumes[j]
      }

      vwap.push(totalVolume > 0 ? totalVolumePrice / totalVolume : NaN)
    }
  }

  return vwap
}
