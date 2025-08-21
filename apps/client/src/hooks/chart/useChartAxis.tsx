import { useMemo } from 'react'
import type { YAXisComponentOption, XAXisComponentOption } from 'echarts/components'
import type { PriceStats } from '../useChartData'

/**
 * チャート軸設定フック
 * useChartOptions.tsx から抽出された軸設定関数群
 */

interface AxisConfig {
  theme: 'light' | 'dark'
  showGridlines?: boolean
  showVolume: boolean
  hasRSI: boolean
  hasMACD: boolean
}

// Nice interval 計算
function calculateNiceInterval(range: number, targetSplits: number): number {
  const rawInterval = range / targetSplits
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)))
  const normalized = rawInterval / magnitude

  let niceNormalized: number
  if (normalized <= 1) niceNormalized = 1
  else if (normalized <= 2) niceNormalized = 2
  else if (normalized <= 5) niceNormalized = 5
  else niceNormalized = 10

  return niceNormalized * magnitude
}

// Nice bounds 計算
function calculateNiceBounds(
  min: number,
  max: number,
  targetSplits: number = 5
): { min: number; max: number; interval: number } {
  const range = max - min
  const interval = calculateNiceInterval(range, targetSplits)
  const niceMin = Math.floor(min / interval) * interval
  const niceMax = Math.ceil(max / interval) * interval

  return { min: niceMin, max: niceMax, interval }
}

// Y 軸設定生成
function generateYAxisConfig(priceStats: PriceStats | null, config: AxisConfig): YAXisComponentOption[] {
  const isDarkMode = config.theme === 'dark'
  const baseAxisStyle = {
    axisLine: {
      show: true,
      lineStyle: {
        color: isDarkMode ? '#4b5563' : '#d1d5db',
      },
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: isDarkMode ? '#4b5563' : '#d1d5db',
      },
    },
    axisLabel: {
      color: isDarkMode ? '#f9fafb' : '#111827',
      fontSize: 12,
      formatter: (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
        return value.toFixed(2)
      },
    },
    splitLine: {
      show: config.showGridlines,
      lineStyle: {
        color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.5)',
        type: 'solid',
      },
    },
  }

  const yAxisArray = []

  // メイン価格軸
  if (priceStats) {
    const { min: niceMin, max: niceMax } = calculateNiceBounds(priceStats.min, priceStats.max, 6)

    yAxisArray.push({
      ...baseAxisStyle,
      type: 'value',
      position: 'right',
      min: niceMin,
      max: niceMax,
      axisLabel: {
        ...baseAxisStyle.axisLabel,
        formatter: (value: number) => `$${value.toFixed(2)}`,
      },
    })
  } else {
    yAxisArray.push({
      ...baseAxisStyle,
      type: 'value',
      position: 'right',
    })
  }

  // ボリューム軸
  if (config.showVolume) {
    yAxisArray.push({
      ...baseAxisStyle,
      type: 'value',
      position: 'left',
      axisLabel: {
        ...baseAxisStyle.axisLabel,
        formatter: (value: number) => {
          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
          if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
          return value.toString()
        },
      },
      splitLine: {
        show: false,
      },
    })
  }

  // RSI 軸
  if (config.hasRSI) {
    yAxisArray.push({
      ...baseAxisStyle,
      type: 'value',
      position: 'right',
      min: 0,
      max: 100,
      axisLabel: {
        ...baseAxisStyle.axisLabel,
        formatter: (value: number) => value.toFixed(0),
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.3)',
          type: 'dashed',
        },
      },
    })
  }

  // MACD 軸
  if (config.hasMACD) {
    yAxisArray.push({
      ...baseAxisStyle,
      type: 'value',
      position: 'right',
      axisLabel: {
        ...baseAxisStyle.axisLabel,
        formatter: (value: number) => value.toFixed(2),
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.3)',
          type: 'dashed',
        },
      },
    })
  }

  return yAxisArray
}

// X 軸設定生成
function generateXAxisConfig(config: AxisConfig): XAXisComponentOption {
  const isDarkMode = config.theme === 'dark'

  return {
    type: 'time',
    axisLine: {
      show: true,
      lineStyle: {
        color: isDarkMode ? '#4b5563' : '#d1d5db',
      },
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: isDarkMode ? '#4b5563' : '#d1d5db',
      },
    },
    axisLabel: {
      color: isDarkMode ? '#f9fafb' : '#111827',
      fontSize: 12,
      formatter: (value: number) => {
        const date = new Date(value)
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
      },
    },
    splitLine: {
      show: config.showGridlines,
      lineStyle: {
        color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.5)',
        type: 'solid',
      },
    },
  }
}

/**
 * チャート軸設定フック
 */
export const useChartAxis = (priceStats: PriceStats | null, config: AxisConfig) => {
  const xAxis = useMemo(() => generateXAxisConfig(config), [config.theme, config.showGridlines])

  const yAxis = useMemo(
    () => generateYAxisConfig(priceStats, config),
    [
      priceStats,
      config.theme,
      config.showGridlines,
      config.showVolume,
      config.hasRSI,
      config.hasMACD,
    ]
  )

  return { xAxis, yAxis }
}
