import { useMemo } from 'react'
import * as echarts from 'echarts'
import type { ChartData, PriceStats } from './useChartData'

interface ChartOptionsConfig {
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
}

/**
 * ECharts オプション生成フック
 * 責任: チャート設定の生成、テーマ適用、シリーズ構成
 */
export const useChartOptions = (
  chartData: ChartData,
  priceStats: PriceStats | null,
  config: ChartOptionsConfig
) => {
  // Generate chart options
  const option = useMemo(() => {
    const isDarkMode = config.theme === 'dark'

    const baseOption: any = {
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      animation: false,
      legend: {
        show: false,
      },
      tooltip: {
        trigger: config.enableDrawingTools && config.activeDrawingTool ? 'none' : 'axis',
        show: !(config.enableDrawingTools && config.activeDrawingTool),
        axisPointer: {
          type: config.enableDrawingTools && config.activeDrawingTool ? 'none' : 'cross',
          animation: false,
          label: {
            backgroundColor: isDarkMode ? '#4b5563' : '#6b7280',
            formatter: (params: any) => {
              if (params.axisDimension === 'y') {
                return `$${params.value.toFixed(2)}`
              }
              return params.value
            },
          },
        },
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: isDarkMode ? '#374151' : '#d1d5db',
        textStyle: {
          color: isDarkMode ? '#f9fafb' : '#111827',
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return ''

          const data = params[0]
          if (!data) return ''

          const value = data.data
          if (Array.isArray(value) && value.length >= 4) {
            // Candlestick data [open, close, low, high]
            return `
              <div style="padding: 8px;">
                <div style="font-weight: bold; margin-bottom: 4px;">${data.name}</div>
                <div>Open: $${value[0].toFixed(2)}</div>
                <div>High: $${value[3].toFixed(2)}</div>
                <div>Low: $${value[2].toFixed(2)}</div>
                <div>Close: $${value[1].toFixed(2)}</div>
              </div>
            `
          } else if (typeof value === 'number') {
            // Line/Area data
            return `
              <div style="padding: 8px;">
                <div style="font-weight: bold; margin-bottom: 4px;">${data.name}</div>
                <div>Price: $${value.toFixed(2)}</div>
              </div>
            `
          }

          return ''
        },
      },
      axisPointer:
        config.enableDrawingTools && config.activeDrawingTool
          ? {
              show: false,
            }
          : {
              link: [{ xAxisIndex: 'all' }],
              label: {
                backgroundColor: isDarkMode ? '#4b5563' : '#6b7280',
                color: '#ffffff',
                formatter: (params: any) => {
                  if (params.axisDimension === 'y') {
                    return `$${params.value.toFixed(2)}`
                  }
                  return params.value
                },
              },
            },
      grid: config.showVolume
        ? [
            {
              left: '2%',
              right: '6%',
              top: '2%',
              height: '70%',
              show: true,
              borderWidth: 0,
              backgroundColor: 'transparent',
            },
            {
              left: '2%',
              right: '6%',
              top: '75%',
              height: '18%',
              show: true,
              borderWidth: 0,
              backgroundColor: 'transparent',
            },
          ]
        : [
            {
              left: '2%',
              right: '6%',
              top: '2%',
              height: '93%',
              show: true,
              borderWidth: 0,
              backgroundColor: 'transparent',
            },
          ],
      xAxis: config.showVolume
        ? [
            {
              type: 'category',
              data: chartData.dates,
              boundaryGap: ['0%', '20%'],
              axisTick: { alignWithLabel: true },
              axisLine: { onZero: false, lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' } },
              splitLine: {
                show: config.showGridlines !== false,
                lineStyle: {
                  color: isDarkMode ? '#374151' : '#e5e7eb',
                  width: 1,
                  type: 'solid' as const,
                  opacity: 0.6,
                },
              },
              axisLabel: {
                show: false,
                color: isDarkMode ? '#9ca3af' : '#6b7280',
              },
              min: 'dataMin',
              max: 'dataMax',
              splitNumber: 8, // X 軸のグリッド線数を調整
            },
            {
              type: 'category',
              gridIndex: 1,
              data: chartData.dates,
              boundaryGap: false,
              axisLine: { onZero: false, lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' } },
              axisTick: { alignWithLabel: true },
              splitLine: {
                show: config.showGridlines !== false,
                lineStyle: {
                  color: isDarkMode ? '#374151' : '#e5e7eb',
                  width: 1,
                  type: 'solid' as const,
                  opacity: 0.4,
                },
              },
              axisLabel: {
                show: true,
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                formatter: (value: string) => {
                  if (value.includes(' ')) {
                    const parts = value.split(' ')
                    return parts[0]
                  }
                  return value
                },
              },
              min: 'dataMin',
              max: 'dataMax',
              splitNumber: 8,
            },
          ]
        : [
            {
              type: 'category',
              data: chartData.dates,
              boundaryGap: ['0%', '20%'],
              axisLine: { lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' } },
              axisTick: { alignWithLabel: true },
              splitLine: {
                show: config.showGridlines !== false,
                lineStyle: {
                  color: isDarkMode ? '#374151' : '#e5e7eb',
                  width: 1,
                  type: 'solid' as const,
                  opacity: 0.6,
                },
              },
              axisLabel: {
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                formatter: (value: string) => {
                  if (value.includes(' ')) {
                    const parts = value.split(' ')
                    return parts[0]
                  }
                  return value
                },
              },
              min: 'dataMin',
              max: 'dataMax',
              splitNumber: 8, // X 軸のグリッド線数を調整
            },
          ],
      yAxis: generateYAxisConfig(config, isDarkMode, priceStats, config.currentPrice),
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: config.showVolume ? [0, 1] : [0],
          start: 0,
          end: 100,
          filterMode: 'filter',
        },
      ],
      series: [] as any[],
      graphic: config.graphicElements,
    }

    // Add main series based on chart type
    if (config.chartType === 'candle') {
      const candlestickSeries = createCandlestickSeries(
        chartData,
        config.symbol,
        priceStats,
        config.currentPrice,
        config.showPeriodHigh,
        config.showPeriodLow
      )
      baseOption.series.push(candlestickSeries)
    } else if (config.chartType === 'line') {
      const lineSeries = createLineSeries(
        chartData,
        config.symbol,
        priceStats,
        config.currentPrice,
        config.showPeriodHigh,
        config.showPeriodLow
      )
      baseOption.series.push(lineSeries)
    } else {
      // area
      const areaSeries = createAreaSeries(
        chartData,
        config.symbol,
        priceStats,
        config.currentPrice,
        config.showPeriodHigh,
        config.showPeriodLow
      )
      baseOption.series.push(areaSeries)
    }

    // Add volume series if enabled
    if (config.showVolume) {
      baseOption.series.push({
        name: 'Volume',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: chartData.volumes,
        barWidth: '60%',
      })
    }

    return baseOption
  }, [
    chartData.dates.length,
    chartData.values.length,
    config.showVolume,
    config.showGridlines,
    config.currentPrice,
    config.theme,
    config.symbol,
    config.chartType,
    config.enableDrawingTools,
    config.graphicElements,
    config.showPeriodHigh,
    config.showPeriodLow,
    // priceStats の個別プロパティを監視（オブジェクト全体ではなく）
    priceStats?.high,
    priceStats?.low,
    priceStats?.close,
    priceStats?.change,
    priceStats?.changePercent,
    priceStats?.periodHigh,
    priceStats?.periodLow,
  ])

  return { option }
}

// Y 軸設定生成
/**
 * キリの良い間隔を計算する関数
 * 価格差とグリッド数に基づいて、xxx.00, xxx.50 のようなキリの良い値を返す
 */
function calculateNiceInterval(range: number, targetSplits: number): number {
  const rawInterval = range / targetSplits

  // 基本単位を決定（0.01, 0.05, 0.1, 0.5, 1, 5, 10, 50, 100 など）
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)))
  const normalizedInterval = rawInterval / magnitude

  let niceInterval: number

  if (normalizedInterval <= 1) {
    niceInterval = 1
  } else if (normalizedInterval <= 2.5) {
    niceInterval = 2.5
  } else if (normalizedInterval <= 5) {
    niceInterval = 5
  } else {
    niceInterval = 10
  }

  return niceInterval * magnitude
}

/**
 * キリの良い境界値を計算する関数
 * 価格を xxx.00, xxx.50 のような値に丸める
 */
function calculateNiceBounds(
  min: number,
  max: number,
  interval: number
): { niceMin: number; niceMax: number } {
  const niceMin = Math.floor(min / interval) * interval
  const niceMax = Math.ceil(max / interval) * interval

  return { niceMin, niceMax }
}

function generateYAxisConfig(
  config: ChartOptionsConfig,
  isDarkMode: boolean,
  priceStats: PriceStats | null,
  currentPrice?: number
) {
  const baseYAxisConfig = {
    scale: true,
    position: 'right' as const,
    axisLine: { lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' } },
    axisTick: { show: false },
    splitLine: {
      show: true,
      lineStyle: {
        color: isDarkMode ? '#374151' : '#e5e7eb',
        width: 1,
        type: 'solid' as const,
        opacity: 0.6, // グリッド線の透明度を調整
      },
    },

    axisPointer: config.enableDrawingTools
      ? {
          show: false,
        }
      : {
          label: {
            formatter: (params: any) => {
              return `$${params.value.toFixed(2)}`
            },
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            borderColor: isDarkMode ? '#374151' : '#d1d5db',
            color: isDarkMode ? '#f9fafb' : '#111827',
          },
        },
    min: (value: any) => {
      if (!priceStats) return value.min
      // 安値を確実に含むように調整
      const padding = (priceStats.high - priceStats.low) * 0.05
      return Math.min(value.min, priceStats.low - padding)
    },
    max: (value: any) => {
      if (!priceStats) return value.max
      // 高値を確実に含むように調整
      const padding = (priceStats.high - priceStats.low) * 0.05
      return Math.max(value.max, priceStats.high + padding)
    },
    splitNumber: 10, // グリッド線の数を調整
    interval: priceStats ? calculateNiceInterval(priceStats.high - priceStats.low, 10) : undefined, // キリの良い間隔を計算
    // Y 軸の目盛りを明示的に指定し、重要な価格レベルを含める
    ...(priceStats && {
      type: 'value',
      scale: true, // 自動スケーリングを有効化
      splitNumber: 10, // 目盛り数を指定
      interval: calculateNiceInterval(priceStats.high - priceStats.low, 10), // キリの良い間隔
      min: (() => {
        const allLows = [priceStats.low, priceStats.periodLow].filter(
          (val): val is number => typeof val === 'number'
        )
        const minLow = allLows.length > 0 ? Math.min(...allLows) : priceStats.low
        const range = priceStats.high - priceStats.low
        const paddedMin = minLow - range * 0.05
        const interval = calculateNiceInterval(range, 10)
        const { niceMin } = calculateNiceBounds(paddedMin, priceStats.high, interval)
        return niceMin
      })(),
      max: (() => {
        const allHighs = [priceStats.high, priceStats.periodHigh].filter(
          (val): val is number => typeof val === 'number'
        )
        const maxHigh = allHighs.length > 0 ? Math.max(...allHighs) : priceStats.high
        const range = priceStats.high - priceStats.low
        const paddedMax = maxHigh + range * 0.05
        const interval = calculateNiceInterval(range, 10)
        const { niceMax } = calculateNiceBounds(priceStats.low, paddedMax, interval)
        return niceMax
      })(),
      splitLine: {
        show: true,
        lineStyle: {
          color: isDarkMode ? '#374151' : '#e5e7eb',
          width: 1,
          type: 'solid' as const,
          opacity: 0.6, // グリッド線を少し薄くして視認性向上
        },
      },
      axisLabel: {
        color: isDarkMode ? '#9ca3af' : '#6b7280',
        inside: false,
        margin: 8,
        fontSize: 11,
        formatter: (value: number) => {
          const currentValue = currentPrice || priceStats.close
          const tolerance = 1.0

          // 現在値の判定のみ（52 週高値・安値は markLine で表示）
          if (Math.abs(value - currentValue) <= tolerance) {
            return `{current|${value.toFixed(2)}}`
          }

          return value.toFixed(2)
        },
        rich: {
          current: {
            color: '#ffffff',
            backgroundColor: '#10b981', // 現在値は緑
            padding: [2, 4],
            borderRadius: 2,
          },
        },
      },
    }),
  }

  if (config.showVolume) {
    return [
      baseYAxisConfig,
      {
        scale: true,
        position: 'right' as const,
        gridIndex: 1,
        splitNumber: 6, // ボリュームチャートのグリッド線も調整
        axisLabel: { show: false },
        axisLine: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: isDarkMode ? '#374151' : '#e5e7eb',
            width: 1,
            type: 'solid' as const,
            opacity: 0.4, // ボリュームのグリッド線はさらに薄く
          },
        },
        min: 'dataMin' as const,
        max: 'dataMax' as const,
      },
    ]
  } else {
    return [baseYAxisConfig]
  }
}

// Candlestick series creation
function createCandlestickSeries(
  chartData: ChartData,
  symbol?: string,
  priceStats?: PriceStats | null,
  currentPrice?: number,
  showPeriodHigh?: boolean,
  showPeriodLow?: boolean
) {
  const candlestickSeries: any = {
    name: symbol || 'Price',
    type: 'candlestick',
    data: chartData.values,
    barWidth: '60%',
    itemStyle: {
      color: '#10b981',
      color0: '#ef4444',
      borderColor: '#10b981',
      borderColor0: '#ef4444',
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

  return candlestickSeries
}

// Line series creation
function createLineSeries(
  chartData: ChartData,
  symbol?: string,
  priceStats?: PriceStats | null,
  currentPrice?: number,
  showPeriodHigh?: boolean,
  showPeriodLow?: boolean
) {
  const lineSeries: any = {
    name: symbol || 'Price',
    type: 'line',
    data: chartData.values,
    smooth: true,
    symbol: 'none',
    lineStyle: {
      color: '#3b82f6',
      width: 2,
    },
  }

  // Add price lines similar to candlestick
  if (priceStats) {
    lineSeries.markLine = createMarkLine(priceStats, currentPrice, showPeriodHigh, showPeriodLow)
  }

  return lineSeries
}

// Area series creation
function createAreaSeries(
  chartData: ChartData,
  symbol?: string,
  priceStats?: PriceStats | null,
  currentPrice?: number,
  showPeriodHigh?: boolean,
  showPeriodLow?: boolean
) {
  const areaSeries: any = {
    name: symbol || 'Price',
    type: 'line',
    data: chartData.values,
    smooth: true,
    symbol: 'none',
    lineStyle: {
      color: '#3b82f6',
      width: 2,
    },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(59, 130, 246, 0.25)' },
        { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
      ]),
    },
  }

  // Add price lines similar to candlestick
  if (priceStats) {
    areaSeries.markLine = createMarkLine(priceStats, currentPrice, showPeriodHigh, showPeriodLow)
  }

  return areaSeries
}

// Mark line creation helper
function createMarkLine(
  priceStats: PriceStats,
  currentPrice?: number,
  showPeriodHigh?: boolean,
  showPeriodLow?: boolean
) {
  return {
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
          color: '#10b981',
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

export default useChartOptions
