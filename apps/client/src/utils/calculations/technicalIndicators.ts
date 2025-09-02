import { log } from '../../services/logger'

/**
 * Simple Moving Average計算
 * @param prices 価格配列
 * @param period 期間
 * @returns SMA値の配列
 */
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

/**
 * Exponential Moving Average計算
 * @param prices 価格配列
 * @param period 期間
 * @returns EMA値の配列
 */
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

/**
 * Relative Strength Index計算
 * @param prices 価格配列
 * @param period 期間（デフォルト14）
 * @returns RSI値の配列
 */
export function calculateRSI(prices: number[], period: number): number[] {
  if (prices.length < period + 1) {
    return []
  }

  const rsi: number[] = []
  const gains: number[] = []
  const losses: number[] = []

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

/**
 * MACD (Moving Average Convergence Divergence)計算
 * @param prices 価格配列
 * @param fastPeriod 短期EMA期間（デフォルト12）
 * @param slowPeriod 長期EMA期間（デフォルト26）
 * @param signalPeriod シグナルEMA期間（デフォルト9）
 * @returns MACD、シグナル、ヒストグラムの配列
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  if (prices.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] }
  }

  log.business.info('Calculating EMAs for MACD', {
    operation: 'technical_indicators',
    fastPeriod,
    slowPeriod,
    signalPeriod,
  })

  // 12 日 EMA と 26 日 EMA を計算
  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)

  log.business.info('EMA calculations for MACD completed', {
    operation: 'technical_indicators',
    fastEMALength: fastEMA.length,
    slowEMALength: slowEMA.length,
  })

  // MACD ライン = 12 日 EMA - 26 日 EMA
  const macdLine: number[] = []
  const startIndex = slowPeriod - 1 // 26 日 EMA が有効になるインデックス

  for (let i = startIndex; i < fastEMA.length; i++) {
    if (!isNaN(fastEMA[i]) && !isNaN(slowEMA[i])) {
      macdLine.push(fastEMA[i] - slowEMA[i])
    }
  }

  log.business.info('MACD line calculation completed', {
    operation: 'technical_indicators',
    macdLineLength: macdLine.length,
  })

  // シグナルライン = MACD ラインの 9 日 EMA
  const signalLine = calculateEMA(macdLine, signalPeriod)

  log.business.info('MACD signal line calculation completed', {
    operation: 'technical_indicators',
    signalLineLength: signalLine.length,
  })

  // ヒストグラム = MACD ライン - シグナルライン
  const histogram: number[] = []
  const signalStartIndex = signalPeriod - 1

  for (let i = 0; i < macdLine.length; i++) {
    if (i >= signalStartIndex && i < signalLine.length + signalStartIndex) {
      const signalIndex = i - signalStartIndex
      if (!isNaN(macdLine[i]) && !isNaN(signalLine[signalIndex])) {
        histogram.push(macdLine[i] - signalLine[signalIndex])
      } else {
        histogram.push(NaN)
      }
    } else {
      histogram.push(NaN)
    }
  }

  log.business.info('MACD histogram calculation completed', {
    operation: 'technical_indicators',
    histogramLength: histogram.length,
    sampleValues: {
      macd: macdLine.slice(-3),
      signal: signalLine.slice(-3),
      histogram: histogram.slice(-3),
    },
  })

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram,
  }
}

/**
 * ボリンジャーバンド計算
 * @param prices 価格配列
 * @param period 期間
 * @param multiplier 標準偏差の倍数（デフォルト2）
 * @returns 上限、下限、中央線の配列
 */
export function calculateBollingerBands(prices: number[], period: number, multiplier: number = 2) {
  const sma = calculateSMA(prices, period)

  // 5 つの配列を準備: upper2σ, upper1σ, middle, lower1σ, lower2σ
  const upper2 = []
  const upper1 = []
  const middle = []
  const lower1 = []
  const lower2 = []

  // 標準偏差を計算して 5 つの配列に分けて格納（SMA と同じ長さにする）
  for (let i = 0; i < sma.length; i++) {
    if (isNaN(sma[i])) {
      // 期間未満の場合は NaN で埋める（SMA と同じ）
      upper2.push(NaN)
      upper1.push(NaN)
      middle.push(NaN)
      lower1.push(NaN)
      lower2.push(NaN)
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) {
        const diff = prices[i - period + 1 + j] - sma[i]
        sum += diff * diff
      }
      const stdDev = Math.sqrt(sum / period)

      upper2.push(sma[i] + multiplier * stdDev) // +2σ
      upper1.push(sma[i] + (multiplier / 2) * stdDev) // +1σ
      middle.push(sma[i]) // SMA
      lower1.push(sma[i] - (multiplier / 2) * stdDev) // -1σ
      lower2.push(sma[i] - multiplier * stdDev) // -2σ
    }
  }

  return [upper2, upper1, middle, lower1, lower2]
}
