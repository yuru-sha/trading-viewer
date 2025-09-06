import { useMemo } from 'react'
import type { GridComponentOption, XAXisComponentOption, YAXisComponentOption } from 'echarts'
import type { ChartData } from '@shared'
import { log } from '../../services/logger'

type SubChartConfig = {
  type: string
  height: number
}

type ChartLayoutConfig = {
  showVolume: boolean
  hasRSI: boolean
  hasMACD: boolean
  showGridlines: boolean
  isDarkMode: boolean
  colors?: {
    grid?: string
    background?: string
  }
}

type ChartLayoutResult = {
  gridConfigs: GridComponentOption[]
  xAxes: XAXisComponentOption[]
  yAxes: YAXisComponentOption[]
  seriesMapping: Record<string, number>
  gridCount: number
}

/**
 * チャートレイアウト管理フック
 * @param chartData チャートデータ
 * @param config レイアウト設定
 * @returns グリッド、軸、シリーズマッピング設定
 */
export function useChartLayout(
  chartData: ChartData,
  config: ChartLayoutConfig
): ChartLayoutResult {
  return useMemo(() => {
    log.business.info('Calculating dynamic chart layout', {
      operation: 'chart_layout',
      showVolume: config.showVolume,
      hasRSI: config.hasRSI,
      hasMACD: config.hasMACD,
    })

    const gridConfigs: GridComponentOption[] = []
    const yAxes: YAXisComponentOption[] = []
    const seriesMapping: Record<string, number> = {}
    let currentTop = 2 // Start with a 2% top margin

    // 表示するサブチャートの設定
    const visibleSubCharts: SubChartConfig[] = []
    if (config.showVolume) {
      visibleSubCharts.push({ type: 'volume', height: 10 })
    }
    if (config.hasRSI) {
      visibleSubCharts.push({ type: 'rsi', height: 15 })
    }
    if (config.hasMACD) {
      visibleSubCharts.push({ type: 'macd', height: 15 })
    }

    const numSubCharts = visibleSubCharts.length
    const subChartTotalHeight = visibleSubCharts.reduce((sum, chart) => sum + chart.height, 0)
    const gapHeight = numSubCharts > 0 ? numSubCharts * 3 : 0
    const mainChartHeight = 100 - subChartTotalHeight - gapHeight - 5 // 5% for top/bottom margins

    // メインチャートグリッド
    gridConfigs.push({
      left: '3%',
      right: '6%',
      top: `${currentTop}%`,
      height: `${mainChartHeight}%`,
    })

    yAxes.push({
      scale: true,
      gridIndex: 0,
      position: 'right',
      splitArea: { show: false },
      splitLine: {
        show: config.showGridlines !== false,
        lineStyle: {
          color: config.colors?.grid || (config.isDarkMode ? '#374151' : '#e5e7eb'),
          width: 1,
          type: 'solid',
          opacity: 0.6,
        },
      },
      axisLabel: {
        color: config.isDarkMode ? '#9ca3af' : '#6b7280',
        fontSize: 11,
      },
    })
    currentTop += mainChartHeight + 3 // Add gap

    // サブチャートグリッド
    visibleSubCharts.forEach((chart, index) => {
      const gridIndex = index + 1
      seriesMapping[chart.type] = gridIndex
      gridConfigs.push({
        left: '3%',
        right: '6%',
        top: `${currentTop}%`,
        height: `${chart.height}%`,
      })

      // サブチャート用Y軸
      yAxes.push({
        scale: true,
        gridIndex: gridIndex,
        position: 'right',
        splitNumber: 2,
        axisLabel: {
          show: chart.type !== 'volume',
          color: config.isDarkMode ? '#9ca3af' : '#6b7280',
          fontSize: 10,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: config.showGridlines !== false,
          lineStyle: {
            color: config.colors?.grid || (config.isDarkMode ? '#374151' : '#e5e7eb'),
            width: 1,
            type: 'solid',
            opacity: 0.3,
          },
        },
        min: chart.type === 'rsi' ? 0 : 'dataMin',
        max: chart.type === 'rsi' ? 100 : 'dataMax',
      })
      currentTop += chart.height + 3 // Add gap
    })

    const gridCount = gridConfigs.length

    log.business.info('Dynamic grid structure calculated', {
      operation: 'chart_layout',
      totalGrids: gridCount,
      mainChartHeight,
      subChartCount: numSubCharts,
      visibleSubCharts: visibleSubCharts.map(c => c.type),
    })

    // X軸設定（各グリッドに対応）
    const xAxes = gridConfigs.map((_, index) => ({
      type: 'category' as const,
      data: chartData.dates,
      gridIndex: index,
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: {
        show: config.showGridlines !== false,
        lineStyle: {
          color: config.colors?.grid || (config.isDarkMode ? '#374151' : '#e5e7eb'),
          width: 1,
          type: 'solid' as const,
          opacity: 0.6,
        },
      },
      axisLabel: {
        show: index === gridCount - 1, // 最下部のチャートのみラベル表示
        color: config.isDarkMode ? '#9ca3af' : '#6b7280',
        fontSize: 11,
      },
      min: 'dataMin',
      max: 'dataMax',
    }))

    log.business.info('Chart layout calculation completed', {
      operation: 'chart_layout',
      gridCount,
      xAxesCount: xAxes.length,
      yAxesCount: yAxes.length,
      seriesMapping,
    })

    return {
      gridConfigs,
      xAxes,
      yAxes,
      seriesMapping,
      gridCount,
    }
  }, [
    chartData.dates,
    config.showVolume,
    config.hasRSI,
    config.hasMACD,
    config.showGridlines,
    config.isDarkMode,
    config.colors,
  ])
}