import type useDrawingTools from './useDrawingTools'
import type { useChartInstance } from './useChartInstance'
import { PriceData } from '../utils/indicators'
import { useChartEvents as useRefactoredChartEvents } from './chart-events'

interface ChartEventsConfig {
  enableDrawingTools: boolean
  onCrosshairMove?: (price: number | null, time: number | null) => void
  onChartClick?: () => void
  data: PriceData[]
}

/**
 * チャートイベント管理フック
 * 責任: マウスイベント、クリックイベント、描画ツールとの連携
 */
export const useChartEvents = (
  chartInstance: ReturnType<typeof useChartInstance>,
  drawingTools: ReturnType<typeof useDrawingTools> | undefined,
  config: ChartEventsConfig
) => {
  // Use the refactored modular version from chart-events directory
  return useRefactoredChartEvents(chartInstance, drawingTools, config)
}

export default useChartEvents
