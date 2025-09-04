import { useMemo } from 'react'
import type { SeriesOption } from 'echarts'
import type { UserIndicator } from '@shared'
import { log } from '@/infrastructure/services/LoggerService'

/**
 * ボリンジャーバンドインジケーター用シリーズ作成フック
 * @param indicator ユーザーインジケーター設定
 * @param indicatorData 計算済みインジケーターデータ（[upper2σ, upper1σ, middle, lower1σ, lower2σ]形式）
 * @returns ボリンジャーバンドシリーズオプション配列
 */
export function useBollingerBandsSeries(indicator: UserIndicator, indicatorData: number[][]) {
  return useMemo(() => {
    if (!indicator.visible || indicatorData.length !== 5) {
      log.business.info('Bollinger Bands series skipped (invisible or invalid data)', {
        operation: 'indicator_series',
        indicatorName: indicator.name,
        visible: indicator.visible,
        dataLength: indicatorData.length,
        expectedLength: 5,
      })
      return []
    }

    log.business.info('Creating Bollinger Bands indicator series', {
      operation: 'indicator_series',
      indicatorName: indicator.name,
      bandsCount: indicatorData.length,
    })

    const [upper2, upper1, middle, lower1, lower2] = indicatorData
    const baseColor = indicator.style?.color || '#8e44ad'

    const series: SeriesOption[] = []

    // 各ボリンジャーバンドラインをメインチャートに追加
    series.push(
      {
        name: `${indicator.name} +2σ`,
        type: 'line',
        data: upper2,
        lineStyle: {
          color: baseColor,
          width: 1,
          type: 'dashed',
        },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0,
        z: 50,
      },
      {
        name: `${indicator.name} +1σ`,
        type: 'line',
        data: upper1,
        lineStyle: {
          color: baseColor,
          width: 1,
          type: 'dotted',
        },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0,
        z: 50,
      },
      {
        name: `${indicator.name} SMA`,
        type: 'line',
        data: middle,
        lineStyle: {
          color: baseColor,
          width: 2,
        },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0,
        z: 50,
      },
      {
        name: `${indicator.name} -1σ`,
        type: 'line',
        data: lower1,
        lineStyle: {
          color: baseColor,
          width: 1,
          type: 'dotted',
        },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0,
        z: 50,
      },
      {
        name: `${indicator.name} -2σ`,
        type: 'line',
        data: lower2,
        lineStyle: {
          color: baseColor,
          width: 1,
          type: 'dashed',
        },
        symbol: 'none',
        xAxisIndex: 0,
        yAxisIndex: 0,
        z: 50,
      }
    )

    log.business.info('Bollinger Bands indicator series created', {
      operation: 'indicator_series',
      indicatorName: indicator.name,
      seriesCount: series.length,
    })

    return series
  }, [indicator, indicatorData])
}
