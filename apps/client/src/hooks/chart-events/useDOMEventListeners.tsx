import { useEffect, useRef } from 'react'
import { log } from '@/services/logger'
import { useMemoryManager } from '../../utils/memoryManager'
import type { ChartEventsConfig, ChartEventHandlers } from './types'

type UseDOMEventListenersProps = {
  config: ChartEventsConfig
  chartInstance: any
  drawingTools: any
  handlers: ChartEventHandlers
}

export const useDOMEventListeners = ({
  config,
  chartInstance,
  drawingTools,
  handlers
}: UseDOMEventListenersProps) => {
  const handlersRef = useRef<ChartEventHandlers>(handlers)
  const lastMouseMoveTime = useRef(0)
  const MOUSE_MOVE_THROTTLE = 16 // 60fps
  const { addEventListener, cleanup } = useMemoryManager('dom-event-listeners')

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  // DOM event listeners management
  useEffect(() => {
    if (!chartInstance.chartReady || !chartInstance.chartRef.current) return

    const chartEchartsInstance = chartInstance.getEChartsInstance()
    if (!chartEchartsInstance) return

    const chartDom = chartEchartsInstance.getDom()
    if (!chartDom) return

    const clickHandler = (event: MouseEvent) => {
      log.business.debug('🎯 DOM click event fired!')

      if (!config.enableDrawingTools) return

      const params = {
        offsetX: event.offsetX,
        offsetY: event.offsetY,
        event: event,
        domClick: true,
      } as any

      handlersRef.current.handleChartClick?.(params)
    }

    const mouseDownHandler = (event: MouseEvent) => {
      log.business.debug('🎯 DOM mouse down event fired!')

      if (!config.enableDrawingTools) return

      const params = {
        offsetX: event.offsetX,
        offsetY: event.offsetY,
        event: event,
        domMouseDown: true,
      } as any

      handlersRef.current.handleChartMouseDown?.(params)
    }

    const mouseMoveHandler = (event: MouseEvent) => {
      // Get current drawing state to determine if this is drag-related
      const currentState = drawingTools
      const isDragRelated = currentState?.isMouseDown || currentState?.isDragging

      if (isDragRelated) {
        log.business.debug('🎯 DOM mouse move (drag-related) event fired!', {
          offsetX: event.offsetX,
          offsetY: event.offsetY,
          enableDrawingTools: config.enableDrawingTools,
          isDrawing: currentState?.isDrawing,
          isMouseDown: currentState?.isMouseDown,
          isDragging: currentState?.isDragging,
        })
      }

      // Throttling for non-drag events
      const now = Date.now()
      if (!isDragRelated && now - lastMouseMoveTime.current < MOUSE_MOVE_THROTTLE) {
        return
      }
      lastMouseMoveTime.current = now

      // Only handle if drawing tools are enabled and in relevant states
      if (
        config.enableDrawingTools &&
        (currentState?.isDrawing || currentState?.isMouseDown || currentState?.isDragging)
      ) {
        const params = {
          offsetX: event.offsetX,
          offsetY: event.offsetY,
          event: event,
          domMove: true,
        } as any

        try {
          handlersRef.current.handleChartMouseMove?.(params)
        } catch (error: unknown) {
          log.business.error('🎯 Error calling handleChartMouseMove:', error)
        }
      }
    }

    const mouseUpHandler = (event: MouseEvent) => {
      log.business.debug('🎯 DOM mouse up event fired!')

      if (!config.enableDrawingTools) return

      const params = {
        offsetX: event.offsetX,
        offsetY: event.offsetY,
        event: event,
        domMouseUp: true,
      } as any

      handlersRef.current.handleChartMouseUp?.(params)
    }

    const rightClickHandler = (event: MouseEvent) => {
      log.business.debug('🎯 DOM right click event fired!')
      event.preventDefault() // Prevent browser context menu

      if (!config.enableDrawingTools) return

      const params = {
        offsetX: event.offsetX,
        offsetY: event.offsetY,
        event: event,
        domRightClick: true,
      } as any

      handlersRef.current.handleChartRightClick?.(params)
    }

    // Add event listeners through memory manager
    addEventListener(chartDom, 'click', clickHandler)
    addEventListener(chartDom, 'mousedown', mouseDownHandler)
    addEventListener(chartDom, 'mousemove', mouseMoveHandler)
    addEventListener(chartDom, 'mouseup', mouseUpHandler)
    addEventListener(chartDom, 'contextmenu', rightClickHandler)
    
    log.business.debug('🎯 DOM event listeners added')

    // Cleanup is handled automatically by memory manager
    return cleanup
  }, [chartInstance.chartReady, config.enableDrawingTools, drawingTools])

  return null // This hook doesn't return any values, just manages side effects
}