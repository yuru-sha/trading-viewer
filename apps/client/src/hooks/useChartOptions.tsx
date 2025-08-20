import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as echarts from 'echarts'
import type { ChartData, PriceStats } from './useChartData'
import { UserIndicator } from '@trading-viewer/shared'
import { useIndicators } from './useIndicators'
import { useIndicatorCalculations } from './useIndicatorCalculations'

interface ChartOptionsConfig {
  chartType: 'candle' | 'line' | 'area'
  showVolume: boolean
  showGridlines?: boolean
  enableDrawingTools: boolean
  activeDrawingTool?: string | null
  theme: 'light' | 'dark'
  symbol?: string
  timeframe?: string
  currentPrice?: number
  graphicElements: any[]
  showPeriodHigh?: boolean
  showPeriodLow?: boolean
  indicators?: UserIndicator[]
}

/**
 * ECharts オプション生成フック
 * 責任: チャート設定の生成、テーマ適用、シリーズ構成
 */
export function useChartOptions(
  chartData: ChartData,
  priceStats: PriceStats | null,
  config: ChartOptionsConfig
) {
  // Fetch indicators for the current symbol and timeframe
  const { data: indicators = [], isLoading: indicatorsLoading } = useQuery({
    queryKey: ['indicators', config.symbol, config.timeframe],
    queryFn: async () => {
      if (!config.symbol || !config.timeframe) return []
      const response = await fetch(`/api/indicators?symbol=${config.symbol}&timeframe=${config.timeframe}`)
      if (!response.ok) throw new Error('Failed to fetch indicators')
      return response.json()
    },
    enabled: Boolean(config.symbol && config.timeframe),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch indicator calculations
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

  console.log('📊 useChartOptions: ALL indicators received:', indicators)
  console.log('📊 useChartOptions: Indicators count:', indicators.length)

  // Only log when there are indicators
  if (indicators.length > 0) {
    console.log('📊 useChartOptions: Found', indicators.length, 'indicators for', config.symbol)
    console.log(
      '📊 useChartOptions: Calculations:',
      Object.keys(indicatorCalculations).length,
      'ready'
    )
    console.log(
      '📊 useChartOptions: Available calculation keys:',
      Object.keys(indicatorCalculations)
    )
    console.log(
      '📊 useChartOptions: RSI calculations available:',
      Object.keys(indicatorCalculations).filter(key => key.includes('rsi'))
    )
  }

  // Generate chart options
  const option = useMemo(() => {
    const isDarkMode = config.theme === 'dark'

    // 🔥 DEBUG: チャートタイプをログに出力
    console.log('🚨 GEMINI PATTERN: Chart type:', config.chartType)
    console.log('🚨 GEMINI PATTERN: Current indicators:', indicators.map(i => ({ 
      id: i.id, 
      name: i.name, 
      type: i.type, 
      visible: i.visible 
    })))

    // RSI インジケーターが有効かつ表示中かどうかをチェック
    const hasRSI = indicators.some(
      indicator => indicator.type === 'rsi' && indicator.visible === true
    )
    console.log(
      '📊 RSI Check: hasRSI =',
      hasRSI,
      'indicators:',
      indicators.map(i => ({ type: i.type, visible: i.visible }))
    )

    // MACD インジケーターが有効かつ表示中かどうかをチェック
    const hasMACD = indicators.some(
      indicator => indicator.type === 'macd' && indicator.visible === true
    )
    console.log(
      '📊 MACD Check: hasMACD =',
      hasMACD,
      'indicators:',
      indicators.map(i => ({ type: i.type, visible: i.visible }))
    )

    // 🚨 GEMINI PATTERN: 明確なグリッド構造 [Main, Volume?, RSI?, MACD?]
    const gridConfigs = []
    let gridCount = 0

    // Main chart (always present)
    gridConfigs.push({
      left: '3%',
      right: '6%',
      top: '2%',
      height: config.showVolume || hasRSI || hasMACD ? '50%' : '93%',
    })
    gridCount++

    // Volume grid (if enabled)
    if (config.showVolume) {
      gridConfigs.push({
        left: '3%',
        right: '6%',
        top: '55%',
        height: '10%',
      })
      gridCount++
    }

    // RSI grid (if enabled)
    if (hasRSI) {
      const topPosition = config.showVolume ? '68%' : '55%'
      gridConfigs.push({
        left: '3%',
        right: '6%',
        top: topPosition,
        height: '12%',
      })
      gridCount++
    }

    // MACD grid (if enabled)
    if (hasMACD) {
      let topPosition = '55%'
      if (config.showVolume && hasRSI) topPosition = '83%'
      else if (config.showVolume) topPosition = '68%'
      else if (hasRSI) topPosition = '70%'

      gridConfigs.push({
        left: '3%',
        right: '6%',
        top: topPosition,
        height: '12%',
      })
      gridCount++
    }

    console.log('🚨 GEMINI PATTERN: Grid structure:', {
      chartType: config.chartType,
      totalGrids: gridCount,
      showVolume: config.showVolume,
      hasRSI,
      hasMACD,
      configs: gridConfigs.map((grid, index) => ({
        index,
        top: grid.top,
        height: grid.height,
        type: index === 0 ? 'Main' :
              index === 1 && config.showVolume ? 'Volume' :
              index === 1 && !config.showVolume && hasRSI ? 'RSI' :
              index === 1 && !config.showVolume && hasMACD ? 'MACD' :
              'SubChart'
      }))
    })

    // 🚨 GEMINI PATTERN: X 軸設定 - 各グリッドに 1 つの X 軸
    const xAxes = gridConfigs.map((_, index) => ({
      type: 'category',
      data: chartData.dates,
      gridIndex: index,
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      axisLabel: { 
        show: index === gridCount - 1, // Only show labels on bottom-most chart
        color: isDarkMode ? '#9ca3af' : '#6b7280',
        fontSize: 11,
      },
      min: 'dataMin',
      max: 'dataMax',
    }))

    // 🚨 GEMINI PATTERN: Y 軸設定 - 各グリッドに 1 つの Y 軸
    const yAxes = gridConfigs.map((_, index) => {
      if (index === 0) {
        // Main chart Y-axis - 右側に配置
        return {
          scale: true,
          gridIndex: index,
          position: 'right', // Y 軸ラベルを右側に移動
          splitArea: { show: false }, // 背景色の縞模様を無効化
          splitLine: {
            show: true,
            lineStyle: {
              color: isDarkMode ? '#374151' : '#e5e7eb',
              width: 1,
              type: 'solid',
              opacity: 0.6,
            },
          },
          axisLabel: {
            color: isDarkMode ? '#9ca3af' : '#6b7280',
            fontSize: 11,
          },
        }
      } else if (index === 1 && config.showVolume) {
        // Volume Y-axis - 右側に配置
        return {
          scale: true,
          gridIndex: index,
          position: 'right',
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        }
      } else {
        // RSI/MACD Y-axis - 右側に配置
        return {
          scale: true,
          gridIndex: index,
          position: 'right',
          splitNumber: 2,
          axisLabel: { 
            show: true,
            color: isDarkMode ? '#9ca3af' : '#6b7280',
            fontSize: 10,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        }
      }
    })

    const baseOption: any = {
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
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
      grid: gridConfigs,
      xAxis: xAxes,
      yAxis: yAxes,
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: Array.from({ length: gridCount }, (_, i) => i), // All X-axes
          start: 0,
          end: 100,
          filterMode: 'filter',
        },
      ],
      series: [] as any[],
      graphic: config.graphicElements,
    }

    console.log('🚨 GEMINI PATTERN: Final chart structure:', {
      chartType: config.chartType,
      totalGrids: baseOption.grid.length,
      totalXAxes: baseOption.xAxis.length,
      totalYAxes: baseOption.yAxis.length,
      dataZoomXAxes: baseOption.dataZoom[0].xAxisIndex,
    })

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
      candlestickSeries.xAxisIndex = 0
      candlestickSeries.yAxisIndex = 0
      baseOption.series.push(candlestickSeries)
      console.log('🚨 GEMINI PATTERN: Added candlestick series')
    } else if (config.chartType === 'line') {
      const lineSeries = createLineSeries(
        chartData,
        config.symbol,
        priceStats,
        config.currentPrice,
        config.showPeriodHigh,
        config.showPeriodLow
      )
      lineSeries.xAxisIndex = 0
      lineSeries.yAxisIndex = 0
      baseOption.series.push(lineSeries)
      console.log('🚨 GEMINI PATTERN: Added line series')
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
      areaSeries.xAxisIndex = 0
      areaSeries.yAxisIndex = 0
      baseOption.series.push(areaSeries)
      console.log('🚨 GEMINI PATTERN: Added area series')
    }

    // Add volume series if enabled
    if (config.showVolume) {
      const volumeIndex = 1 // Volume is always at index 1 when enabled
      baseOption.series.push({
        name: 'Volume',
        type: 'bar',
        xAxisIndex: volumeIndex,
        yAxisIndex: volumeIndex,
        data: chartData.volumes,
        barWidth: '60%',
        itemStyle: {
          color: '#10b981',
        },
      })
      console.log('🚨 GEMINI PATTERN: Volume series:', {
        xAxisIndex: volumeIndex,
        yAxisIndex: volumeIndex,
      })
    }

    // Add indicator series from API data
    const indicatorSeries = createIndicatorSeries(
      chartData,
      indicators,
      indicatorCalculations,
      config,
      gridCount
    )
    console.log('🔍 Generated indicator series:', indicatorSeries.length, 'series')
    baseOption.series.push(...indicatorSeries)

    console.log('🚨 GEMINI PATTERN: Final option.series count:', baseOption.series.length)
    console.log(
      '🚨 GEMINI PATTERN: All series names and indices:',
      baseOption.series.map(s => ({
        name: s.name || s.type,
        xAxisIndex: s.xAxisIndex,
        yAxisIndex: s.yAxisIndex,
        type: s.type
      }))
    )

    return baseOption
  }, [
    // Minimal safe dependencies
    chartData,
    config,
    priceStats,
    indicators,
    indicatorCalculations,
    indicatorsLoading,
    calculationsLoading,
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
  currentPrice?: number,
  indicators: UserIndicator[] = []
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

    axisPointer:
      config.enableDrawingTools && config.activeDrawingTool && config.activeDrawingTool !== 'select'
        ? {
            show: false,
          }
        : {
            label: {
              formatter: (params: any) => {
                return params.value.toFixed(2)
              },
              backgroundColor: isDarkMode ? '#4b5563' : '#6b7280',
              borderColor: isDarkMode ? '#374151' : '#d1d5db',
              color: isDarkMode ? '#f9fafb' : '#111827',
              fontSize: 11,
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

  // RSI と MACD が表示されているかを確認
  const hasRSI = indicators.some(
    indicator => indicator.type === 'rsi' && indicator.visible === true
  )
  const hasMACD = indicators.some(
    indicator => indicator.type === 'macd' && indicator.visible === true
  )

  const yAxisArray = [baseYAxisConfig]

  if (config.showVolume) {
    // Volume 用の yAxis
    yAxisArray.push({
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
    })

    // RSI 用の yAxis (Volume ON 時は gridIndex: 2)
    if (hasRSI) {
      yAxisArray.push({
        scale: true,
        position: 'right' as const,
        gridIndex: 2,
        splitNumber: 4,
        axisLabel: {
          show: true,
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          fontSize: 10,
        },
        axisLine: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: isDarkMode ? '#374151' : '#e5e7eb',
            width: 1,
            type: 'solid' as const,
            opacity: 0.3,
          },
        },
        min: 0,
        max: 100,
      })
    }

    // MACD 用の yAxis (Volume ON 時は gridIndex: 3、RSI がない場合は gridIndex: 2)
    if (hasMACD) {
      yAxisArray.push({
        scale: true,
        position: 'right' as const,
        gridIndex: hasRSI ? 3 : 2,
        splitNumber: 4,
        axisLabel: {
          show: true,
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          fontSize: 10,
        },
        axisLine: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: isDarkMode ? '#374151' : '#e5e7eb',
            width: 1,
            type: 'solid' as const,
            opacity: 0.3,
          },
        },
        min: 'dataMin' as const,
        max: 'dataMax' as const,
      })
    }
  } else {
    // Volume OFF 時
    // RSI 用の yAxis (Volume OFF 時は gridIndex: 1)
    if (hasRSI) {
      yAxisArray.push({
        scale: true,
        position: 'right' as const,
        gridIndex: 1,
        splitNumber: 4,
        axisLabel: {
          show: true,
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          fontSize: 10,
        },
        axisLine: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: isDarkMode ? '#374151' : '#e5e7eb',
            width: 1,
            type: 'solid' as const,
            opacity: 0.3,
          },
        },
        min: 0,
        max: 100,
      })
    }

    // MACD 用の yAxis (Volume OFF 時は gridIndex: 2、RSI がない場合は gridIndex: 1)
    if (hasMACD) {
      yAxisArray.push({
        scale: true,
        position: 'right' as const,
        gridIndex: hasRSI ? 2 : 1,
        splitNumber: 4,
        axisLabel: {
          show: true,
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          fontSize: 10,
        },
        axisLine: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: isDarkMode ? '#374151' : '#e5e7eb',
            width: 1,
            type: 'solid' as const,
            opacity: 0.3,
          },
        },
        min: 'dataMin' as const,
        max: 'dataMax' as const,
      })
    }
  }

  return yAxisArray
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
  // 🚨 GEMINI FIX: ラインチャート用にデータ形式を正規化
  // ローソク足データ [始値, 高値, 安値, 終値] から終値のみを抽出
  const lineData = chartData.values.map((item: any) => {
    if (Array.isArray(item) && item.length >= 4) {
      // ローソク足形式の場合、終値（インデックス 3）を使用
      return item[3] // 終値
    } else if (typeof item === 'number') {
      // 単純な数値の場合はそのまま使用
      return item
    } else {
      // その他の場合は 0 を返す（安全な処理）
      console.warn('🚨 GEMINI FIX: Unexpected data format for line chart:', item)
      return 0
    }
  })

  console.log('🚨 GEMINI FIX: Line series data conversion:', {
    originalLength: chartData.values.length,
    convertedLength: lineData.length,
    originalSample: chartData.values.slice(0, 3),
    convertedSample: lineData.slice(0, 3),
  })

  const lineSeries: any = {
    name: symbol || 'Price',
    type: 'line',
    data: lineData, // 正規化されたデータを使用
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
  // 🚨 GEMINI FIX: エリアチャート用にデータ形式を正規化
  // ローソク足データ [始値, 高値, 安値, 終値] から終値のみを抽出
  const areaData = chartData.values.map((item: any) => {
    if (Array.isArray(item) && item.length >= 4) {
      // ローソク足形式の場合、終値（インデックス 3）を使用
      return item[3] // 終値
    } else if (typeof item === 'number') {
      // 単純な数値の場合はそのまま使用
      return item
    } else {
      // その他の場合は 0 を返す（安全な処理）
      console.warn('🚨 GEMINI FIX: Unexpected data format for area chart:', item)
      return 0
    }
  })

  console.log('🚨 GEMINI FIX: Area series data conversion:', {
    originalLength: chartData.values.length,
    convertedLength: areaData.length,
    originalSample: chartData.values.slice(0, 3),
    convertedSample: areaData.slice(0, 3),
  })

  const areaSeries: any = {
    name: symbol || 'Price',
    type: 'line',
    data: areaData, // 正規化されたデータを使用
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

// Indicator series creation
function createIndicatorSeries(
  chartData: ChartData,
  indicators: UserIndicator[],
  calculations: Record<string, any> = {},
  config: ChartOptionsConfig,
  gridCount: number
) {
  console.log('🚨 GEMINI PATTERN: createIndicatorSeries called with:', {
    chartDataLength: chartData?.values?.length || 0,
    indicatorsCount: indicators?.length || 0,
    calculationsCount: Object.keys(calculations || {}).length,
    gridCount,
    indicators: indicators?.map(i => ({ id: i.id, name: i.name, visible: i.visible, type: i.type })) || [],
  })

  const series: any[] = []

  // RSI と MACD が表示されているかを確認
  const hasRSI = indicators.some(
    indicator => indicator.type === 'rsi' && indicator.visible === true
  )
  const hasMACD = indicators.some(
    indicator => indicator.type === 'macd' && indicator.visible === true
  )

  console.log('🚨 GEMINI PATTERN: Chart configuration:', {
    showVolume: config.showVolume,
    hasRSI,
    hasMACD,
    gridCount,
  })

  // 🚨 GEMINI PATTERN: インデックス計算 [Main, Volume?, RSI?, MACD?]
  let rsiGridIndex = -1
  let macdGridIndex = -1

  let currentIndex = 0
  
  // Main chart at index 0
  currentIndex++

  // Volume at index 1 if enabled
  if (config.showVolume) {
    currentIndex++
  }

  // RSI at next available index
  if (hasRSI) {
    rsiGridIndex = currentIndex
    currentIndex++
  }

  // MACD at next available index
  if (hasMACD) {
    macdGridIndex = currentIndex
    currentIndex++
  }

  console.log('🚨 GEMINI PATTERN: Grid index calculation:', {
    rsiGridIndex,
    macdGridIndex,
    totalGrids: gridCount,
    showVolume: config.showVolume,
    hasRSI,
    hasMACD,
  })

  indicators.forEach(indicator => {
    console.log('🔍 Processing indicator:', {
      id: indicator.id,
      name: indicator.name,
      visible: indicator.visible,
      type: indicator.type,
    })

    if (!indicator.visible) {
      console.log('⚠️ Indicator not visible, skipping:', indicator.name)
      return
    }

    // API 計算結果を優先、フォールバックでローカル計算
    const calculationResult = calculations[indicator.id]
    console.log('🔍 Calculation result for', indicator.name, ':', {
      hasCalculationResult: !!calculationResult,
      calculationKeys: calculationResult ? Object.keys(calculationResult) : [],
      hasValues: calculationResult?.values ? true : false,
      valuesLength: calculationResult?.values?.length || 0,
    })

    let indicatorData: number[] | number[][]

    if (calculationResult && calculationResult.values) {
      // API 計算結果を使用
      indicatorData = calculationResult.values.map((item: any) => item.value)
      console.log('✅ Using API calculation for', indicator.name, indicatorData.length, 'points')
    } else {
      // フォールバックでローカル計算
      console.log('🔍 Falling back to local calculation for', indicator.name)
      indicatorData = calculateIndicatorFromData(chartData, indicator)
      console.log('⚠️ Using local calculation for', indicator.name, indicatorData.length, 'points')
    }

    console.log('🔍 Final indicator data for', indicator.name, ':', {
      dataLength: indicatorData?.length || 0,
      firstFewValues: indicatorData?.slice(0, 5) || [],
    })

    if (!indicatorData || indicatorData.length === 0) {
      console.log('❌ No indicator data available for', indicator.name)
      return
    }

    // インジケーターのタイプに応じてシリーズを作成
    switch (indicator.type) {
      case 'sma':
      case 'ema':
        // メインチャートに表示（gridIndex: 0, xAxisIndex: 0, yAxisIndex: 0）
        const lineSeriesConfig = {
          name: indicator.name,
          type: 'line',
          data: indicatorData,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: indicator.style?.color || '#ff9500',
            width: indicator.style?.lineWidth || 2,
          },
          xAxisIndex: 0,
          yAxisIndex: 0,
          z: 50,
        }
        console.log('📊 Adding line series for', indicator.name)
        series.push(lineSeriesConfig)
        break

      case 'bollinger':
        // ボリンジャーバンドはメインチャートに表示
        if (indicatorData.length === 5) {
          const [upper2, upper1, middle, lower1, lower2] = indicatorData
          const baseColor = indicator.style?.color || '#8e44ad'

          // 各ボリンジャーバンドラインをメインチャートに追加
          const bollingerSeries = [
            {
              name: `${indicator.name} +2σ`,
              type: 'line',
              data: upper2,
              lineStyle: { color: baseColor, width: 1, type: 'dashed' },
              symbol: 'none',
              xAxisIndex: 0,
              yAxisIndex: 0,
              z: 50,
            },
            {
              name: `${indicator.name} SMA`,
              type: 'line',
              data: middle,
              lineStyle: { color: baseColor, width: 2 },
              symbol: 'none',
              xAxisIndex: 0,
              yAxisIndex: 0,
              z: 50,
            },
            {
              name: `${indicator.name} -2σ`,
              type: 'line',
              data: lower2,
              lineStyle: { color: baseColor, width: 1, type: 'dashed' },
              symbol: 'none',
              xAxisIndex: 0,
              yAxisIndex: 0,
              z: 50,
            },
          ]
          
          series.push(...bollingerSeries)
        }
        break

      case 'rsi':
        // 🚨 GEMINI PATTERN: RSI サブチャート
        if (rsiGridIndex === -1) {
          console.error('❌ RSI grid index not calculated')
          return
        }

        console.log('🚨 GEMINI PATTERN: RSI series setup:', {
          gridIndex: rsiGridIndex,
          xAxisIndex: rsiGridIndex,
          yAxisIndex: rsiGridIndex,
          dataLength: indicatorData.length,
        })

        // RSI メインライン
        const rsiSeries = {
          name: indicator.name,
          type: 'line',
          data: indicatorData,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: indicator.style?.color || '#9C27B0',
            width: indicator.style?.lineWidth || 2,
          },
          xAxisIndex: rsiGridIndex,
          yAxisIndex: rsiGridIndex,
          z: 50,
        }
        series.push(rsiSeries)

        // RSI 参考線
        const rsiReferenceLines = [
          {
            name: `${indicator.name} Oversold (30)`,
            type: 'line',
            data: indicatorData.map(() => 30),
            lineStyle: { color: '#ef4444', width: 1, type: 'dashed', opacity: 0.6 },
            symbol: 'none',
            xAxisIndex: rsiGridIndex,
            yAxisIndex: rsiGridIndex,
            z: 30,
          },
          {
            name: `${indicator.name} Overbought (70)`,
            type: 'line',
            data: indicatorData.map(() => 70),
            lineStyle: { color: '#ef4444', width: 1, type: 'dashed', opacity: 0.6 },
            symbol: 'none',
            xAxisIndex: rsiGridIndex,
            yAxisIndex: rsiGridIndex,
            z: 30,
          },
          {
            name: `${indicator.name} Midline (50)`,
            type: 'line',
            data: indicatorData.map(() => 50),
            lineStyle: { color: '#6b7280', width: 1, type: 'dotted', opacity: 0.4 },
            symbol: 'none',
            xAxisIndex: rsiGridIndex,
            yAxisIndex: rsiGridIndex,
            z: 20,
          },
        ]
        series.push(...rsiReferenceLines)

        console.log('✅ Added RSI series with 4 components (main line + 3 reference lines)')
        break

      case 'macd':
        // 🚨 GEMINI PATTERN: MACD サブチャート
        if (macdGridIndex === -1) {
          console.error('❌ MACD grid index not calculated')
          return
        }

        console.log('🚨 GEMINI PATTERN: MACD series setup:', {
          gridIndex: macdGridIndex,
          xAxisIndex: macdGridIndex,
          yAxisIndex: macdGridIndex,
          dataLength: indicatorData.length,
        })

        // MACD データが配列の配列形式の場合、3 つのシリーズに分離
        if (Array.isArray(indicatorData[0])) {
          const macdData = indicatorData as number[][]

          // MACD ライン、シグナルライン、ヒストグラム
          const macdSeries = [
            {
              name: `${indicator.name} Line`,
              type: 'line',
              data: macdData.map((item: number[]) => item[0]),
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#3b82f6', width: 2 },
              xAxisIndex: macdGridIndex,
              yAxisIndex: macdGridIndex,
              z: 50,
            },
            {
              name: `${indicator.name} Signal`,
              type: 'line',
              data: macdData.map((item: number[]) => item[1]),
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#ef4444', width: 2 },
              xAxisIndex: macdGridIndex,
              yAxisIndex: macdGridIndex,
              z: 50,
            },
            {
              name: `${indicator.name} Histogram`,
              type: 'bar',
              data: macdData.map((item: number[]) => item[2]),
              itemStyle: {
                color: (params: any) => params.value >= 0 ? '#22c55e' : '#ef4444'
              },
              xAxisIndex: macdGridIndex,
              yAxisIndex: macdGridIndex,
              z: 30,
            },
            {
              name: `${indicator.name} Zero Line`,
              type: 'line',
              data: macdData.map(() => 0),
              lineStyle: { color: '#6b7280', width: 1, type: 'dashed', opacity: 0.6 },
              symbol: 'none',
              xAxisIndex: macdGridIndex,
              yAxisIndex: macdGridIndex,
              z: 20,
            },
          ]
          
          series.push(...macdSeries)
          console.log('✅ Added MACD series with 4 components (line, signal, histogram, zero line)')
        }
        break

      default:
        console.log('⚠️ Unknown indicator type:', indicator.type)
        break
    }
  })

  console.log('🚨 GEMINI PATTERN: Final series summary:', {
    totalSeries: series.length,
    seriesDetails: series.map(s => ({
      name: s.name,
      type: s.type,
      xAxisIndex: s.xAxisIndex,
      yAxisIndex: s.yAxisIndex,
    }))
  })

  return series
}

// インジケーター計算データを取得（API から）
function calculateIndicatorFromData(
  chartData: ChartData,
  indicator: UserIndicator
): number[] | number[][] {
  // TODO: API から計算済みデータを取得する実装
  // 現在は簡易ローカル計算でフォールバック
  try {
    // Debug: Log to file
    const firstCandle = chartData.values?.[0]
    const debugInfo = {
      timestamp: new Date().toISOString(),
      indicator: indicator.name,
      chartDataLength: chartData.values?.length || 0,
      firstCandle,
      isArray: Array.isArray(firstCandle),
      candleLength: Array.isArray(firstCandle) ? firstCandle.length : 'not array',
    }

    // Log debug info to console instead of downloading
    console.log('🔍 Indicator Debug Info:', debugInfo)

    // 🚨 GEMINI FIX: 堅牢な価格抽出（ローソク足とライン両方に対応）
    const prices = chartData.values.map((item: any) => {
      if (Array.isArray(item) && item.length >= 4) {
        // ローソク足形式 [始値, 高値, 安値, 終値] の場合、終値を使用
        return item[3]
      } else if (Array.isArray(item) && item.length >= 2) {
        // 2 つ以上の値がある場合、最後の値を終値として使用
        return item[item.length - 1]
      } else if (typeof item === 'number') {
        // 単純な数値の場合はそのまま使用
        return item
      } else if (typeof item === 'object' && item?.close !== undefined) {
        // オブジェクト形式で close プロパティがある場合
        return item.close
      } else {
        console.warn('🚨 GEMINI FIX: Unable to extract price from:', item)
        return 0
      }
    })

    console.log('🚨 GEMINI FIX: Price extraction for indicators:', {
      originalLength: chartData.values.length,
      extractedLength: prices.length,
      originalSample: chartData.values.slice(0, 3),
      extractedSample: prices.slice(0, 3),
      indicatorType: indicator.type,
    })

    if (prices.length === 0) return []

    const period = indicator.parameters.period || indicator.parameters.length || 20

    switch (indicator.type) {
      case 'sma':
        return calculateSMA(prices, period)
      case 'ema':
        return calculateEMA(prices, period)
      case 'bollinger':
        // ボリンジャーバンドの実装（±1σ, ±2σの 4 本線 + 中央線）
        const sma = calculateSMA(prices, period)

        // 5 つの配列を準備: upper2σ, upper1σ, middle, lower1σ, lower2σ
        const upper2 = []
        const upper1 = []
        const middle = []
        const lower1 = []
        const lower2 = []

        // 標準偏差を計算して 5 つの配列に分けて格納（SMA と同じ長さにする）
        for (let i = 0; i < sma.length; i++) {
          if (isNaN(sma[i])) {
            // 期間未満の場合は NaN で埋める（SMA と同じ）
            upper2.push(NaN)
            upper1.push(NaN)
            middle.push(NaN)
            lower1.push(NaN)
            lower2.push(NaN)
          } else {
            let sum = 0
            for (let j = 0; j < period; j++) {
              const diff = prices[i - period + 1 + j] - sma[i]
              sum += diff * diff
            }
            const stdDev = Math.sqrt(sum / period)

            upper2.push(sma[i] + 2 * stdDev) // +2σ
            upper1.push(sma[i] + 1 * stdDev) // +1σ
            middle.push(sma[i]) // SMA
            lower1.push(sma[i] - 1 * stdDev) // -1σ
            lower2.push(sma[i] - 2 * stdDev) // -2σ
          }
        }

        // createIndicatorSeries が期待する形式で返す: [upper2σ, upper1σ, middle, lower1σ, lower2σ]
        return [upper2, upper1, middle, lower1, lower2]
      case 'rsi':
        // RSI の実装（0-100 の範囲）
        console.log(
          '🔍 RSI Calculation: Starting with prices length:',
          prices.length,
          'period:',
          period
        )
        const rsiData = calculateRSI(prices, period)
        console.log('🔍 RSI Calculation: calculateRSI returned:', rsiData.length, 'values')
        console.log('🔍 RSI Sample values:', rsiData.slice(0, 5))

        // RSI 値を配列として返す（NaN パディングでデータ長を統一）
        const rsiValues = []
        for (let i = 0; i < prices.length; i++) {
          if (i < period) {
            // 期間未満の場合は NaN で埋める
            rsiValues.push(NaN)
          } else {
            // RSI データから対応する値を取得
            const rsiIndex = i - period
            if (rsiIndex < rsiData.length) {
              rsiValues.push(rsiData[rsiIndex])
            } else {
              rsiValues.push(NaN)
            }
          }
        }

        console.log('🔍 RSI Final values length:', rsiValues.length)
        console.log('🔍 RSI Sample final values:', rsiValues.slice(-10))
        return rsiValues
      case 'macd':
        // MACD の実装（MACD ライン、シグナルライン、ヒストグラム）
        console.log('🔍 MACD Calculation: Starting with prices length:', prices.length)
        const macdData = calculateMACD(prices, 12, 26, 9) // デフォルトパラメータ
        console.log('🔍 MACD Calculation: calculateMACD returned:', {
          macd: macdData.macd.length,
          signal: macdData.signal.length,
          histogram: macdData.histogram.length,
        })

        // MACD データを配列として返す（NaN パディングでデータ長を統一）
        const macdValues = []
        const macdStartIndex = 25 // 26 日 EMA - 1

        for (let i = 0; i < prices.length; i++) {
          if (i < macdStartIndex) {
            // 期間未満の場合は NaN で埋める
            macdValues.push([NaN, NaN, NaN])
          } else {
            // MACD データから対応する値を取得
            const macdIndex = i - macdStartIndex
            if (macdIndex < macdData.macd.length) {
              macdValues.push([
                macdData.macd[macdIndex],
                macdData.signal[macdIndex],
                macdData.histogram[macdIndex],
              ])
            } else {
              macdValues.push([NaN, NaN, NaN])
            }
          }
        }

        console.log('🔍 MACD Final values length:', macdValues.length)
        console.log('🔍 MACD Sample final values:', macdValues.slice(-5))
        return macdValues
      default:
        return []
    }
  } catch (error) {
    console.error('Error calculating indicator:', indicator.type, error)
    return []
  }
}

// SMA 計算
function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN) // 期間未満は NaN
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      sma.push(sum / period)
    }
  }

  return sma
}

// EMA 計算
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      ema.push(prices[i])
    } else {
      ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1])
    }
  }

  return ema
}

// RSI 計算
function calculateRSI(prices: number[], period: number): number[] {
  if (prices.length < period + 1) {
    return []
  }

  const rsi: number[] = []
  let gains: number[] = []
  let losses: number[] = []

  // 初期期間の上昇と下降を計算
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) {
      gains.push(change)
      losses.push(0)
    } else {
      gains.push(0)
      losses.push(-change)
    }
  }

  // 初期 RSI 値
  let avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period
  let avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period

  if (avgLoss === 0) {
    rsi.push(100)
  } else {
    const rs = avgGain / avgLoss
    rsi.push(100 - 100 / (1 + rs))
  }

  // 残りの RSI 値を計算
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0

    // EMA スタイルの平滑化
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    if (avgLoss === 0) {
      rsi.push(100)
    } else {
      const rs = avgGain / avgLoss
      rsi.push(100 - 100 / (1 + rs))
    }
  }

  return rsi
}

// MACD 計算
function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  if (prices.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] }
  }

  console.log('🔍 MACD: Calculating EMAs with periods:', { fastPeriod, slowPeriod, signalPeriod })

  // 12 日 EMA と 26 日 EMA を計算
  const fastEMA = calculateEMA(prices, fastPeriod)
  const slowEMA = calculateEMA(prices, slowPeriod)

  console.log('🔍 MACD: EMA lengths:', { fast: fastEMA.length, slow: slowEMA.length })

  // MACD ライン = 12 日 EMA - 26 日 EMA
  const macdLine: number[] = []
  const startIndex = slowPeriod - 1 // 26 日 EMA が有効になるインデックス

  for (let i = startIndex; i < fastEMA.length; i++) {
    if (!isNaN(fastEMA[i]) && !isNaN(slowEMA[i])) {
      macdLine.push(fastEMA[i] - slowEMA[i])
    }
  }

  console.log('🔍 MACD: MACD line length:', macdLine.length)

  // シグナルライン = MACD ラインの 9 日 EMA
  const signalLine = calculateEMA(macdLine, signalPeriod)

  console.log('🔍 MACD: Signal line length:', signalLine.length)

  // ヒストグラム = MACD ライン - シグナルライン
  const histogram: number[] = []
  const signalStartIndex = signalPeriod - 1

  for (let i = 0; i < macdLine.length; i++) {
    if (i >= signalStartIndex && i < signalLine.length + signalStartIndex) {
      const signalIndex = i - signalStartIndex
      if (!isNaN(macdLine[i]) && !isNaN(signalLine[signalIndex])) {
        histogram.push(macdLine[i] - signalLine[signalIndex])
      } else {
        histogram.push(NaN)
      }
    } else {
      histogram.push(NaN)
    }
  }

  console.log('🔍 MACD: Histogram length:', histogram.length)
  console.log('🔍 MACD: Sample values:', {
    macd: macdLine.slice(-3),
    signal: signalLine.slice(-3),
    histogram: histogram.slice(-3),
  })

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram,
  }
}

export default useChartOptions
