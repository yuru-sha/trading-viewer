import { useMemo } from 'react'
import type { SeriesOption } from 'echarts'
import type { UserIndicator } from '@shared'
import { log } from '@/infrastructure/services/LoggerService'

/**
 * MACDインジケーター用シリーズ作成フック
 * @param indicator ユーザーインジケーター設定
 * @param indicatorData 計算済みインジケーターデータ（[MACD, Signal, Histogram][]形式）
 * @param gridIndex MACDチャートのグリッドインデックス
 * @returns MACDシリーズオプション配列
 */
export function useMACDSeries(
  indicator: UserIndicator,
  indicatorData: number[][],
  gridIndex: number
) {
  return useMemo(() => {
    if (!indicator.visible || indicatorData.length === 0) {
      log.business.info('MACD series skipped (invisible or no data)', {
        operation: 'indicator_series',
        indicatorName: indicator.name,
        visible: indicator.visible,
        dataLength: indicatorData.length,
      })
      return []
    }

    // データが2次元配列でない場合はスキップ
    if (!Array.isArray(indicatorData[0])) {
      log.business.warn('MACD data format invalid (not 2D array)', {
        operation: 'indicator_series',
        indicatorName: indicator.name,
        dataFormat: typeof indicatorData[0],
      })
      return []
    }

    log.business.info('Creating MACD indicator series', {
      operation: 'indicator_series',
      indicatorName: indicator.name,
      gridIndex,
      dataLength: indicatorData.length,
    })

    const series: SeriesOption[] = []

    // MACD、Signal、Histogramの各データを抽出
    const macdData = indicatorData.map(d => d[0])
    const signalData = indicatorData.map(d => d[1])
    const histogramData = indicatorData.map(d => d[2])

    // MACD Line
    series.push({
      name: `${indicator.name} MACD`,
      type: 'line',
      data: macdData,
      smooth: true,
      symbol: 'none',
      lineStyle: {
        color: indicator.style?.color || '#3b82f6',
        width: 2,
      },
      xAxisIndex: gridIndex,
      yAxisIndex: gridIndex,
      z: 50,
    })

    // Signal Line
    series.push({
      name: `${indicator.name} Signal`,
      type: 'line',
      data: signalData,
      smooth: true,
      symbol: 'none',
      lineStyle: {
        color: '#ef4444',
        width: 2,
      },
      xAxisIndex: gridIndex,
      yAxisIndex: gridIndex,
      z: 50,
    })

    // Histogram
    series.push({
      name: `${indicator.name} Histogram`,
      type: 'bar',
      data: histogramData,
      itemStyle: {
        color: (params: { value: number }) => (params.value >= 0 ? '#22c55e' : '#ef4444'),
      },
      xAxisIndex: gridIndex,
      yAxisIndex: gridIndex,
      z: 30,
    })

    // Zero Line
    series.push({
      name: `${indicator.name} Zero Line`,
      type: 'line',
      data: histogramData.map(() => 0),
      lineStyle: {
        color: '#6b7280',
        width: 1,
        type: 'dashed',
        opacity: 0.6,
      },
      symbol: 'none',
      xAxisIndex: gridIndex,
      yAxisIndex: gridIndex,
      z: 20,
    })

    log.business.info('MACD indicator series created', {
      operation: 'indicator_series',
      indicatorName: indicator.name,
      seriesCount: series.length,
      gridIndex,
    })

    return series
  }, [indicator, indicatorData, gridIndex])
}
