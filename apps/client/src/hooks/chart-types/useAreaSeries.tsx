import { useMemo } from 'react'
import * as echarts from 'echarts'
import type { LineSeriesOption } from 'echarts/charts'
import type { ChartData, PriceStats } from '@shared'
import { log } from '../../services/logger'
import { createPriceMarkLine } from '../../utils/chart/markLineUtils'

/**
 * Areaチャート用シリーズ作成フック
 * @param chartData チャートデータ
 * @param symbol シンボル名
 * @param priceStats 価格統計
 * @param currentPrice 現在価格
 * @param showPeriodHigh 期間高値表示フラグ
 * @param showPeriodLow 期間安値表示フラグ
 * @param lineColor ライン色
 * @param gradientColors グラデーション色
 * @returns Areaシリーズオプション
 */
export function useAreaSeries(
  chartData: ChartData,
  symbol?: string,
  priceStats?: PriceStats | null,
  currentPrice?: number,
  showPeriodHigh?: boolean,
  showPeriodLow?: boolean,
  lineColor?: string,
  gradientColors?: { start: string; end: string }
) {
  return useMemo(() => {
    log.business.info('Creating area series', {
      operation: 'chart_series',
      symbol,
      dataLength: chartData.values.length,
    })

    // エリアチャート用にデータ形式を正規化
    // ローソク足データ [始値, 高値, 安値, 終値] から終値のみを抽出
    const areaData = chartData.values.map((item: number[] | number) => {
      if (Array.isArray(item) && item.length >= 4) {
        // ローソク足形式の場合、終値（インデックス 3）を使用
        return item[3] // 終値
      } else if (typeof item === 'number') {
        // 単純な数値の場合はそのまま使用
        return item
      } else {
        // その他の場合は 0 を返す（安全な処理）
        log.business.warn('Unexpected data format for area chart', {
          operation: 'chart_series',
          dataItem: item,
        })
        return 0
      }
    })

    log.business.info('Area series data conversion completed', {
      operation: 'chart_series',
      originalLength: chartData.values.length,
      convertedLength: areaData.length,
      originalSample: chartData.values.slice(0, 3),
      convertedSample: areaData.slice(0, 3),
    })

    const baseLineColor = lineColor || '#3b82f6'
    const startColor = gradientColors?.start || 'rgba(59, 130, 246, 0.25)'
    const endColor = gradientColors?.end || 'rgba(59, 130, 246, 0.05)'

    const areaSeries: LineSeriesOption = {
      name: symbol || 'Price',
      type: 'line',
      data: areaData, // 正規化されたデータを使用
      smooth: true,
      symbol: 'none',
      lineStyle: {
        color: baseLineColor,
        width: 2,
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: startColor },
          { offset: 1, color: endColor },
        ]),
      },
    }

    // Add price lines similar to candlestick
    if (priceStats) {
      areaSeries.markLine = createPriceMarkLine(
        priceStats, 
        currentPrice, 
        showPeriodHigh, 
        showPeriodLow
      )
    }

    log.business.info('Area series created', {
      operation: 'chart_series',
      hasMarkLines: !!areaSeries.markLine,
      hasAreaStyle: !!areaSeries.areaStyle,
    })

    return areaSeries
  }, [
    chartData,
    symbol,
    priceStats,
    currentPrice,
    showPeriodHigh,
    showPeriodLow,
    lineColor,
    gradientColors,
  ])
}