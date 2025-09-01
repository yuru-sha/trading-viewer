import { log } from '../../services/logger'
import type { ChartData, UserIndicator } from '@shared'
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD,
  calculateBollingerBands
} from './technicalIndicators'

/**
 * チャートデータから価格配列を抽出する
 * @param chartData チャートデータ
 * @returns 価格配列（終値）
 */
export function extractPricesFromChartData(chartData: ChartData): number[] {
  const prices = chartData.values.map((item: number[] | number | { close: number }) => {
    if (Array.isArray(item) && item.length >= 4) {
      // ローソク足形式 [始値, 高値, 安値, 終値] の場合、終値を使用
      return item[3]
    } else if (Array.isArray(item) && item.length >= 2) {
      // 2 つ以上の値がある場合、最後の値を終値として使用
      return item[item.length - 1]
    } else if (typeof item === 'number') {
      // 単純な数値の場合はそのまま使用
      return item
    } else if (typeof item === 'object' && item?.close !== undefined) {
      // オブジェクト形式で close プロパティがある場合
      return item.close
    } else {
      log.business.warn('Unable to extract price from data item', {
        operation: 'indicator_processor',
        dataItem: item,
      })
      return 0
    }
  })

  log.business.info('Price extraction completed', {
    operation: 'indicator_processor',
    originalLength: chartData.values.length,
    extractedLength: prices.length,
    originalSample: chartData.values.slice(0, 3),
    extractedSample: prices.slice(0, 3),
  })

  return prices
}

/**
 * チャートデータとインジケーター設定から計算結果を取得
 * @param chartData チャートデータ
 * @param indicator ユーザーインジケーター設定
 * @returns 計算結果（単次元または多次元配列）
 */
export function calculateIndicatorFromData(
  chartData: ChartData,
  indicator: UserIndicator
): number[] | number[][] {
  try {
    // Debug情報をログ出力
    const firstCandle = chartData.values?.[0]
    const debugInfo = {
      timestamp: new Date().toISOString(),
      indicator: indicator.name,
      chartDataLength: chartData.values?.length || 0,
      firstCandle,
      isArray: Array.isArray(firstCandle),
      candleLength: Array.isArray(firstCandle) ? firstCandle.length : 'not array',
    }

    log.business.info('Indicator calculation debug info', {
      operation: 'indicator_processor',
      ...debugInfo,
    })

    // 価格データを抽出
    const prices = extractPricesFromChartData(chartData)

    if (prices.length === 0) {
      log.business.warn('No price data available for indicator calculation', {
        operation: 'indicator_processor',
        indicatorName: indicator.name,
      })
      return []
    }

    const period = indicator.parameters.period || indicator.parameters.length || 20

    switch (indicator.type) {
      case 'sma':
        log.business.info('Calculating SMA indicator', {
          operation: 'indicator_processor',
          period,
          dataPoints: prices.length,
        })
        return calculateSMA(prices, period)

      case 'ema':
        log.business.info('Calculating EMA indicator', {
          operation: 'indicator_processor',
          period,
          dataPoints: prices.length,
        })
        return calculateEMA(prices, period)

      case 'bollinger': {
        log.business.info('Calculating Bollinger Bands indicator', {
          operation: 'indicator_processor',
          period,
          dataPoints: prices.length,
        })
        // ボリンジャーバンドの実装（±1σ, ±2σの 4 本線 + 中央線）
        return calculateBollingerBands(prices, period)
      }

      case 'rsi': {
        log.business.info('Starting RSI calculation', {
          operation: 'indicator_processor',
          pricesLength: prices.length,
          period,
        })
        
        const rsiData = calculateRSI(prices, period)
        
        log.business.info('RSI calculation completed', {
          operation: 'indicator_processor',
          resultLength: rsiData.length,
          sampleValues: rsiData.slice(0, 5),
        })

        // RSI 値を配列として返す（NaN パディングでデータ長を統一）
        const rsiValues = []
        for (let i = 0; i < prices.length; i++) {
          if (i < period) {
            // 期間未満の場合は NaN で埋める
            rsiValues.push(NaN)
          } else {
            // RSI データから対応する値を取得
            const rsiIndex = i - period
            if (rsiIndex < rsiData.length) {
              rsiValues.push(rsiData[rsiIndex])
            } else {
              rsiValues.push(NaN)
            }
          }
        }

        log.business.info('RSI final values prepared', {
          operation: 'indicator_processor',
          finalLength: rsiValues.length,
          sampleFinalValues: rsiValues.slice(-10),
        })
        
        return rsiValues
      }

      case 'macd': {
        log.business.info('Starting MACD calculation', {
          operation: 'indicator_processor',
          pricesLength: prices.length,
        })
        
        const macdData = calculateMACD(prices, 12, 26, 9) // デフォルトパラメータ
        
        log.business.info('MACD calculation completed', {
          operation: 'indicator_processor',
          macdLength: macdData.macd.length,
          signalLength: macdData.signal.length,
          histogramLength: macdData.histogram.length,
        })

        // MACD データを配列として返す（NaN パディングでデータ長を統一）
        const macdValues = []
        const macdStartIndex = 25 // 26 日 EMA - 1

        for (let i = 0; i < prices.length; i++) {
          if (i < macdStartIndex) {
            // 期間未満の場合は NaN で埋める
            macdValues.push([NaN, NaN, NaN])
          } else {
            // MACD データから対応する値を取得
            const macdIndex = i - macdStartIndex
            if (macdIndex < macdData.macd.length) {
              macdValues.push([
                macdData.macd[macdIndex],
                macdData.signal[macdIndex],
                macdData.histogram[macdIndex],
              ])
            } else {
              macdValues.push([NaN, NaN, NaN])
            }
          }
        }

        log.business.info('MACD final values prepared', {
          operation: 'indicator_processor',
          finalLength: macdValues.length,
          sampleFinalValues: macdValues.slice(-5),
        })
        
        return macdValues
      }

      default:
        log.business.warn('Unknown indicator type', {
          operation: 'indicator_processor',
          indicatorType: indicator.type,
          indicatorName: indicator.name,
        })
        return []
    }
  } catch (error) {
    log.business.error('Error calculating indicator', error as Error, {
      operation: 'indicator_processor',
      indicatorType: indicator.type,
      indicatorName: indicator.name,
    })
    return []
  }
}