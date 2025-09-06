import { useMemo } from 'react'
import type { SeriesOption } from 'echarts'
import type { UserIndicator } from '@shared'
import { log } from '../../services/logger'

/**
 * 移動平均線（SMA/EMA）インジケーター用シリーズ作成フック
 * @param indicator ユーザーインジケーター設定
 * @param indicatorData 計算済みインジケーターデータ
 * @returns 移動平均線シリーズオプション
 */
export function useMovingAverageSeries(
  indicator: UserIndicator,
  indicatorData: number[]
) {
  return useMemo(() => {
    if (!indicator.visible || indicatorData.length === 0) {
      log.business.info('Moving average series skipped (invisible or no data)', {
        operation: 'indicator_series',
        indicatorName: indicator.name,
        indicatorType: indicator.type,
        visible: indicator.visible,
        dataLength: indicatorData.length,
      })
      return []
    }

    log.business.info('Creating moving average indicator series', {
      operation: 'indicator_series',
      indicatorName: indicator.name,
      indicatorType: indicator.type,
      dataLength: indicatorData.length,
    })

    const lineColor = indicator.style?.color || '#ff9500'
    const lineWidth = indicator.style?.lineWidth || 2

    const series: SeriesOption[] = [{
      name: indicator.name,
      type: 'line',
      data: indicatorData,
      smooth: true,
      symbol: 'none',
      lineStyle: {
        color: lineColor,
        width: lineWidth,
      },
      // メインチャートに表示（gridIndex: 0, xAxisIndex: 0, yAxisIndex: 0）
      xAxisIndex: 0,
      yAxisIndex: 0,
      z: 50,
    }]

    log.business.info('Moving average indicator series created', {
      operation: 'indicator_series',
      indicatorName: indicator.name,
      indicatorType: indicator.type,
    })

    return series
  }, [indicator, indicatorData])
}