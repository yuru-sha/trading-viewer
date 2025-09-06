import type { PriceStats } from '@shared'

type MarkLineData = {
  name: string
  yAxis: number
  lineStyle: {
    color: string
  }
  label: {
    show: boolean
    position: string
    formatter: string
    color: string
    fontSize: number
    padding: number[]
    borderRadius: number
    backgroundColor: string
  }
}

/**
 * 価格ラインのMarkLineを作成する
 * @param priceStats 価格統計
 * @param currentPrice 現在価格
 * @param showPeriodHigh 期間高値表示フラグ
 * @param showPeriodLow 期間安値表示フラグ
 * @returns MarkLineオプション
 */
export function createPriceMarkLine(
  priceStats: PriceStats,
  currentPrice?: number,
  showPeriodHigh?: boolean,
  showPeriodLow?: boolean
) {
  const markLineData: MarkLineData[] = []

  // 期間高値ライン
  if (showPeriodHigh && priceStats.periodHigh) {
    markLineData.push({
      name: 'Period High',
      yAxis: priceStats.periodHigh,
      lineStyle: {
        color: '#dc2626', // 期間高値は濃い赤
      },
      label: {
        show: true,
        position: 'end',
        formatter: `${priceStats.periodHigh.toFixed(2)}`,
        color: '#ffffff',
        fontSize: 11,
        padding: [2, 4],
        borderRadius: 2,
        backgroundColor: '#dc2626',
      },
    })
  }

  // 期間安値ライン
  if (showPeriodLow && priceStats.periodLow) {
    markLineData.push({
      name: 'Period Low',
      yAxis: priceStats.periodLow,
      lineStyle: {
        color: '#1d4ed8', // 期間安値は濃い青
      },
      label: {
        show: true,
        position: 'end',
        formatter: `${priceStats.periodLow.toFixed(2)}`,
        color: '#ffffff',
        fontSize: 11,
        padding: [2, 4],
        borderRadius: 2,
        backgroundColor: '#1d4ed8',
      },
    })
  }

  // 現在価格ライン
  markLineData.push({
    name: 'Current',
    yAxis: currentPrice || priceStats.close,
    lineStyle: {
      color: '#10b981', // 現在値は緑
    },
    label: {
      show: true,
      position: 'end',
      formatter: `${(currentPrice || priceStats.close).toFixed(2)}`,
      color: '#ffffff',
      fontSize: 11,
      padding: [2, 4],
      borderRadius: 2,
      backgroundColor: '#10b981',
    },
  })

  return {
    silent: true,
    symbol: 'none',
    label: {
      show: false, // デフォルトのmarkLineラベルを無効化
    },
    lineStyle: {
      opacity: 0.8,
      width: 1,
      type: 'dashed',
    },
    data: markLineData,
  }
}