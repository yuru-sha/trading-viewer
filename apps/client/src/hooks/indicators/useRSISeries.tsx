import { useMemo } from 'react'
import type { SeriesOption } from 'echarts'
import type { UserIndicator } from '@shared'
import { log } from '../../services/logger'

/**
 * RSIインジケーター用シリーズ作成フック
 * @param indicator ユーザーインジケーター設定
 * @param indicatorData 計算済みインジケーターデータ
 * @param gridIndex RSIチャートのグリッドインデックス
 * @returns RSIシリーズオプション配列
 */
export function useRSISeries(indicator: UserIndicator, indicatorData: number[], gridIndex: number) {
  return useMemo(() => {
    if (!indicator.visible || indicatorData.length === 0) {
      log.business.info('RSI series skipped (invisible or no data)', {
        operation: 'indicator_series',
        indicatorName: indicator.name,
        visible: indicator.visible,
        dataLength: indicatorData.length,
      })
      return []
    }

    log.business.info('Creating RSI indicator series', {
      operation: 'indicator_series',
      indicatorName: indicator.name,
      gridIndex,
      dataLength: indicatorData.length,
    })

    const rsiColor = indicator.style?.color || '#9C27B0'
    const rsiLineWidth = indicator.style?.lineWidth || 2

    const series: SeriesOption[] = []

    // RSI Main Line
    series.push({
      name: indicator.name,
      type: 'line',
      data: indicatorData,
      smooth: true,
      symbol: 'none',
      lineStyle: {
        color: rsiColor,
        width: rsiLineWidth,
      },
      xAxisIndex: gridIndex,
      yAxisIndex: gridIndex,
      z: 50,
    })

    // RSI Reference Lines
    series.push(
      {
        name: 'RSI Oversold',
        type: 'line',
        data: Array(indicatorData.length).fill(30),
        lineStyle: {
          color: '#ef4444',
          width: 1,
          type: 'dashed',
          opacity: 0.6,
        },
        symbol: 'none',
        xAxisIndex: gridIndex,
        yAxisIndex: gridIndex,
        z: 30,
      },
      {
        name: 'RSI Overbought',
        type: 'line',
        data: Array(indicatorData.length).fill(70),
        lineStyle: {
          color: '#ef4444',
          width: 1,
          type: 'dashed',
          opacity: 0.6,
        },
        symbol: 'none',
        xAxisIndex: gridIndex,
        yAxisIndex: gridIndex,
        z: 30,
      },
      {
        name: 'RSI Midline',
        type: 'line',
        data: Array(indicatorData.length).fill(50),
        lineStyle: {
          color: '#6b7280',
          width: 1,
          type: 'dotted',
          opacity: 0.4,
        },
        symbol: 'none',
        xAxisIndex: gridIndex,
        yAxisIndex: gridIndex,
        z: 20,
      }
    )

    log.business.info('RSI indicator series created', {
      operation: 'indicator_series',
      indicatorName: indicator.name,
      seriesCount: series.length,
      gridIndex,
    })

    return series
  }, [indicator, indicatorData, gridIndex])
}
