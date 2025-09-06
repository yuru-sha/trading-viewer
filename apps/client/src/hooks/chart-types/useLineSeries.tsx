import { useMemo } from 'react'
import type { LineSeriesOption } from 'echarts/charts'
import type { ChartData, PriceStats } from '@shared'
import { log } from '../../services/logger'
import { createPriceMarkLine } from '../../utils/chart/markLineUtils'

/**
 * Lineチャート用シリーズ作成フック
 * @param chartData チャートデータ
 * @param symbol シンボル名
 * @param priceStats 価格統計
 * @param currentPrice 現在価格
 * @param showPeriodHigh 期間高値表示フラグ
 * @param showPeriodLow 期間安値表示フラグ
 * @param lineColor ライン色
 * @returns Lineシリーズオプション
 */
export function useLineSeries(
  chartData: ChartData,
  symbol?: string,
  priceStats?: PriceStats | null,
  currentPrice?: number,
  showPeriodHigh?: boolean,
  showPeriodLow?: boolean,
  lineColor?: string
) {
  return useMemo(() => {
    log.business.info('Creating line series', {
      operation: 'chart_series',
      symbol,
      dataLength: chartData.values.length,
    })

    // ラインチャート用にデータ形式を正規化
    // ローソク足データ [始値, 高値, 安値, 終値] から終値のみを抽出
    const lineData = chartData.values.map((item: number[] | number) => {
      if (Array.isArray(item) && item.length >= 4) {
        // ローソク足形式の場合、終値（インデックス 3）を使用
        return item[3] // 終値
      } else if (typeof item === 'number') {
        // 単純な数値の場合はそのまま使用
        return item
      } else {
        // その他の場合は 0 を返す（安全な処理）
        log.business.warn('Unexpected data format for line chart', {
          operation: 'chart_series',
          dataItem: item,
        })
        return 0
      }
    })

    log.business.info('Line series data conversion completed', {
      operation: 'chart_series',
      originalLength: chartData.values.length,
      convertedLength: lineData.length,
      originalSample: chartData.values.slice(0, 3),
      convertedSample: lineData.slice(0, 3),
    })

    const lineSeries: LineSeriesOption = {
      name: symbol || 'Price',
      type: 'line',
      data: lineData, // 正規化されたデータを使用
      smooth: true,
      symbol: 'none',
      lineStyle: {
        color: lineColor || '#3b82f6',
        width: 2,
      },
    }

    // Add price lines similar to candlestick
    if (priceStats) {
      lineSeries.markLine = createPriceMarkLine(
        priceStats, 
        currentPrice, 
        showPeriodHigh, 
        showPeriodLow
      )
    }

    log.business.info('Line series created', {
      operation: 'chart_series',
      hasMarkLines: !!lineSeries.markLine,
    })

    return lineSeries
  }, [
    chartData,
    symbol,
    priceStats,
    currentPrice,
    showPeriodHigh,
    showPeriodLow,
    lineColor,
  ])
}