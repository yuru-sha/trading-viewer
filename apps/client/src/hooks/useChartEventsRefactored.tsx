import { useCallback, useEffect, useRef } from 'react'
import type useDrawingTools from './useDrawingTools'
import type { useChartInstance } from './useChartInstance'
import { PriceData } from '../utils/indicators'
import { useMouseEvents } from './useMouseEvents'
import { useDrawingEvents } from './useDrawingEvents'
import { useKeyboardEvents } from './useKeyboardEvents'
import { useChartEventBus } from './useChartEventBus'

interface ChartEventsConfig {
  enableDrawingTools: boolean
  enableShortcuts?: boolean
  onCrosshairMove?: (price: number | null, time: number | null) => void
  onChartClick?: () => void
  data: PriceData[]
}

/**
 * Refactored チャートイベント管理フック
 * 責任: 各種イベントハンドラーの統合とイベントバスによる連携
 */
export const useChartEventsRefactored = (
  chartInstance: ReturnType<typeof useChartInstance>,
  drawingTools: ReturnType<typeof useDrawingTools> | undefined,
  config: ChartEventsConfig
) => {
  const eventBus = useChartEventBus()
  const chartRef = useRef<HTMLElement | null>(null)

  // Mouse events handler
  const mouseEvents = useMouseEvents(chartInstance, drawingTools, {
    enableDrawingTools: config.enableDrawingTools,
    onCrosshairMove: config.onCrosshairMove,
    data: config.data,
  })

  // Drawing events handler
  const drawingEvents = useDrawingEvents(chartInstance, drawingTools, {
    enableDrawingTools: config.enableDrawingTools,
    data: config.data,
  })

  // Keyboard events handler
  const keyboardEvents = useKeyboardEvents(chartInstance, drawingTools, {
    enableDrawingTools: config.enableDrawingTools,
    enableShortcuts: config.enableShortcuts ?? true,
  })

  // Chart click handler that integrates with event bus
  const handleChartClick = useCallback(
    (params: any) => {
      console.log('🎯 Chart clicked:', params)

      // Emit click event to event bus
      const dataPoint = chartInstance?.convertPixelToData(
        params.offsetX,
        params.offsetY,
        config.data
      )

      if (dataPoint) {
        eventBus.emit('interaction:click', {
          price: dataPoint.price,
          time: dataPoint.time,
          event: params.originalEvent || params,
        })
      }

      // Call the original onChartClick callback
      config.onChartClick?.()

      // Handle mouse click for drawing tools
      if (params.originalEvent) {
        mouseEvents.handleMouseClick(params.originalEvent)
      }
    },
    [chartInstance, config, eventBus, mouseEvents]
  )

  // Setup DOM event listeners
  useEffect(() => {
    const chartElement = chartRef.current
    if (!chartElement) return

    const handleClick = (event: MouseEvent) => {
      mouseEvents.handleMouseClick(event)
    }

    const handleMouseDown = (event: MouseEvent) => {
      mouseEvents.handleMouseDown(event)
    }

    const handleMouseMove = (event: MouseEvent) => {
      mouseEvents.handleMouseMove(event)
    }

    const handleMouseUp = (event: MouseEvent) => {
      mouseEvents.handleMouseUp(event)
    }

    const handleContextMenu = (event: MouseEvent) => {
      mouseEvents.handleRightClick(event)
    }

    const handleWheel = (event: WheelEvent) => {
      mouseEvents.handleMouseWheel(event)
    }

    // Add event listeners
    chartElement.addEventListener('click', handleClick)
    chartElement.addEventListener('mousedown', handleMouseDown)
    chartElement.addEventListener('mousemove', handleMouseMove)
    chartElement.addEventListener('mouseup', handleMouseUp)
    chartElement.addEventListener('contextmenu', handleContextMenu)
    chartElement.addEventListener('wheel', handleWheel)

    return () => {
      // Clean up event listeners
      chartElement.removeEventListener('click', handleClick)
      chartElement.removeEventListener('mousedown', handleMouseDown)
      chartElement.removeEventListener('mousemove', handleMouseMove)
      chartElement.removeEventListener('mouseup', handleMouseUp)
      chartElement.removeEventListener('contextmenu', handleContextMenu)
      chartElement.removeEventListener('wheel', handleWheel)
    }
  }, [mouseEvents])

  // Event bus integration for drawing tools
  useEffect(() => {
    if (!config.enableDrawingTools || !drawingTools) return

    // Subscribe to drawing events
    const unsubscribeToolSelect = eventBus.on('drawing:tool-selected', ({ toolType }) => {
      drawingEvents.handleToolSelect(toolType)
    })

    const unsubscribeToolCreated = eventBus.on('drawing:tool-created', ({ toolId, toolType }) => {
      console.log('🎨 Tool created:', { toolId, toolType })
    })

    const unsubscribeToolUpdated = eventBus.on('drawing:tool-updated', ({ toolId, changes }) => {
      console.log('🎨 Tool updated:', { toolId, changes })
    })

    const unsubscribeToolDeleted = eventBus.on('drawing:tool-deleted', ({ toolId }) => {
      console.log('🎨 Tool deleted:', toolId)
    })

    const unsubscribeModeChanged = eventBus.on('drawing:mode-changed', ({ enabled }) => {
      drawingEvents.handleDrawingModeToggle(enabled)
    })

    const unsubscribeSelectionChanged = eventBus.on(
      'interaction:selection-changed',
      ({ selectedToolIds }) => {
        console.log('🎯 Selection changed:', selectedToolIds)
      }
    )

    return () => {
      unsubscribeToolSelect()
      unsubscribeToolCreated()
      unsubscribeToolUpdated()
      unsubscribeToolDeleted()
      unsubscribeModeChanged()
      unsubscribeSelectionChanged()
    }
  }, [config.enableDrawingTools, drawingTools, eventBus, drawingEvents])

  // Performance monitoring
  useEffect(() => {
    const unsubscribeLagDetected = eventBus.on(
      'performance:lag-detected',
      ({ duration, threshold }) => {
        console.warn(
          `⚠️ Performance lag detected: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`
        )
      }
    )

    const unsubscribeError = eventBus.on('error:chart-error', ({ error, context }) => {
      console.error(`❌ Chart error in ${context}:`, error)
    })

    const unsubscribeDrawingError = eventBus.on('error:drawing-error', ({ error, toolId }) => {
      console.error(`❌ Drawing error${toolId ? ` for tool ${toolId}` : ''}:`, error)
    })

    return () => {
      unsubscribeLagDetected()
      unsubscribeError()
      unsubscribeDrawingError()
    }
  }, [eventBus])

  // Chart lifecycle events
  useEffect(() => {
    if (chartInstance) {
      eventBus.emit('chart:mounted', {
        chartId: 'main-chart',
        instance: chartInstance,
      })

      return () => {
        eventBus.emit('chart:unmounted', {
          chartId: 'main-chart',
        })
      }
    }
  }, [chartInstance, eventBus])

  // Data update events
  useEffect(() => {
    if (config.data.length > 0) {
      eventBus.emit('chart:data-updated', {
        chartId: 'main-chart',
        dataLength: config.data.length,
      })
    }
  }, [config.data.length, eventBus])

  // Utility function to set chart DOM reference
  const setChartRef = useCallback((element: HTMLElement | null) => {
    chartRef.current = element
  }, [])

  // Expose drawing events for external use
  const exposedDrawingEvents = {
    selectTool: (toolType: string) => {
      eventBus.emit('drawing:tool-selected', { toolType })
    },
    toggleDrawingMode: (enabled: boolean) => {
      eventBus.emit('drawing:mode-changed', { enabled })
    },
    deleteTool: (toolId: string) => {
      drawingEvents.handleToolDelete(toolId)
      eventBus.emit('drawing:tool-deleted', { toolId })
    },
    duplicateTool: (toolId: string) => {
      drawingEvents.handleToolDuplicate(toolId)
    },
    clearAll: () => {
      drawingEvents.handleClearAll()
    },
    getDrawingState: drawingEvents.getDrawingState,
  }

  // Expose keyboard event utilities
  const exposedKeyboardEvents = {
    isKeyPressed: keyboardEvents.isKeyPressed,
    getModifierStates: keyboardEvents.getModifierStates,
    getPressedKeys: keyboardEvents.getPressedKeys,
  }

  return {
    // Core event handler
    handleChartClick,
    setChartRef,

    // Event bus
    eventBus,

    // Drawing events
    drawing: exposedDrawingEvents,

    // Keyboard events
    keyboard: exposedKeyboardEvents,

    // Mouse events utilities
    mouse: {
      findClosestDataIndex: mouseEvents.findClosestDataIndex,
    },

    // Performance monitoring
    startPerformanceTimer: eventBus.startPerformanceTimer,

    // Debug utilities
    debug: {
      getEventHistory: eventBus.getEventHistory,
      getListenerCount: eventBus.getListenerCount,
      debugEventBus: eventBus.debug,
    },
  }
}

export default useChartEventsRefactored
