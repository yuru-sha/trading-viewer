import { useMemo, useCallback, useRef } from 'react'
import * as echarts from 'echarts'
import type { ChartData, PriceStats } from './useChartData'
import { UserIndicator } from '@trading-viewer/shared'

interface OptimizedChartOptionsConfig {
  chartType: 'candle' | 'line' | 'area'
  showVolume: boolean
  showGridlines?: boolean
  enableDrawingTools: boolean
  activeDrawingTool?: string | null
  theme: 'light' | 'dark'
  symbol?: string
  currentPrice?: number
  graphicElements: any[]
  showPeriodHigh?: boolean
  showPeriodLow?: boolean
  indicators?: UserIndicator[]
  performanceMode?: boolean
}

/**
 * 最適化された ECharts オプション生成フック
 * 責任: パフォーマンス重視のチャート設定生成、メモ化、最適化
 */
export const useOptimizedChartOptions = (
  chartData: ChartData,
  priceStats: PriceStats | null,
  config: OptimizedChartOptionsConfig
) => {
  const previousConfigRef = useRef<OptimizedChartOptionsConfig>()
  const previousChartDataRef = useRef<ChartData>()
  const cachedOptionRef = useRef<any>()

  // メモ化されたベース設定
  const baseConfig = useMemo(
    () => ({
      isDarkMode: config.theme === 'dark',
      performanceMode: config.performanceMode ?? false,
      animationEnabled: !config.performanceMode,
    }),
    [config.theme, config.performanceMode]
  )

  // メモ化されたカラーパレット
  const colorPalette = useMemo(
    () => ({
      background: baseConfig.isDarkMode ? '#1f2937' : '#ffffff',
      text: baseConfig.isDarkMode ? '#f9fafb' : '#111827',
      grid: baseConfig.isDarkMode ? '#374151' : '#e5e7eb',
      crosshair: baseConfig.isDarkMode ? '#4b5563' : '#6b7280',
      upColor: '#10b981', // green
      downColor: '#ef4444', // red
      volumeColor: baseConfig.isDarkMode ? '#6b7280' : '#9ca3af',
    }),
    [baseConfig.isDarkMode]
  )

  // メモ化されたグリッド設定
  const gridConfig = useMemo(() => {
    if (!config.showGridlines) return { show: false }

    return {
      show: true,
      left: '8%',
      right: '8%',
      top: '10%',
      bottom: config.showVolume ? '30%' : '10%',
      containLabel: false,
      borderColor: colorPalette.grid,
      borderWidth: 1,
    }
  }, [config.showGridlines, config.showVolume, colorPalette.grid])

  // メモ化されたツールチップ設定
  const tooltipConfig = useMemo(() => {
    const isDrawingActive = config.enableDrawingTools && config.activeDrawingTool

    return {
      trigger: isDrawingActive ? 'none' : 'axis',
      show: !isDrawingActive,
      axisPointer: {
        type: isDrawingActive ? 'none' : 'cross',
        animation: baseConfig.animationEnabled,
        label: {
          backgroundColor: colorPalette.crosshair,
          formatter: (params: any) => {
            if (params.axisDimension === 'y') {
              return `$${params.value.toFixed(2)}`
            }
            return new Date(params.value).toLocaleTimeString()
          },
        },
      },
      backgroundColor: `${colorPalette.background}ee`,
      borderColor: colorPalette.grid,
      textStyle: {
        color: colorPalette.text,
        fontSize: 12,
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return ''

        const data = params[0].data
        if (!data) return ''

        const [time, open, close, low, high, volume] = data
        const date = new Date(time).toLocaleString()

        return `
          <div style="min-width: 200px;">
            <div style="margin-bottom: 8px; font-weight: bold;">${config.symbol || 'Chart'}</div>
            <div>Time: ${date}</div>
            <div>Open: $${open?.toFixed(2) || 'N/A'}</div>
            <div>High: $${high?.toFixed(2) || 'N/A'}</div>
            <div>Low: $${low?.toFixed(2) || 'N/A'}</div>
            <div>Close: $${close?.toFixed(2) || 'N/A'}</div>
            ${volume ? `<div>Volume: ${volume.toLocaleString()}</div>` : ''}
          </div>
        `
      },
    }
  }, [
    config.enableDrawingTools,
    config.activeDrawingTool,
    config.symbol,
    baseConfig.animationEnabled,
    colorPalette,
  ])

  // メモ化された X 軸設定
  const xAxisConfig = useMemo(
    () => ({
      type: 'time',
      scale: true,
      boundaryGap: false,
      axisLine: {
        show: true,
        lineStyle: { color: colorPalette.grid },
      },
      axisTick: {
        show: true,
        lineStyle: { color: colorPalette.grid },
      },
      axisLabel: {
        color: colorPalette.text,
        fontSize: 11,
        formatter: (value: number) => {
          const date = new Date(value)
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        },
      },
      splitLine: {
        show: config.showGridlines,
        lineStyle: {
          color: colorPalette.grid,
          opacity: 0.3,
        },
      },
    }),
    [config.showGridlines, colorPalette]
  )

  // メモ化された Y 軸設定
  const yAxisConfig = useMemo(
    () => [
      {
        type: 'value',
        scale: true,
        position: 'right',
        axisLine: {
          show: true,
          lineStyle: { color: colorPalette.grid },
        },
        axisTick: {
          show: true,
          lineStyle: { color: colorPalette.grid },
        },
        axisLabel: {
          color: colorPalette.text,
          fontSize: 11,
          formatter: (value: number) => `$${value.toFixed(2)}`,
        },
        splitLine: {
          show: config.showGridlines,
          lineStyle: {
            color: colorPalette.grid,
            opacity: 0.3,
          },
        },
      },
      ...(config.showVolume
        ? [
            {
              type: 'value',
              gridIndex: 1,
              scale: true,
              position: 'right',
              axisLine: {
                show: false,
              },
              axisTick: {
                show: false,
              },
              axisLabel: {
                show: false,
              },
              splitLine: {
                show: false,
              },
            },
          ]
        : []),
    ],
    [config.showGridlines, config.showVolume, colorPalette]
  )

  // メモ化されたシリーズ設定
  const seriesConfig = useMemo(() => {
    const series: any[] = []

    // メインチャートシリーズ
    if (config.chartType === 'candle') {
      series.push({
        name: 'Price',
        type: 'candlestick',
        data: chartData.candleData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: colorPalette.upColor,
          color0: colorPalette.downColor,
          borderColor: colorPalette.upColor,
          borderColor0: colorPalette.downColor,
        },
        animation: baseConfig.animationEnabled,
        large: config.performanceMode,
        largeThreshold: config.performanceMode ? 1000 : 2000,
      })
    } else if (config.chartType === 'line') {
      series.push({
        name: 'Price',
        type: 'line',
        data: chartData.lineData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: colorPalette.upColor,
          width: 2,
        },
        animation: baseConfig.animationEnabled,
        large: config.performanceMode,
        largeThreshold: config.performanceMode ? 1000 : 2000,
      })
    } else if (config.chartType === 'area') {
      series.push({
        name: 'Price',
        type: 'line',
        data: chartData.lineData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${colorPalette.upColor}80` },
            { offset: 1, color: `${colorPalette.upColor}10` },
          ]),
        },
        lineStyle: {
          color: colorPalette.upColor,
          width: 2,
        },
        animation: baseConfig.animationEnabled,
        large: config.performanceMode,
        largeThreshold: config.performanceMode ? 1000 : 2000,
      })
    }

    // ボリュームシリーズ
    if (config.showVolume && chartData.volumeData) {
      series.push({
        name: 'Volume',
        type: 'bar',
        data: chartData.volumeData,
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: colorPalette.volumeColor,
        },
        animation: baseConfig.animationEnabled,
        large: config.performanceMode,
        largeThreshold: config.performanceMode ? 500 : 1000,
      })
    }

    // インジケーターシリーズ
    if (config.indicators && chartData.indicatorData) {
      config.indicators.forEach((indicator, index) => {
        const indicatorData = chartData.indicatorData[indicator.type]
        if (indicatorData) {
          series.push({
            name: indicator.name || indicator.type,
            type: 'line',
            data: indicatorData,
            xAxisIndex: 0,
            yAxisIndex: 0,
            smooth: true,
            symbol: 'none',
            lineStyle: {
              color: indicator.color || `hsl(${index * 60}, 70%, 50%)`,
              width: indicator.lineWidth || 1,
            },
            animation: baseConfig.animationEnabled,
            large: config.performanceMode,
          })
        }
      })
    }

    return series
  }, [
    config.chartType,
    config.showVolume,
    config.indicators,
    config.performanceMode,
    chartData,
    colorPalette,
    baseConfig.animationEnabled,
  ])

  // メインオプション生成（深い比較でメモ化）
  const option = useMemo(() => {
    // 前回の設定とデータをチェックして、変更がない場合はキャッシュを返す
    const configChanged = JSON.stringify(config) !== JSON.stringify(previousConfigRef.current)
    const dataChanged = JSON.stringify(chartData) !== JSON.stringify(previousChartDataRef.current)

    if (!configChanged && !dataChanged && cachedOptionRef.current) {
      return cachedOptionRef.current
    }

    const newOption = {
      backgroundColor: colorPalette.background,
      animation: baseConfig.animationEnabled,
      animationDuration: baseConfig.animationEnabled ? 300 : 0,
      legend: {
        show: false,
      },
      tooltip: tooltipConfig,
      grid: [
        gridConfig,
        ...(config.showVolume
          ? [
              {
                ...gridConfig,
                top: '70%',
                bottom: '10%',
                height: '20%',
              },
            ]
          : []),
      ],
      xAxis: [
        xAxisConfig,
        ...(config.showVolume
          ? [
              {
                ...xAxisConfig,
                gridIndex: 1,
                axisLabel: { ...xAxisConfig.axisLabel, show: true },
              },
            ]
          : []),
      ],
      yAxis: yAxisConfig,
      series: seriesConfig,
      graphic: config.graphicElements || [],
      // パフォーマンス最適化設定
      ...(config.performanceMode && {
        progressive: 1000,
        progressiveThreshold: 3000,
      }),
    }

    // キャッシュを更新
    cachedOptionRef.current = newOption
    previousConfigRef.current = config
    previousChartDataRef.current = chartData

    return newOption
  }, [
    config,
    chartData,
    colorPalette,
    baseConfig,
    tooltipConfig,
    gridConfig,
    xAxisConfig,
    yAxisConfig,
    seriesConfig,
  ])

  // オプション更新用のコールバック
  const updateOption = useCallback(
    (updates: Partial<any>) => {
      if (!cachedOptionRef.current) return option

      const updatedOption = {
        ...cachedOptionRef.current,
        ...updates,
      }

      cachedOptionRef.current = updatedOption
      return updatedOption
    },
    [option]
  )

  // パフォーマンス統計
  const getPerformanceStats = useCallback(() => {
    const dataPoints = chartData.candleData?.length || 0
    const seriesCount = seriesConfig.length
    const hasLargeDataset = dataPoints > 1000

    return {
      dataPoints,
      seriesCount,
      hasLargeDataset,
      performanceMode: config.performanceMode,
      recommendPerformanceMode: dataPoints > 2000,
    }
  }, [chartData.candleData, seriesConfig.length, config.performanceMode])

  return {
    option,
    updateOption,
    getPerformanceStats,
    colorPalette,
    baseConfig,
  }
}
