import { useCallback, useRef } from 'react'
import type useDrawingTools from './useDrawingTools'
import type { useChartInstance } from './useChartInstance'
import { PriceData } from '../utils/indicators'

interface MouseEventsConfig {
  enableDrawingTools: boolean
  onCrosshairMove?: (price: number | null, time: number | null) => void
  data: PriceData[]
}

export const useMouseEvents = (
  chartInstance: ReturnType<typeof useChartInstance>,
  drawingTools: ReturnType<typeof useDrawingTools> | undefined,
  config: MouseEventsConfig
) => {
  const lastMouseMoveTime = useRef(0)
  const MOUSE_MOVE_THROTTLE = 16 // 60fps equivalent

  // Helper function to find closest data index by timestamp
  const findClosestDataIndex = useCallback(
    (targetTimestamp: number): number => {
      if (config.data.length === 0) return -1

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

  // Handle mouse click events
  const handleMouseClick = useCallback(
    (event: MouseEvent) => {
      if (!config.enableDrawingTools || !drawingTools || !chartInstance) {
        return
      }

      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top

      const dataPoint = chartInstance.convertPixelToData(offsetX, offsetY, config.data)
      if (!dataPoint) return

      console.log('🖱️ Mouse click:', { offsetX, offsetY, dataPoint })

      // Check if clicking on existing tool
      const clickedTool = drawingTools.getVisibleTools?.()?.find((tool: any) => {
        try {
          if (tool.type === 'line' || tool.type === 'trendline') {
            const lineCoords = chartInstance.convertDataToPixel(
              tool.startPrice,
              tool.startTime,
              config.data
            )
            const endCoords = chartInstance.convertDataToPixel(
              tool.endPrice,
              tool.endTime,
              config.data
            )

            if (!lineCoords || !endCoords) return false

            // Calculate distance from point to line
            const distance =
              Math.abs(
                (endCoords.y - lineCoords.y) * offsetX -
                  (endCoords.x - lineCoords.x) * offsetY +
                  endCoords.x * lineCoords.y -
                  endCoords.y * lineCoords.x
              ) /
              Math.sqrt(
                Math.pow(endCoords.y - lineCoords.y, 2) + Math.pow(endCoords.x - lineCoords.x, 2)
              )

            return distance <= 5 // 5px tolerance
          }

          if (tool.type === 'horizontal') {
            const lineCoords = chartInstance.convertDataToPixel(tool.price, tool.time, config.data)
            if (!lineCoords) return false
            return Math.abs(offsetY - lineCoords.y) <= 3
          }

          if (tool.type === 'vertical') {
            const lineCoords = chartInstance.convertDataToPixel(tool.price, tool.time, config.data)
            if (!lineCoords) return false
            return Math.abs(offsetX - lineCoords.x) <= 3
          }

          return false
        } catch (error) {
          console.error('🖱️ Error checking tool click:', error)
          return false
        }
      })

      if (clickedTool) {
        console.log('🖱️ Tool clicked:', clickedTool.id)
        drawingTools.selectTool(clickedTool.id)
      } else if (drawingTools.isDrawingMode) {
        // Start or continue drawing
        drawingTools.handleDrawingClick?.(dataPoint)
      } else {
        // Clear selection if clicking on empty space
        drawingTools.clearSelection?.()
      }
    },
    [chartInstance, drawingTools, config]
  )

  // Handle mouse move events with throttling
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const now = Date.now()
      if (now - lastMouseMoveTime.current < MOUSE_MOVE_THROTTLE) {
        return
      }
      lastMouseMoveTime.current = now

      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top

      // Handle crosshair movement
      if (config.onCrosshairMove) {
        const dataPoint = chartInstance?.convertPixelToData(offsetX, offsetY, config.data)
        if (dataPoint) {
          config.onCrosshairMove(dataPoint.price, dataPoint.time)
        } else {
          config.onCrosshairMove(null, null)
        }
      }

      // Handle drawing tool mouse move
      if (config.enableDrawingTools && drawingTools) {
        const dataPoint = chartInstance?.convertPixelToData(offsetX, offsetY, config.data)
        if (dataPoint) {
          drawingTools.handleMouseMove?.(dataPoint, event)
        }
      }
    },
    [chartInstance, drawingTools, config]
  )

  // Handle mouse down events
  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!config.enableDrawingTools || !drawingTools) {
        return
      }

      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top

      const dataPoint = chartInstance?.convertPixelToData(offsetX, offsetY, config.data)
      if (dataPoint) {
        console.log('🖱️ Mouse down:', dataPoint)
        drawingTools.handleMouseDown?.(dataPoint, event)
      }
    },
    [chartInstance, drawingTools, config]
  )

  // Handle mouse up events
  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (!config.enableDrawingTools || !drawingTools) {
        return
      }

      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top

      const dataPoint = chartInstance?.convertPixelToData(offsetX, offsetY, config.data)
      if (dataPoint) {
        console.log('🖱️ Mouse up:', dataPoint)
        drawingTools.handleMouseUp?.(dataPoint, event)
      }
    },
    [chartInstance, drawingTools, config]
  )

  // Handle right-click context menu
  const handleRightClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault()

      if (!config.enableDrawingTools || !drawingTools) {
        return
      }

      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top

      const dataPoint = chartInstance?.convertPixelToData(offsetX, offsetY, config.data)
      if (dataPoint) {
        console.log('🖱️ Right click:', dataPoint)
        drawingTools.handleRightClick?.(dataPoint, event)
      }
    },
    [chartInstance, drawingTools, config]
  )

  // Handle mouse wheel events
  const handleMouseWheel = useCallback((event: WheelEvent) => {
    // Prevent default zoom behavior if needed
    if (event.ctrlKey) {
      event.preventDefault()
    }

    // Custom wheel handling logic can be added here
    console.log('🖱️ Mouse wheel:', { deltaY: event.deltaY, ctrlKey: event.ctrlKey })
  }, [])

  return {
    handleMouseClick,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleRightClick,
    handleMouseWheel,
    findClosestDataIndex,
  }
}
