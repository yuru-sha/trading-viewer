import { useCallback, useEffect, useRef } from 'react'
import { useChartClick } from './useChartClick'
import { useChartMouseEvents } from './useChartMouseEvents'
import { useChartRightClick } from './useChartRightClick'
import { useDOMEventListeners } from './useDOMEventListeners'
import type { ChartEventsConfig, ChartEventHandlers } from './types'

type UseChartEventsParams = {
  chartInstance: ReturnType<typeof import('../useChartInstance')>
  drawingTools: any
  config: ChartEventsConfig
}

export const useChartEvents = (
  chartInstance: any,
  drawingTools: any,
  config: ChartEventsConfig
) => {
  // Helper function to find closest data index by timestamp
  const findClosestDataIndex = useCallback(
    (targetTimestamp: number): number => {
      if (!config.data || config.data.length === 0) {
        console.warn('🎯 findClosestDataIndex: No chart data available', { targetTimestamp })
        return 0 // Return 0 instead of -1 to allow basic functionality
      }

      // First try exact match
      const exactIndex = config.data.findIndex(d => d.timestamp === targetTimestamp)
      if (exactIndex !== -1) return exactIndex

      // Find closest timestamp
      let closestIndex = 0
      let minDiff = Math.abs(config.data[0].timestamp - targetTimestamp)

      for (let i = 1; i < config.data.length; i++) {
        const diff = Math.abs(config.data[i].timestamp - targetTimestamp)
        if (diff < minDiff) {
          minDiff = diff
          closestIndex = i
        }
      }

      return closestIndex
    },
    [config.data]
  )

  // Use separated hook functions
  const { handleChartClick } = useChartClick({
    config,
    chartInstance,
    drawingTools,
    findClosestDataIndex,
  })

  const { handleChartMouseMove, handleChartMouseDown, handleChartMouseUp } = useChartMouseEvents({
    config,
    chartInstance,
    drawingTools,
    findClosestDataIndex,
  })

  const { handleChartRightClick } = useChartRightClick({
    config,
    chartInstance,
    drawingTools,
    findClosestDataIndex,
  })

  // Create handlers object
  const handlers: ChartEventHandlers = {
    handleChartClick,
    handleChartMouseMove,
    handleChartMouseDown,
    handleChartMouseUp,
    handleChartRightClick,
  }

  // Use DOM event listeners hook
  useDOMEventListeners({
    config,
    chartInstance,
    drawingTools,
    handlers,
  })

  return handlers
}
