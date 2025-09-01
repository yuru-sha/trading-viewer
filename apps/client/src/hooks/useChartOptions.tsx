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

  // インジケーターデータ処理
  const processedIndicators = useMemo(() => {
    log.business.info('Processing indicators', {
      operation: 'chart_options_refactored',
      totalIndicators: indicators.length,
      visibleIndicators: indicators.filter(ind => ind.visible).length,
      indicatorTypes: indicators.map(ind => ({
        type: ind.type,
        visible: ind.visible,
        name: ind.name,
      })),
    })

    return indicators
      .map(indicator => {
        if (!indicator.visible) {
          log.business.debug('Skipping non-visible indicator', {
            operation: 'chart_options_refactored',
            indicatorName: indicator.name,
            indicatorType: indicator.type,
          })
          return null
        }

        log.business.info('Processing visible indicator', {
          operation: 'chart_options_refactored',
          indicatorName: indicator.name,
          indicatorType: indicator.type,
          hasCalculationResult: Boolean(indicatorCalculations[indicator.id]),
        })

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
            indicatorType: indicator.type,
          })
          indicatorData = calculateIndicatorFromData(chartData, indicator)

          log.business.info('Local calculation result', {
            operation: 'chart_options_refactored',
            indicatorName: indicator.name,
            indicatorType: indicator.type,
            resultLength: Array.isArray(indicatorData) ? indicatorData.length : 0,
            isArray2D: Array.isArray(indicatorData) && Array.isArray(indicatorData[0]),
          })
        }

        if (!indicatorData || indicatorData.length === 0) {
          log.business.warn('No indicator data available', {
            operation: 'chart_options_refactored',
            indicatorName: indicator.name,
          })
          return null
        }

        return {
          indicator,
          data: indicatorData,
        }
      })
      .filter(Boolean)
  }, [indicators, indicatorCalculations, chartData])

  // インジケーターシリーズ作成（直接計算）
  const allIndicatorSeries = useMemo(() => {
    const series: SeriesOption[] = []

    processedIndicators.forEach(item => {
      if (!item) return

      const { indicator, data } = item

      // インジケータータイプに応じてシリーズ作成（直接シリーズオブジェクトを生成）
      switch (indicator.type) {
        case 'sma':
        case 'ema': {
          const isDarkMode = config.theme === 'dark'
          series.push({
            type: 'line',
            name: `${indicator.type.toUpperCase()}(${indicator.parameters?.period || 20})`,
            data: data.map((value, index) => [chartData.dates[index], value]),
            xAxisIndex: 0,
            yAxisIndex: 0,
            lineStyle: {
              color: indicator.color || (isDarkMode ? '#fbbf24' : '#f59e0b'),
              width: 2,
            },
            symbol: 'none',
            smooth: false,
          })
          break
        }

        case 'bollinger': {
          const bands = data as number[][]
          const isDarkMode = config.theme === 'dark'
          const color = indicator.color || (isDarkMode ? '#8b5cf6' : '#7c3aed')

          // bands[0] = upper2σ, bands[1] = upper1σ, bands[2] = middle, bands[3] = lower1σ, bands[4] = lower2σ

          // Upper band (2σ)
          series.push({
            type: 'line',
            name: 'Bollinger Upper (2σ)',
            data: chartData.dates.map((date, index) => [date, bands[0][index]]),
            xAxisIndex: 0,
            yAxisIndex: 0,
            lineStyle: { color, width: 1, opacity: 0.8 },
            symbol: 'none',
          })

          // Upper band (1σ)
          series.push({
            type: 'line',
            name: 'Bollinger Upper (1σ)',
            data: chartData.dates.map((date, index) => [date, bands[1][index]]),
            xAxisIndex: 0,
            yAxisIndex: 0,
            lineStyle: { color, width: 1, opacity: 0.5, type: 'dashed' },
            symbol: 'none',
          })

          // Middle line (SMA)
          series.push({
            type: 'line',
            name: 'Bollinger Middle',
            data: chartData.dates.map((date, index) => [date, bands[2][index]]),
            xAxisIndex: 0,
            yAxisIndex: 0,
            lineStyle: { color, width: 2 },
            symbol: 'none',
          })

          // Lower band (1σ)
          series.push({
            type: 'line',
            name: 'Bollinger Lower (1σ)',
            data: chartData.dates.map((date, index) => [date, bands[3][index]]),
            xAxisIndex: 0,
            yAxisIndex: 0,
            lineStyle: { color, width: 1, opacity: 0.5, type: 'dashed' },
            symbol: 'none',
          })

          // Lower band (2σ)
          series.push({
            type: 'line',
            name: 'Bollinger Lower (2σ)',
            data: chartData.dates.map((date, index) => [date, bands[4][index]]),
            xAxisIndex: 0,
            yAxisIndex: 0,
            lineStyle: { color, width: 1, opacity: 0.8 },
            symbol: 'none',
          })
          break
        }

        case 'rsi': {
          const rsiGridIndex = layout.seriesMapping['rsi']
          if (rsiGridIndex !== undefined) {
            const isDarkMode = config.theme === 'dark'
            series.push({
              type: 'line',
              name: 'RSI',
              data: data.map((value, index) => [chartData.dates[index], value]),
              xAxisIndex: rsiGridIndex,
              yAxisIndex: rsiGridIndex,
              lineStyle: {
                color: indicator.color || (isDarkMode ? '#06b6d4' : '#0891b2'),
                width: 2,
              },
              symbol: 'none',
            })
          }
          break
        }

        case 'macd': {
          const macdGridIndex = layout.seriesMapping['macd']
          if (macdGridIndex !== undefined) {
            const macdData = data as number[][]
            const isDarkMode = config.theme === 'dark'

            // MACD Line
            series.push({
              type: 'line',
              name: 'MACD',
              data: macdData.map((item, index) => [chartData.dates[index], item[0]]),
              xAxisIndex: macdGridIndex,
              yAxisIndex: macdGridIndex,
              lineStyle: { color: indicator.color || '#3b82f6', width: 2 },
              symbol: 'none',
            })

            // Signal Line
            series.push({
              type: 'line',
              name: 'Signal',
              data: macdData.map((item, index) => [chartData.dates[index], item[1]]),
              xAxisIndex: macdGridIndex,
              yAxisIndex: macdGridIndex,
              lineStyle: { color: '#f59e0b', width: 2 },
              symbol: 'none',
            })

            // Histogram
            series.push({
              type: 'bar',
              name: 'MACD Histogram',
              data: macdData.map((item, index) => [chartData.dates[index], item[2]]),
              xAxisIndex: macdGridIndex,
              yAxisIndex: macdGridIndex,
              itemStyle: {
                color: function (params: any) {
                  return params.value[1] >= 0
                    ? isDarkMode
                      ? 'rgba(34, 197, 94, 0.8)'
                      : 'rgba(22, 163, 74, 0.8)'
                    : isDarkMode
                      ? 'rgba(239, 68, 68, 0.8)'
                      : 'rgba(220, 38, 38, 0.8)'
                },
              },
            })
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
  }, [processedIndicators, layout.seriesMapping, chartData.dates, config.theme])

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
      log.business.info('Added candlestick series to chart', {
        operation: 'chart_options_refactored',
      })
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
