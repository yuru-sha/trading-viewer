import { useMemo } from 'react'
import type { ChartData } from '../useChartData'
import { UserIndicator } from '@trading-viewer/shared'

/**
 * チャートシリーズ生成フック
 * useChartOptions.tsx から抽出されたシリーズ生成関数群
 */

interface SeriesConfig {
  chartType: 'candle' | 'line' | 'area'
  theme: 'light' | 'dark'
  showVolume: boolean
  currentPrice?: number
  showPeriodHigh?: boolean
  showPeriodLow?: boolean
}

// Candlestick シリーズ生成
export function createCandlestickSeries(chartData: ChartData, config: SeriesConfig): any {
  const isDarkMode = config.theme === 'dark'

  return {
    type: 'candlestick',
    name: 'OHLC',
    data: chartData.ohlc,
    itemStyle: {
      color: isDarkMode ? '#26a69a' : '#26a69a', // up color
      color0: isDarkMode ? '#ef5350' : '#ef5350', // down color
      borderColor: isDarkMode ? '#26a69a' : '#26a69a',
      borderColor0: isDarkMode ? '#ef5350' : '#ef5350',
    },
    emphasis: {
      itemStyle: {
        borderWidth: 2,
      },
    },
  }
}

// Line シリーズ生成
export function createLineSeries(chartData: ChartData, config: SeriesConfig): any {
  const isDarkMode = config.theme === 'dark'

  return {
    type: 'line',
    name: 'Close',
    data: chartData.ohlc.map(([time, open, high, low, close]) => [time, close]),
    lineStyle: {
      color: isDarkMode ? '#42a5f5' : '#1976d2',
      width: 2,
    },
    symbol: 'none',
    smooth: false,
  }
}

// Area シリーズ生成
export function createAreaSeries(chartData: ChartData, config: SeriesConfig): any {
  const isDarkMode = config.theme === 'dark'

  return {
    type: 'line',
    name: 'Close',
    data: chartData.ohlc.map(([time, open, high, low, close]) => [time, close]),
    lineStyle: {
      color: isDarkMode ? '#42a5f5' : '#1976d2',
      width: 2,
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          {
            offset: 0,
            color: isDarkMode ? 'rgba(66, 165, 245, 0.8)' : 'rgba(25, 118, 210, 0.8)',
          },
          {
            offset: 1,
            color: isDarkMode ? 'rgba(66, 165, 245, 0.1)' : 'rgba(25, 118, 210, 0.1)',
          },
        ],
      },
    },
    symbol: 'none',
    smooth: false,
  }
}

// Volume シリーズ生成
export function createVolumeSeries(chartData: ChartData, config: SeriesConfig): any {
  const isDarkMode = config.theme === 'dark'

  return {
    type: 'bar',
    name: 'Volume',
    xAxisIndex: 0,
    yAxisIndex: 1,
    data: chartData.volume,
    itemStyle: {
      color: function (params: any) {
        const ohlcData = chartData.ohlc[params.dataIndex]
        if (ohlcData) {
          const [, open, , , close] = ohlcData
          return close >= open
            ? isDarkMode
              ? 'rgba(38, 166, 154, 0.6)'
              : 'rgba(38, 166, 154, 0.6)'
            : isDarkMode
              ? 'rgba(239, 83, 80, 0.6)'
              : 'rgba(239, 83, 80, 0.6)'
        }
        return isDarkMode ? 'rgba(156, 156, 156, 0.6)' : 'rgba(156, 156, 156, 0.6)'
      },
    },
    large: true,
    largeThreshold: 500,
  }
}

// Mark Line (現在価格ライン) 生成
export function createMarkLine(currentPrice?: number): any {
  if (!currentPrice) return null

  return {
    silent: true,
    symbol: 'none',
    data: [
      {
        yAxis: currentPrice,
        lineStyle: {
          color: '#ff6b6b',
          width: 2,
          type: 'dashed',
        },
        label: {
          show: true,
          position: 'insideEndTop',
          formatter: `$${currentPrice.toFixed(2)}`,
          backgroundColor: '#ff6b6b',
          color: '#fff',
          padding: [4, 8],
          borderRadius: 4,
        },
      },
    ],
  }
}

// Period High/Low マークライン生成
export function createPeriodMarkLines(chartData: ChartData, config: SeriesConfig): any[] {
  const markLines = []

  if (config.showPeriodHigh && chartData.periodHigh) {
    markLines.push({
      silent: true,
      symbol: 'none',
      data: [
        {
          yAxis: chartData.periodHigh,
          lineStyle: {
            color: '#4caf50',
            width: 1,
            type: 'solid',
            opacity: 0.7,
          },
          label: {
            show: true,
            position: 'insideEndTop',
            formatter: `High: $${chartData.periodHigh.toFixed(2)}`,
            backgroundColor: '#4caf50',
            color: '#fff',
            padding: [2, 6],
            borderRadius: 2,
            fontSize: 10,
          },
        },
      ],
    })
  }

  if (config.showPeriodLow && chartData.periodLow) {
    markLines.push({
      silent: true,
      symbol: 'none',
      data: [
        {
          yAxis: chartData.periodLow,
          lineStyle: {
            color: '#f44336',
            width: 1,
            type: 'solid',
            opacity: 0.7,
          },
          label: {
            show: true,
            position: 'insideEndBottom',
            formatter: `Low: $${chartData.periodLow.toFixed(2)}`,
            backgroundColor: '#f44336',
            color: '#fff',
            padding: [2, 6],
            borderRadius: 2,
            fontSize: 10,
          },
        },
      ],
    })
  }

  return markLines
}

/**
 * チャートシリーズ生成フック
 */
export const useChartSeries = (chartData: ChartData, config: SeriesConfig) => {
  return useMemo(() => {
    const series = []

    // メインシリーズ
    switch (config.chartType) {
      case 'candle':
        series.push(createCandlestickSeries(chartData, config))
        break
      case 'line':
        series.push(createLineSeries(chartData, config))
        break
      case 'area':
        series.push(createAreaSeries(chartData, config))
        break
    }

    // ボリュームシリーズ
    if (config.showVolume && chartData.volume?.length > 0) {
      series.push(createVolumeSeries(chartData, config))
    }

    return series
  }, [chartData, config.chartType, config.theme, config.showVolume])
}
