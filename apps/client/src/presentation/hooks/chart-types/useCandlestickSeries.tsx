import { useMemo } from 'react'
import type { CandlestickSeriesOption } from 'echarts/charts'
import type { ChartData, PriceStats } from '@shared'
import { log } from '@/infrastructure/services/LoggerService'

type SeriesColors = {
  bullish: string
  bearish: string
  volume: string
  grid: string
  background: string
}

/**
 * Candlestickチャート用シリーズ作成フック
 * @param chartData チャートデータ
 * @param symbol シンボル名
 * @param priceStats 価格統計
 * @param currentPrice 現在価格
 * @param showPeriodHigh 期間高値表示フラグ
 * @param showPeriodLow 期間安値表示フラグ
 * @param colors カラー設定
 * @returns Candlestickシリーズオプション
 */
export function useCandlestickSeries(
  chartData: ChartData,
  symbol?: string,
  priceStats?: PriceStats | null,
  currentPrice?: number,
  showPeriodHigh?: boolean,
  showPeriodLow?: boolean,
  colors?: SeriesColors
) {
  return useMemo(() => {
    log.business.info('Creating candlestick series', {
      operation: 'chart_series',
      symbol,
      dataLength: chartData.values.length,
    })

    const candlestickSeries: CandlestickSeriesOption = {
      name: symbol || 'Price',
      type: 'candlestick',
      data: chartData.values,
      barWidth: '60%',
      itemStyle: {
        color: colors?.bullish || '#10b981', // 上昇時の色
        color0: colors?.bearish || '#ef4444', // 下降時の色
        borderColor: colors?.bullish || '#10b981', // 上昇時のボーダー色
        borderColor0: colors?.bearish || '#ef4444', // 下降時のボーダー色
        borderWidth: 1,
      },
    }

    // Add price lines (High, Low, Current) when price stats are available
    if (priceStats) {
      candlestickSeries.markLine = {
        silent: true,
        symbol: 'none',
        label: {
          show: false, // markLine のラベルを無効化
        },
        lineStyle: {
          opacity: 0.8,
          width: 1,
          type: 'dashed',
        },
        data: [
          ...(showPeriodHigh && priceStats.periodHigh
            ? [
                {
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
                },
              ]
            : []),
          ...(showPeriodLow && priceStats.periodLow
            ? [
                {
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
                },
              ]
            : []),
          {
            name: 'Current',
            yAxis: currentPrice || priceStats.close,
            lineStyle: {
              color: '#10b981', // 現在値は緑
            },
            label: {
              show: true, // 現在値のラベルを表示
              position: 'end',
              formatter: `${(currentPrice || priceStats.close).toFixed(2)}`,
              color: '#ffffff',
              fontSize: 11,
              padding: [2, 4],
              borderRadius: 2,
              backgroundColor: '#10b981', // 現在値は緑
            },
          },
        ],
      }
    }

    log.business.info('Candlestick series created', {
      operation: 'chart_series',
      hasMarkLines: !!candlestickSeries.markLine,
      markLineCount: candlestickSeries.markLine?.data?.length || 0,
    })

    return candlestickSeries
  }, [chartData, symbol, priceStats, currentPrice, showPeriodHigh, showPeriodLow, colors])
}
