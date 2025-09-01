import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { EChartsOption, SeriesOption } from 'echarts'
import type { ChartData, PriceStats, UserIndicator } from '@shared'
import { log } from '@/services/logger'

// 新しい分離されたフック・ユーティリティのインポート
import { useCandlestickSeries } from './chart-types/useCandlestickSeries'
import { useLineSeries } from './chart-types/useLineSeries'
import { useAreaSeries } from './chart-types/useAreaSeries'
import { useChartLayout } from './layout/useChartLayout'
import { useRSISeries } from './indicators/useRSISeries'
import { useMACDSeries } from './indicators/useMACDSeries'
import { useMovingAverageSeries } from './indicators/useMovingAverageSeries'
import { useBollingerBandsSeries } from './indicators/useBollingerBandsSeries'
import { calculateIndicatorFromData } from '../utils/calculations/indicatorProcessor'

export type ChartOptionsConfig = {
  symbol?: string
  timeframe?: string
  chartType: 'candle' | 'line' | 'area'
  theme: 'light' | 'dark'
  showVolume: boolean
  showGridlines: boolean
  showPeriodHigh?: boolean
  showPeriodLow?: boolean
  currentPrice?: number
  colors?: {
    bullish: string
    bearish: string
    volume: string
    grid: string
    background: string
  }
  graphicElements?: any[]
}

/**
 * リファクタリング済みチャートオプションフック
 * @param chartData チャートデータ
 * @param priceStats 価格統計
 * @param config チャート設定
 * @returns EChartsオプション
 */
export function useChartOptions(
  chartData: ChartData,
  priceStats: PriceStats | null,
  config: ChartOptionsConfig
) {
  // インジケーターデータフェッチ
  const { data: indicators = [], isLoading: indicatorsLoading } = useQuery({
    queryKey: ['indicators', config.symbol, config.timeframe],
    queryFn: async () => {
      if (!config.symbol || !config.timeframe) return []
      const response = await fetch(
        `/api/indicators?symbol=${config.symbol}&timeframe=${config.timeframe}`
      )
      if (!response.ok) throw new Error('Failed to fetch indicators')
      return response.json()
    },
    enabled: Boolean(config.symbol && config.timeframe),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // インジケーター計算結果フェッチ
  const { data: indicatorCalculations = {}, isLoading: calculationsLoading } = useQuery({
    queryKey: ['indicatorCalculations', config.symbol, config.timeframe, indicators],
    queryFn: async () => {
      if (!config.symbol || !config.timeframe || indicators.length === 0) return {}
      const response = await fetch(
        `/api/indicators/calculate?symbol=${config.symbol}&timeframe=${config.timeframe}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ indicators }),
        }
      )
      if (!response.ok) throw new Error('Failed to calculate indicators')
      return response.json()
    },
    enabled: Boolean(config.symbol && config.timeframe && indicators.length > 0),
    staleTime: 5 * 60 * 1000,
  })

  // インジケーター表示状態の判定
  const hasRSI = indicators.some(
    indicator => indicator.type === 'rsi' && indicator.visible === true
  )
  const hasMACD = indicators.some(
    indicator => indicator.type === 'macd' && indicator.visible === true
  )

  // レイアウト計算
  const layout = useChartLayout(chartData, {
    showVolume: config.showVolume,
    hasRSI,
    hasMACD,
    showGridlines: config.showGridlines,
    isDarkMode: config.theme === 'dark',
    colors: config.colors,
  })

  // メインチャートシリーズ作成
  const candlestickSeries = useCandlestickSeries(
    chartData,
    config.symbol,
    priceStats,
    config.currentPrice,
    config.showPeriodHigh,
    config.showPeriodLow,
    config.colors
  )

  const lineSeries = useLineSeries(
    chartData,
    config.symbol,
    priceStats,
    config.currentPrice,
    config.showPeriodHigh,
    config.showPeriodLow,
    '#3b82f6'
  )

  const areaSeries = useAreaSeries(
    chartData,
    config.symbol,
    priceStats,
    config.currentPrice,
    config.showPeriodHigh,
    config.showPeriodLow,
    '#3b82f6'
  )

  // インジケーターシリーズ作成
  const allIndicatorSeries = useMemo(() => {
    const series: SeriesOption[] = []

    indicators.forEach(indicator => {
      if (!indicator.visible) return

      // API計算結果を優先、フォールバックでローカル計算
      const calculationResult = indicatorCalculations[indicator.id]
      let indicatorData: number[] | number[][]

      if (calculationResult && calculationResult.values) {
        // API計算結果を使用
        indicatorData = calculationResult.values.map((item: { value: number }) => item.value)
        log.business.info('Using API calculation for indicator', {
          operation: 'chart_options_refactored',
          indicatorName: indicator.name,
          dataPoints: indicatorData.length,
        })
      } else {
        // フォールバックでローカル計算
        log.business.warn('Falling back to local calculation for indicator', {
          operation: 'chart_options_refactored',
          indicatorName: indicator.name,
        })
        indicatorData = calculateIndicatorFromData(chartData, indicator)
      }

      if (!indicatorData || indicatorData.length === 0) {
        log.business.warn('No indicator data available', {
          operation: 'chart_options_refactored',
          indicatorName: indicator.name,
        })
        return
      }

      // インジケータータイプに応じてシリーズ作成
      switch (indicator.type) {
        case 'sma':
        case 'ema': {
          const movingAvgSeries = useMovingAverageSeries(indicator, indicatorData as number[])
          series.push(...movingAvgSeries)
          break
        }

        case 'bollinger': {
          const bollingerSeries = useBollingerBandsSeries(indicator, indicatorData as number[][])
          series.push(...bollingerSeries)
          break
        }

        case 'rsi': {
          const rsiGridIndex = layout.seriesMapping['rsi']
          if (rsiGridIndex !== undefined) {
            const rsiSeries = useRSISeries(indicator, indicatorData as number[], rsiGridIndex)
            series.push(...rsiSeries)
          }
          break
        }

        case 'macd': {
          const macdGridIndex = layout.seriesMapping['macd']
          if (macdGridIndex !== undefined) {
            const macdSeries = useMACDSeries(indicator, indicatorData as number[][], macdGridIndex)
            series.push(...macdSeries)
          }
          break
        }

        default:
          log.business.warn('Unknown indicator type encountered', {
            operation: 'chart_options_refactored',
            indicatorType: indicator.type,
            indicatorName: indicator.name,
          })
          break
      }
    })

    return series
  }, [indicators, indicatorCalculations, chartData, layout.seriesMapping])

  // 最終オプション生成
  const option = useMemo(() => {
    const isDarkMode = config.theme === 'dark'

    log.business.info('Chart configuration applied', {
      operation: 'chart_options_refactored',
      showGridlines: config.showGridlines,
      chartType: config.chartType,
      theme: config.theme,
    })

    const baseOption: EChartsOption = {
      backgroundColor: config.colors?.background || (isDarkMode ? '#1f2937' : '#ffffff'),
      animation: false,
      legend: {
        show: false,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          animation: false,
          label: {
            backgroundColor: isDarkMode ? '#4b5563' : '#6b7280',
          },
        },
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: isDarkMode ? '#374151' : '#d1d5db',
        textStyle: {
          color: isDarkMode ? '#f9fafb' : '#111827',
        },
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: {
          backgroundColor: '#777',
        },
      },
      grid: layout.gridConfigs,
      xAxis: layout.xAxes,
      yAxis: layout.yAxes,
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: Array.from({ length: layout.gridCount }, (_, i) => i), // All X-axes
          start: 0,
          end: 100,
          filterMode: 'filter',
        },
      ],
      series: [] as SeriesOption[],
      graphic: config.graphicElements,
    }

    // メインチャートシリーズ追加
    if (config.chartType === 'candle') {
      candlestickSeries.xAxisIndex = 0
      candlestickSeries.yAxisIndex = 0
      baseOption.series.push(candlestickSeries)
      log.business.info('Added candlestick series to chart', { operation: 'chart_options_refactored' })
    } else if (config.chartType === 'line') {
      lineSeries.xAxisIndex = 0
      lineSeries.yAxisIndex = 0
      baseOption.series.push(lineSeries)
      log.business.info('Added line series to chart', { operation: 'chart_options_refactored' })
    } else {
      // area
      areaSeries.xAxisIndex = 0
      areaSeries.yAxisIndex = 0
      baseOption.series.push(areaSeries)
      log.business.info('Added area series to chart', { operation: 'chart_options_refactored' })
    }

    // ボリュームシリーズ追加
    if (config.showVolume) {
      const volumeGridIndex = layout.seriesMapping['volume']
      if (volumeGridIndex !== undefined) {
        baseOption.series.push({
          name: 'Volume',
          type: 'bar',
          xAxisIndex: volumeGridIndex,
          yAxisIndex: volumeGridIndex,
          data: chartData.volumes,
          barWidth: '60%',
          itemStyle: {
            color: config.colors?.volume || '#10b981',
          },
        })
        log.business.info('Added volume series to chart', {
          operation: 'chart_options_refactored',
          gridIndex: volumeGridIndex,
        })
      }
    }

    // インジケーターシリーズ追加
    baseOption.series.push(...allIndicatorSeries)

    log.business.info('Final chart series summary', {
      operation: 'chart_options_refactored',
      totalSeries: baseOption.series.length,
      seriesDetails: baseOption.series.map(s => ({
        name: s.name || s.type,
        xAxisIndex: s.xAxisIndex,
        yAxisIndex: s.yAxisIndex,
        type: s.type,
      })),
    })

    return baseOption
  }, [
    chartData,
    config,
    priceStats,
    layout,
    candlestickSeries,
    lineSeries,
    areaSeries,
    allIndicatorSeries,
    indicatorsLoading,
    calculationsLoading,
  ])

  return { option }
}