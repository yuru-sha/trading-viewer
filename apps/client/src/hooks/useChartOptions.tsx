import { useMemo } from 'react'
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
export const useChartOptions = (
  chartData: ChartData,
  priceStats: PriceStats | null,
  config: ChartOptionsConfig
) => {
  // Get indicators data from API with timeframe filtering
  const { data: indicators = [], isLoading: indicatorsLoading } = useIndicators(
    config.symbol,
    config.timeframe
  )

  // Get indicator calculations with error handling
  let indicatorCalculations = {}
  let calculationsLoading = false

  try {
    const calculationsResult = useIndicatorCalculations(config.symbol || '', indicators)
    indicatorCalculations = calculationsResult.data
    calculationsLoading = calculationsResult.isLoading
  } catch (error) {
    console.error('❌ useChartOptions: Error in useIndicatorCalculations:', error)
    indicatorCalculations = {}
    calculationsLoading = false
  }

  // Always log indicators state for debugging
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

    const baseOption: any = {
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      animation: false,
      legend: {
        show: false,
      },
      tooltip: {
        trigger: config.enableDrawingTools && config.activeDrawingTool && config.activeDrawingTool !== 'select' ? 'none' : 'axis',
        show: !(config.enableDrawingTools && config.activeDrawingTool && config.activeDrawingTool !== 'select'),
        axisPointer: {
          type: config.enableDrawingTools && config.activeDrawingTool && config.activeDrawingTool !== 'select' ? 'none' : 'cross',
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
        config.enableDrawingTools && config.activeDrawingTool && config.activeDrawingTool !== 'select'
          ? {
              show: false,
            }
          : {
              link: [{ xAxisIndex: 'all' }],
              label: {
                backgroundColor: isDarkMode ? '#4b5563' : '#6b7280',
                color: '#ffffff',
                fontSize: 11,
                formatter: (params: any) => {
                  if (params.axisDimension === 'y') {
                    return params.value.toFixed(2)
                  }
                  return params.value
                },
              },
            },
      grid:
        hasRSI && hasMACD
          ? config.showVolume
            ? [
                // メインチャート + ボリューム + RSI + MACD
                {
                  left: '3%',
                  right: '6%',
                  top: '2%',
                  height: '48%',
                  show: true,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                },
                {
                  left: '3%',
                  right: '6%',
                  top: '53%',
                  height: '12%',
                  show: true,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                },
                {
                  left: '3%',
                  right: '6%',
                  top: '66%',
                  height: '12%',
                  show: true,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                },
                {
                  left: '3%',
                  right: '6%',
                  top: '80%',
                  height: '15%',
                  show: true,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                },
              ]
            : [
                // メインチャート + RSI + MACD
                {
                  left: '3%',
                  right: '6%',
                  top: '2%',
                  height: '60%',
                  show: true,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                },
                {
                  left: '3%',
                  right: '6%',
                  top: '63%',
                  height: '13%',
                  show: true,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                },
                {
                  left: '3%',
                  right: '6%',
                  top: '78%',
                  height: '17%',
                  show: true,
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                },
              ]
          : hasRSI
            ? config.showVolume
              ? [
                  // メインチャート + ボリューム + RSI
                  {
                    left: '3%',
                    right: '6%',
                    top: '2%',
                    height: '60%',
                    show: true,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                  },
                  {
                    left: '3%',
                    right: '6%',
                    top: '65%',
                    height: '15%',
                    show: true,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                  },
                  {
                    left: '3%',
                    right: '6%',
                    top: '83%',
                    height: '12%',
                    show: true,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                  },
                ]
              : [
                  // メインチャート + RSI
                  {
                    left: '3%',
                    right: '6%',
                    top: '2%',
                    height: '75%',
                    show: true,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                  },
                  {
                    left: '3%',
                    right: '6%',
                    top: '80%',
                    height: '15%',
                    show: true,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                  },
                ]
            : hasMACD
              ? config.showVolume
                ? [
                    // メインチャート + ボリューム + MACD
                    {
                      left: '3%',
                      right: '6%',
                      top: '2%',
                      height: '60%',
                      show: true,
                      borderWidth: 0,
                      backgroundColor: 'transparent',
                    },
                    {
                      left: '3%',
                      right: '6%',
                      top: '65%',
                      height: '15%',
                      show: true,
                      borderWidth: 0,
                      backgroundColor: 'transparent',
                    },
                    {
                      left: '3%',
                      right: '6%',
                      top: '83%',
                      height: '12%',
                      show: true,
                      borderWidth: 0,
                      backgroundColor: 'transparent',
                    },
                  ]
                : [
                    // メインチャート + MACD
                    {
                      left: '3%',
                      right: '6%',
                      top: '2%',
                      height: '75%',
                      show: true,
                      borderWidth: 0,
                      backgroundColor: 'transparent',
                    },
                    {
                      left: '3%',
                      right: '6%',
                      top: '80%',
                      height: '15%',
                      show: true,
                      borderWidth: 0,
                      backgroundColor: 'transparent',
                    },
                  ]
              : config.showVolume
                ? [
                    {
                      left: '3%',
                      right: '6%',
                      top: '2%',
                      height: '70%',
                      show: true,
                      borderWidth: 0,
                      backgroundColor: 'transparent',
                    },
                    {
                      left: '3%',
                      right: '6%',
                      top: '75%',
                      height: '20%',
                      show: true,
                      borderWidth: 0,
                      backgroundColor: 'transparent',
                    },
                  ]
                : [
                    {
                      left: '3%',
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
                show: !hasRSI && !hasMACD,
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                fontSize: 11,
                formatter: (value: string) => {
                  if (value.includes(' ')) {
                    const parts = value.split(' ')
                    const date = parts[0]
                    const time = parts[1]
                    // 時刻がある場合の処理
                    if (time) {
                      const hour = parseInt(time?.split(':')[0] || '0')
                      const minute = parseInt(time?.split(':')[1] || '0')

                      // 時間軸に応じて日付表示の間隔を調整
                      let showDate = false

                      // 整時（XX:00）または 6 時間おき（0,6,12,18 時）に日付を表示
                      if (minute === 0 || hour % 6 === 0) {
                        showDate = true
                      }

                      if (showDate) {
                        // 複数の日付形式に対応
                        let displayDate = date || ''
                        if (date?.includes('-')) {
                          const dateParts = date.split('-')
                          if (dateParts.length >= 3) {
                            const month = dateParts[1]
                            const day = dateParts[2]
                            displayDate = `${month}/${day}`
                          }
                        }

                        return `${displayDate} ${time.substring(0, 5)}`
                      }
                      // その他の時刻は HH:MM 形式で表示
                      return time.substring(0, 5)
                    }
                    return date // 日付のみ
                  }
                  return value
                },
              },
              min: 'dataMin',
              max: 'dataMax',
              splitNumber: 8,
            },
            // インジケーター用 X 軸
            ...(hasRSI && hasMACD
              ? [
                  // RSI 用 X 軸
                  {
                    type: 'category',
                    gridIndex: config.showVolume ? 2 : 1,
                    data: chartData.dates,
                    boundaryGap: false,
                    axisTick: { alignWithLabel: true },
                    axisLine: {
                      onZero: false,
                      lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                    },
                    splitLine: {
                      show: config.showGridlines !== false,
                      lineStyle: {
                        color: isDarkMode ? '#374151' : '#e5e7eb',
                        width: 1,
                        type: 'solid' as const,
                        opacity: 0.6,
                      },
                    },
                    axisLabel: { show: false },
                    min: 'dataMin',
                    max: 'dataMax',
                  },
                  // MACD 用 X 軸
                  {
                    type: 'category',
                    gridIndex: config.showVolume ? 3 : 2,
                    data: chartData.dates,
                    boundaryGap: false,
                    axisTick: { alignWithLabel: true },
                    axisLine: {
                      onZero: false,
                      lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                    },
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
                      fontSize: 10,
                    },
                    min: 'dataMin',
                    max: 'dataMax',
                  },
                ]
              : hasRSI
                ? [
                    {
                      type: 'category',
                      gridIndex: config.showVolume ? 2 : 1,
                      data: chartData.dates,
                      boundaryGap: false,
                      axisTick: { alignWithLabel: true },
                      axisLine: {
                        onZero: false,
                        lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                      },
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
                        fontSize: 10,
                      },
                      min: 'dataMin',
                      max: 'dataMax',
                    },
                  ]
                : hasMACD
                  ? [
                      {
                        type: 'category',
                        gridIndex: config.showVolume ? 2 : 1,
                        data: chartData.dates,
                        boundaryGap: false,
                        axisTick: { alignWithLabel: true },
                        axisLine: {
                          onZero: false,
                          lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                        },
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
                          fontSize: 10,
                        },
                        min: 'dataMin',
                        max: 'dataMax',
                      },
                    ]
                  : []),
          ]
        : // Volume OFF 時の xAxis 構造 - RSI+MACD 組み合わせ対応
        hasRSI && hasMACD
          ? [
              // メインチャート用 X 軸
              {
                type: 'category',
                data: chartData.dates,
                boundaryGap: ['0%', '20%'],
                axisTick: { alignWithLabel: true },
                axisLine: {
                  onZero: false,
                  lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                },
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
                splitNumber: 8,
              },
              // RSI 用 X 軸
              {
                type: 'category',
                gridIndex: 1,
                data: chartData.dates,
                boundaryGap: false,
                axisTick: { alignWithLabel: true },
                axisLine: {
                  onZero: false,
                  lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                },
                splitLine: {
                  show: config.showGridlines !== false,
                  lineStyle: {
                    color: isDarkMode ? '#374151' : '#e5e7eb',
                    width: 1,
                    type: 'solid' as const,
                    opacity: 0.6,
                  },
                },
                axisLabel: { show: false },
                min: 'dataMin',
                max: 'dataMax',
              },
              // MACD 用 X 軸
              {
                type: 'category',
                gridIndex: 2,
                data: chartData.dates,
                boundaryGap: false,
                axisTick: { alignWithLabel: true },
                axisLine: {
                  onZero: false,
                  lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                },
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
                  fontSize: 10,
                },
                min: 'dataMin',
                max: 'dataMax',
              },
            ]
          : hasRSI
            ? [
                {
                  type: 'category',
                  data: chartData.dates,
                  boundaryGap: ['0%', '20%'],
                  axisTick: { alignWithLabel: true },
                  axisLine: {
                    onZero: false,
                    lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                  },
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
                  splitNumber: 8,
                },
                {
                  type: 'category',
                  gridIndex: 1,
                  data: chartData.dates,
                  boundaryGap: false,
                  axisTick: { alignWithLabel: true },
                  axisLine: {
                    onZero: false,
                    lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                  },
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
                    fontSize: 10,
                  },
                  min: 'dataMin',
                  max: 'dataMax',
                },
              ]
            : hasMACD
              ? [
                  {
                    type: 'category',
                    data: chartData.dates,
                    boundaryGap: ['0%', '20%'],
                    axisTick: { alignWithLabel: true },
                    axisLine: {
                      onZero: false,
                      lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                    },
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
                    splitNumber: 8,
                  },
                  {
                    type: 'category',
                    gridIndex: 1,
                    data: chartData.dates,
                    boundaryGap: false,
                    axisTick: { alignWithLabel: true },
                    axisLine: {
                      onZero: false,
                      lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' },
                    },
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
                      fontSize: 10,
                    },
                    min: 'dataMin',
                    max: 'dataMax',
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
                      const date = parts[0]
                      const time = parts[1]
                      // 時刻がある場合の処理
                      if (time) {
                        const hour = parseInt(time?.split(':')[0] || '0')
                        const minute = parseInt(time?.split(':')[1] || '0')

                        // 時間軸に応じて日付表示の間隔を調整
                        let showDate = false

                        // 整時（XX:00）または 6 時間おき（0,6,12,18 時）に日付を表示
                        if (minute === 0 || hour % 6 === 0) {
                          showDate = true
                        }

                        if (showDate) {
                          // 複数の日付形式に対応
                          let displayDate = date || ''
                          if (date?.includes('-')) {
                            const dateParts = date.split('-')
                            if (dateParts.length >= 3) {
                              const month = dateParts[1]
                              const day = dateParts[2]
                              displayDate = `${month}/${day}`
                            }
                          }

                          return `${displayDate} ${time.substring(0, 5)}`
                        }
                        // その他の時刻は HH:MM 形式で表示
                        return time.substring(0, 5)
                      }
                      return date // 日付のみ
                    }
                    return value
                  },
                },
                min: 'dataMin',
                max: 'dataMax',
                splitNumber: 8, // X 軸のグリッド線数を調整
              },
            ].map((axis, index) => {
              // 最終的な xAxis 構造をログ出力
              if (index === 0) {
                const totalAxes = config.showVolume
                  ? [
                      'Main Chart',
                      'Volume Chart',
                      ...(hasRSI && hasMACD
                        ? ['RSI Chart', 'MACD Chart']
                        : hasRSI
                          ? ['RSI Chart']
                          : hasMACD
                            ? ['MACD Chart']
                            : [])
                    ]
                  : hasRSI && hasMACD
                    ? ['Main Chart', 'RSI Chart', 'MACD Chart']
                    : hasRSI
                      ? ['Main Chart', 'RSI Chart']
                      : hasMACD
                        ? ['Main Chart', 'MACD Chart'] 
                        : ['Main Chart']
                
                console.log('🔍 Final xAxis structure:', {
                  totalXAxisCount: totalAxes.length,
                  xAxisStructure: totalAxes,
                  config: { showVolume: config.showVolume, hasRSI, hasMACD }
                })
              }
              return axis
            }),
      yAxis: generateYAxisConfig(config, isDarkMode, priceStats, config.currentPrice, indicators),
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex:
            hasRSI && hasMACD
              ? config.showVolume
                ? [0, 1, 2, 3]
                : [0, 1, 2]
              : hasRSI
                ? config.showVolume
                  ? [0, 1, 2]
                  : [0, 1]
                : hasMACD
                  ? config.showVolume
                    ? [0, 1, 2]
                    : [0, 1]
                  : config.showVolume
                    ? [0, 1]
                    : [0],
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

    // Add indicator series from API data
    console.log('🔍 baseOption.xAxis structure verification:', {
      xAxisLength: baseOption.xAxis.length,
      xAxisGridIndexes: baseOption.xAxis.map((axis, index) => ({ 
        index, 
        gridIndex: axis.gridIndex 
      })),
      showVolume: config.showVolume,
      hasRSI: indicators.some(i => i.type === 'rsi' && i.visible),
      hasMACD: indicators.some(i => i.type === 'macd' && i.visible)
    })
    
    const indicatorSeries = createIndicatorSeries(
      chartData,
      indicators,
      indicatorCalculations,
      config
    )
    console.log('🔍 Generated indicator series:', indicatorSeries.length, 'series')
    console.log(
      '📊 Indicator series details:',
      indicatorSeries.map(s => ({
        name: s.name,
        type: s.type,
        dataLength: s.data?.length || 0,
        color: s.lineStyle?.color,
      }))
    )
    baseOption.series.push(...indicatorSeries)

    console.log('📊 Final baseOption.series count:', baseOption.series.length)
    console.log(
      '📊 All series names:',
      baseOption.series.map(s => s.name || s.type)
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

    axisPointer: config.enableDrawingTools && config.activeDrawingTool && config.activeDrawingTool !== 'select'
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
  const hasRSI = indicators.some(indicator => indicator.type === 'rsi' && indicator.visible === true)
  const hasMACD = indicators.some(indicator => indicator.type === 'macd' && indicator.visible === true)

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

// Indicator series creation
function createIndicatorSeries(
  chartData: ChartData,
  indicators: UserIndicator[],
  calculations: Record<string, any> = {},
  config: ChartOptionsConfig
) {
  console.log('🔍 createIndicatorSeries called with:', {
    chartDataLength: chartData?.values?.length || 0,
    indicatorsCount: indicators?.length || 0,
    calculationsCount: Object.keys(calculations || {}).length,
    indicators:
      indicators?.map(i => ({ id: i.id, name: i.name, visible: i.visible, type: i.type })) || [],
  })
  
  console.log('🔍 createIndicatorSeries config received:', {
    showVolume: config.showVolume,
    chartType: config.chartType,
    symbol: config.symbol
  })

  const series: any[] = []

  // RSI と MACD が表示されているかを確認
  const hasRSI = indicators.some(indicator => indicator.type === 'rsi' && indicator.visible === true)
  const hasMACD = indicators.some(indicator => indicator.type === 'macd' && indicator.visible === true)

  console.log('🔍 Chart configuration:', {
    showVolume: config.showVolume,
    hasRSI,
    hasMACD
  })

  // xAxis 構造に基づいた軸インデックスの計算
  // Volume OFF 時の xAxis 構造を正しく反映
  let rsiAxisIndex = -1
  let macdAxisIndex = -1

  if (config.showVolume) {
    // Volume ON の場合の xAxis 構造:
    // [0] = main chart, [1] = volume chart, [2] = RSI?, [3] = MACD?
    if (hasRSI && hasMACD) {
      rsiAxisIndex = 2
      macdAxisIndex = 3
    } else if (hasRSI) {
      rsiAxisIndex = 2
    } else if (hasMACD) {
      macdAxisIndex = 2
    }
  } else {
    // Volume OFF の場合の xAxis 構造:
    // [0] = main chart only, [1] = RSI?, [2] = MACD?
    if (hasRSI && hasMACD) {
      rsiAxisIndex = 1
      macdAxisIndex = 2
    } else if (hasRSI) {
      rsiAxisIndex = 1
    } else if (hasMACD) {
      macdAxisIndex = 1
    }
  }

  console.log('🔍 Calculated axis indexes:', {
    rsiAxisIndex,
    macdAxisIndex,
    showVolume: config.showVolume,
    hasRSI,
    hasMACD,
    expectedAxisStructure: config.showVolume 
      ? hasRSI && hasMACD 
        ? 'Volume ON: [0]=Main, [1]=Volume, [2]=RSI, [3]=MACD'
        : hasRSI 
          ? 'Volume ON: [0]=Main, [1]=Volume, [2]=RSI'
          : hasMACD 
            ? 'Volume ON: [0]=Main, [1]=Volume, [2]=MACD'
            : 'Volume ON: [0]=Main, [1]=Volume'
      : hasRSI && hasMACD 
        ? 'Volume OFF: [0]=Main, [1]=RSI, [2]=MACD'
        : hasRSI 
          ? 'Volume OFF: [0]=Main, [1]=RSI'
          : hasMACD 
            ? 'Volume OFF: [0]=Main, [1]=MACD'
            : 'Volume OFF: [0]=Main'
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
          z: 50, // インジケーターは価格チャートより前面に表示
        }
        console.log('📊 Adding line series for', indicator.name, ':', {
          name: lineSeriesConfig.name,
          type: lineSeriesConfig.type,
          dataLength: lineSeriesConfig.data.length,
          color: lineSeriesConfig.lineStyle.color,
          firstFewDataPoints: lineSeriesConfig.data.slice(0, 5),
        })
        series.push(lineSeriesConfig)
        break

      case 'bollinger':
        // ボリンジャーバンドは 5 本の線（±2σ、±1σ、中央線）
        if (indicatorData.length === 5) {
          const [upper2, upper1, middle, lower1, lower2] = indicatorData
          const baseColor = indicator.style?.color || '#8e44ad'

          // +2σ線（外側上限）
          series.push({
            name: `${indicator.name} +2σ`,
            type: 'line',
            data: upper2,
            lineStyle: {
              color: baseColor,
              width: 1,
              type: 'dashed',
            },
            symbol: 'none',
            z: 50,
          })

          // +1σ線
          series.push({
            name: `${indicator.name} +1σ`,
            type: 'line',
            data: upper1,
            lineStyle: {
              color: baseColor,
              width: 1,
              type: 'dotted',
              opacity: 0.7,
            },
            symbol: 'none',
            z: 50,
          })

          // 中央線（SMA）
          series.push({
            name: `${indicator.name} SMA`,
            type: 'line',
            data: middle,
            lineStyle: {
              color: baseColor,
              width: 2,
            },
            symbol: 'none',
            z: 50,
          })

          // -1σ線
          series.push({
            name: `${indicator.name} -1σ`,
            type: 'line',
            data: lower1,
            lineStyle: {
              color: baseColor,
              width: 1,
              type: 'dotted',
              opacity: 0.7,
            },
            symbol: 'none',
            z: 50,
          })

          // -2σ線（外側下限）
          series.push({
            name: `${indicator.name} -2σ`,
            type: 'line',
            data: lower2,
            lineStyle: {
              color: baseColor,
              width: 1,
              type: 'dashed',
            },
            symbol: 'none',
            z: 50,
          })

          // ±2σ帯域の塗りつぶし
          series.push({
            name: `${indicator.name} ±2σ Band`,
            type: 'line',
            data: upper2,
            areaStyle: {
              color: `rgba(142, 68, 173, 0.1)`,
            },
            lineStyle: {
              opacity: 0,
            },
            stack: 'bollinger_outer',
            symbol: 'none',
            z: 5,
          })

          // ±1σ帯域の塗りつぶし
          series.push({
            name: `${indicator.name} ±1σ Band`,
            type: 'line',
            data: upper1,
            areaStyle: {
              color: `rgba(142, 68, 173, 0.05)`,
            },
            lineStyle: {
              opacity: 0,
            },
            stack: 'bollinger_inner',
            symbol: 'none',
            z: 8,
          })
        }
        break

      default:
        // その他のインジケーター（RSI、MACD など）は基本的にライン表示
        const seriesConfig: any = {
          name: indicator.name,
          type: 'line',
          data: indicatorData,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: indicator.style?.color || '#e74c3c',
            width: indicator.style?.lineWidth || 2,
          },
          z: 50,
        }

        // RSI の場合はサブチャートに表示
        if (indicator.type === 'rsi') {
          console.log(
            '📊 RSI Series: Setting up RSI in subchart with data:',
            indicatorData.length,
            'points'
          )
          console.log('📊 RSI Series: Sample data values:', indicatorData.slice(-10))
          
          if (rsiAxisIndex === -1) {
            console.error('❌ RSI axis index not calculated correctly')
            return
          }
          
          // Validate that the calculated axis index exists
          const expectedAxisCount = config.showVolume 
            ? (hasRSI && hasMACD ? 4 : hasRSI || hasMACD ? 3 : 2)
            : (hasRSI && hasMACD ? 3 : hasRSI || hasMACD ? 2 : 1)
          
          if (rsiAxisIndex >= expectedAxisCount) {
            console.error('❌ RSI axis index out of bounds:', {
              rsiAxisIndex,
              expectedAxisCount,
              showVolume: config.showVolume,
              hasRSI,
              hasMACD
            })
            return
          }
          
          console.log('📊 RSI Series: Using axis index:', rsiAxisIndex)
          console.log('📊 RSI Series: Setting xAxisIndex and yAxisIndex to:', rsiAxisIndex)
          seriesConfig.yAxisIndex = rsiAxisIndex
          seriesConfig.xAxisIndex = rsiAxisIndex

          // RSI 用の参考線も追加
          // 30 レベル線（売られすぎ）
          const oversoldLine = indicatorData.map(() => 30)
          series.push({
            name: `${indicator.name} Oversold (30)`,
            type: 'line',
            data: oversoldLine,
            lineStyle: {
              color: '#ef4444',
              width: 1,
              type: 'dashed',
              opacity: 0.6,
            },
            symbol: 'none',
            yAxisIndex: rsiAxisIndex,
            xAxisIndex: rsiAxisIndex,
            z: 30,
          })

          // 70 レベル線（買われすぎ）
          const overboughtLine = indicatorData.map(() => 70)
          series.push({
            name: `${indicator.name} Overbought (70)`,
            type: 'line',
            data: overboughtLine,
            lineStyle: {
              color: '#ef4444',
              width: 1,
              type: 'dashed',
              opacity: 0.6,
            },
            symbol: 'none',
            yAxisIndex: rsiAxisIndex,
            xAxisIndex: rsiAxisIndex,
            z: 30,
          })

          // 50 レベル線（中央線）
          const midLine = indicatorData.map(() => 50)
          series.push({
            name: `${indicator.name} Midline (50)`,
            type: 'line',
            data: midLine,
            lineStyle: {
              color: '#6b7280',
              width: 1,
              type: 'dotted',
              opacity: 0.4,
            },
            symbol: 'none',
            yAxisIndex: rsiAxisIndex,
            xAxisIndex: rsiAxisIndex,
            z: 20,
          })
        }

        // MACD の場合はサブチャートに表示
        if (indicator.type === 'macd') {
          console.log(
            '📊 MACD Series: Setting up MACD in subchart with data:',
            indicatorData.length,
            'points'
          )
          console.log('📊 MACD Series: Sample data values:', indicatorData.slice(-5))

          if (macdAxisIndex === -1) {
            console.error('❌ MACD axis index not calculated correctly')
            return
          }

          // Validate that the calculated axis index exists  
          const expectedAxisCount = config.showVolume 
            ? (hasRSI && hasMACD ? 4 : hasRSI || hasMACD ? 3 : 2)
            : (hasRSI && hasMACD ? 3 : hasRSI || hasMACD ? 2 : 1)
          
          if (macdAxisIndex >= expectedAxisCount) {
            console.error('❌ MACD axis index out of bounds:', {
              macdAxisIndex,
              expectedAxisCount,
              showVolume: config.showVolume,
              hasRSI,
              hasMACD
            })
            return
          }

          console.log(
            '📊 MACD Series: Using axis index:',
            macdAxisIndex
          )
          console.log('📊 MACD Series: Setting xAxisIndex and yAxisIndex to:', macdAxisIndex)

          // MACD データが配列の配列形式の場合、3 つのシリーズに分離
          if (Array.isArray(indicatorData[0])) {
            const macdData = indicatorData as number[][]

            // MACD ライン
            const macdLine = macdData.map((item: number[]) => item[0])
            const macdSeries = {
              name: `${indicator.name} Line`,
              type: 'line',
              data: macdLine,
              smooth: true,
              symbol: 'none',
              lineStyle: {
                color: '#3b82f6',
                width: 2,
              },
              yAxisIndex: macdAxisIndex,
              xAxisIndex: macdAxisIndex,
              z: 50,
            }
            series.push(macdSeries)

            // シグナルライン
            const signalLine = macdData.map((item: number[]) => item[1])
            const signalSeries = {
              name: `${indicator.name} Signal`,
              type: 'line',
              data: signalLine,
              smooth: true,
              symbol: 'none',
              lineStyle: {
                color: '#ef4444',
                width: 2,
              },
              yAxisIndex: macdAxisIndex,
              xAxisIndex: macdAxisIndex,
              z: 50,
            }
            series.push(signalSeries)

            // ヒストグラム
            const histogram = macdData.map((item: number[]) => item[2])
            const histogramSeries = {
              name: `${indicator.name} Histogram`,
              type: 'bar',
              data: histogram,
              itemStyle: {
                color: (params: any) => {
                  return params.value >= 0 ? '#22c55e' : '#ef4444'
                },
              },
              yAxisIndex: macdAxisIndex,
              xAxisIndex: macdAxisIndex,
              z: 30,
            }
            series.push(histogramSeries)

            // ゼロライン
            const zeroLine = macdData.map(() => 0)
            const zeroLineSeries = {
              name: `${indicator.name} Zero Line`,
              type: 'line',
              data: zeroLine,
              lineStyle: {
                color: '#6b7280',
                width: 1,
                type: 'dashed',
                opacity: 0.6,
              },
              symbol: 'none',
              yAxisIndex: macdAxisIndex,
              xAxisIndex: macdAxisIndex,
              z: 20,
            }
            series.push(zeroLineSeries)

            console.log('📊 MACD Series: Added 4 series (MACD line, Signal, Histogram, Zero line)')

            // seriesConfig は使用しない（個別に追加済み）
            return
          }
        }

        series.push(seriesConfig)
        break
    }
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
    console.log('🔍 SMA Debug Info:', debugInfo)

    const prices = chartData.values.map((candle: any) => {
      if (Array.isArray(candle) && candle.length >= 5) {
        return candle[4] // close price (OHLCV format)
      } else if (Array.isArray(candle) && candle.length >= 2) {
        return candle[1] // try close price at index 1
      } else if (typeof candle === 'object' && candle.close) {
        return candle.close // object format
      }
      return 0
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
