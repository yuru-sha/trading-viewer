import { useCallback, useRef, useEffect } from 'react'
import { ECElementEvent } from 'echarts'
import { log } from '@/services/logger'
import type { ChartEventsConfig } from './types'

type ChartInstanceType = {
  chartRef: React.RefObject<{ getEchartsInstance: () => unknown }>
  convertPixelToData: (
    x: number,
    y: number,
    data: ChartEventsConfig['data']
  ) => { timestamp: number; price: number } | null
}

type DrawingToolsType = {
  selectedToolId: string | null
  isMouseDown: boolean
  isDragging: boolean
  dragState: {
    toolId?: string
    handleType?: string
    startPos?: { x: number; y: number }
    originalPoints?: unknown[]
  } | null
  getTool: (
    id: string
  ) => { id: string; type: string; points: { timestamp: number; price: number }[] } | null
  mouseDown: (
    toolId: string,
    handleType: string,
    pos: { x: number; y: number },
    points: unknown[]
  ) => void
  updateDrag?: (
    x: number,
    y: number,
    chartInstance: ChartInstanceType,
    data: ChartEventsConfig['data']
  ) => void
  startDrag?: (
    toolId: string,
    handleType: string,
    startPos: { x: number; y: number },
    originalPoints: unknown[]
  ) => void
  endDrag: (
    event: { timestamp: number; price: number; x: number; y: number },
    tool: unknown | null
  ) => void
  updateDrawing: (event: { timestamp: number; price: number; x: number; y: number }) => void
}

type UseChartMouseEventsProps = {
  config: ChartEventsConfig
  chartInstance: ChartInstanceType
  drawingTools: DrawingToolsType
  findClosestDataIndex: (timestamp: number) => number
}

export const useChartMouseEvents = ({
  config,
  chartInstance,
  drawingTools,
  findClosestDataIndex,
}: UseChartMouseEventsProps) => {
  const lastMouseMoveTime = useRef(0)
  const MOUSE_MOVE_THROTTLE = 4 // ~240fps for maximum responsiveness
  const isMouseDownRef = useRef(false)
  const rafId = useRef<number | null>(null)

  const handleChartMouseMove = useCallback(
    (params: ECElementEvent) => {
      const currentState = drawingTools
      const isDragRelated =
        currentState?.isMouseDown || currentState?.isDragging || isMouseDownRef.current

      // For drag operations, completely skip throttling and logging
      if (!isDragRelated) {
        const now = Date.now()
        if (now - lastMouseMoveTime.current < MOUSE_MOVE_THROTTLE) {
          return
        }
        lastMouseMoveTime.current = now
      }

      // Skip all unnecessary processing during drag for maximum performance
      // Completely skip debug logging during drag operations
      if (process.env.NODE_ENV === 'development' && !isDragRelated && Math.random() < 0.05) {
        log.business.debug('🎯 handleChartMouseMove entry point:', {
          offsetX: params.offsetX,
          offsetY: params.offsetY,
          isDragRelated,
        })
      }

      // Skip expensive data conversion during drag for better performance
      if (!isDragRelated) {
        const dataPoint = chartInstance.convertPixelToData(
          params.offsetX,
          params.offsetY,
          config.data
        )
        if (!dataPoint) {
          return
        }
      }

      // Update crosshair only when drawing tools are disabled
      if (!config.enableDrawingTools && config.onCrosshairMove) {
        config.onCrosshairMove(dataPoint.price, dataPoint.timestamp)
      }

      const currentTools = drawingTools
      if (!config.enableDrawingTools || !currentTools) {
        return
      }

      // Handle drag movement with requestAnimationFrame for maximum smoothness
      if (currentTools.isDragging) {
        // Use requestAnimationFrame to ensure smooth updates
        if (rafId.current) {
          cancelAnimationFrame(rafId.current)
        }

        rafId.current = requestAnimationFrame(() => {
          if (currentTools.updateDrag) {
            currentTools.updateDrag(params.offsetX, params.offsetY, chartInstance, config.data)
          }
          rafId.current = null
        })
        return
      }

      // Start drag if mouse is down and moving with sufficient distance
      const canStartDrag =
        currentTools.isMouseDown && !currentTools.isDragging && currentTools.dragState

      if (canStartDrag) {
        const dragThreshold = 5 // pixels
        const startPos = currentTools.dragState.startPos
        if (startPos) {
          const distance = Math.sqrt(
            Math.pow(params.offsetX - startPos.x, 2) + Math.pow(params.offsetY - startPos.y, 2)
          )

          if (distance >= dragThreshold) {
            log.business.debug('🎯 Starting drag from mouse move - threshold exceeded')
            const { toolId, handleType, originalPoints } = currentTools.dragState
            if (currentTools.startDrag) {
              currentTools.startDrag(toolId!, handleType!, startPos, originalPoints)
            }
            return
          }
        }
      }

      // Handle drawing tools mouse move
      if (!currentTools.isDrawing) {
        return
      }

      const chartEvent = {
        timestamp: dataPoint.timestamp,
        price: dataPoint.price,
        x: params.offsetX,
        y: params.offsetY,
      }

      currentTools.updateDrawing(chartEvent)
    },
    [config, chartInstance, drawingTools]
  )

  const handleChartMouseDown = useCallback(
    (params: ECElementEvent) => {
      const currentTools = drawingTools
      if (!config.enableDrawingTools || !currentTools) {
        return
      }

      // Set mouse down flag for performance optimization
      isMouseDownRef.current = true
      log.business.debug('🎯 handleChartMouseDown called:', params)

      if (currentTools.selectedToolId) {
        const selectedTool = currentTools.getTool(currentTools.selectedToolId)
        if (!selectedTool || !selectedTool.points || selectedTool.points.length < 1) {
          return
        }

        const chart = chartInstance.chartRef.current?.getEchartsInstance()
        if (!chart) return

        try {
          // Handle different tool types for mouse down
          if (selectedTool.type === 'horizontal' || selectedTool.type === 'vertical') {
            const dataIndex = findClosestDataIndex(selectedTool.points[0].timestamp)
            const pixel = chart.convertToPixel('grid', [dataIndex, selectedTool.points[0].price])

            if (pixel && Array.isArray(pixel)) {
              const tolerance = 10
              let shouldStartDrag = false

              if (selectedTool.type === 'horizontal') {
                shouldStartDrag = Math.abs(params.offsetY - pixel[1]) <= tolerance
              } else if (selectedTool.type === 'vertical') {
                shouldStartDrag = Math.abs(params.offsetX - pixel[0]) <= tolerance
              }

              if (shouldStartDrag) {
                log.business.debug('🎯 MouseDown on single-point line body')
                currentTools.mouseDown(
                  selectedTool.id,
                  'line',
                  { x: params.offsetX, y: params.offsetY },
                  selectedTool.points
                )
              }
            }
          } else if (selectedTool.type === 'fibonacci' && selectedTool.points.length >= 2) {
            // Handle Fibonacci Retracement specifically
            const startDataIndex = findClosestDataIndex(selectedTool.points[0].timestamp)
            const endDataIndex = findClosestDataIndex(selectedTool.points[1].timestamp)

            const startPixel = chart.convertToPixel('grid', [
              startDataIndex,
              selectedTool.points[0].price,
            ])
            const endPixel = chart.convertToPixel('grid', [
              endDataIndex,
              selectedTool.points[1].price,
            ])

            if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
              const handleTolerance = 12

              // Check handles for fibonacci start/end points
              const startDistance = Math.sqrt(
                Math.pow(params.offsetX - startPixel[0], 2) +
                  Math.pow(params.offsetY - startPixel[1], 2)
              )
              const endDistance = Math.sqrt(
                Math.pow(params.offsetX - endPixel[0], 2) +
                  Math.pow(params.offsetY - endPixel[1], 2)
              )

              if (startDistance <= handleTolerance) {
                log.business.debug('🎯 MouseDown on fibonacci start handle')
                currentTools.mouseDown(
                  selectedTool.id,
                  'start',
                  { x: params.offsetX, y: params.offsetY },
                  selectedTool.points
                )
              } else if (endDistance <= handleTolerance) {
                log.business.debug('🎯 MouseDown on fibonacci end handle')
                currentTools.mouseDown(
                  selectedTool.id,
                  'end',
                  { x: params.offsetX, y: params.offsetY },
                  selectedTool.points
                )
              } else {
                // Check if clicking within fibonacci area for moving entire fibonacci
                const leftX = Math.min(startPixel[0], endPixel[0])
                const rightX = Math.max(startPixel[0], endPixel[0])
                const topY = Math.min(startPixel[1], endPixel[1])
                const bottomY = Math.max(startPixel[1], endPixel[1])

                const extendX = Math.abs(rightX - leftX) * 0.1
                const extendY = Math.abs(bottomY - topY) * 0.1

                const expandedLeftX = leftX - extendX
                const expandedRightX = rightX + extendX
                const expandedTopY = topY - extendY
                const expandedBottomY = bottomY + extendY

                if (
                  params.offsetX >= expandedLeftX &&
                  params.offsetX <= expandedRightX &&
                  params.offsetY >= expandedTopY &&
                  params.offsetY <= expandedBottomY
                ) {
                  log.business.debug('🎯 MouseDown on fibonacci body for moving entire fibonacci')
                  currentTools.mouseDown(
                    selectedTool.id,
                    'line',
                    { x: params.offsetX, y: params.offsetY },
                    selectedTool.points
                  )
                }
              }
            }
          } else if (selectedTool.points.length >= 2) {
            // Handle other two-point lines (trendlines, etc.)
            const startDataIndex = findClosestDataIndex(selectedTool.points[0].timestamp)
            const endDataIndex = findClosestDataIndex(selectedTool.points[1].timestamp)

            const startPixel = chart.convertToPixel('grid', [
              startDataIndex,
              selectedTool.points[0].price,
            ])
            const endPixel = chart.convertToPixel('grid', [
              endDataIndex,
              selectedTool.points[1].price,
            ])

            if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
              const handleTolerance = 12

              // Check handles
              const startDistance = Math.sqrt(
                Math.pow(params.offsetX - startPixel[0], 2) +
                  Math.pow(params.offsetY - startPixel[1], 2)
              )
              const endDistance = Math.sqrt(
                Math.pow(params.offsetX - endPixel[0], 2) +
                  Math.pow(params.offsetY - endPixel[1], 2)
              )

              if (startDistance <= handleTolerance) {
                log.business.debug('🎯 MouseDown on start handle')
                currentTools.mouseDown(
                  selectedTool.id,
                  'start',
                  { x: params.offsetX, y: params.offsetY },
                  selectedTool.points
                )
              } else if (endDistance <= handleTolerance) {
                log.business.debug('🎯 MouseDown on end handle')
                currentTools.mouseDown(
                  selectedTool.id,
                  'end',
                  { x: params.offsetX, y: params.offsetY },
                  selectedTool.points
                )
              } else {
                // Check if clicking on the line itself for moving the entire line
                const distanceFromPointToLine = (
                  px: number,
                  py: number,
                  x1: number,
                  y1: number,
                  x2: number,
                  y2: number
                ): number => {
                  const A = px - x1
                  const B = py - y1
                  const C = x2 - x1
                  const D = y2 - y1

                  const dot = A * C + B * D
                  const lenSq = C * C + D * D
                  let param = -1
                  if (lenSq !== 0) {
                    param = dot / lenSq
                  }

                  let xx: number, yy: number

                  if (param < 0) {
                    xx = x1
                    yy = y1
                  } else if (param > 1) {
                    xx = x2
                    yy = y2
                  } else {
                    xx = x1 + param * C
                    yy = y1 + param * D
                  }

                  const dx = px - xx
                  const dy = py - yy
                  return Math.sqrt(dx * dx + dy * dy)
                }

                const lineDistance = distanceFromPointToLine(
                  params.offsetX,
                  params.offsetY,
                  startPixel[0],
                  startPixel[1],
                  endPixel[0],
                  endPixel[1]
                )

                const lineTolerance = 10
                if (lineDistance <= lineTolerance) {
                  log.business.debug('🎯 MouseDown on line body for moving entire line')
                  currentTools.mouseDown(
                    selectedTool.id,
                    'line',
                    { x: params.offsetX, y: params.offsetY },
                    selectedTool.points
                  )
                }
              }
            }
          }
        } catch (error: unknown) {
          log.business.error('🎯 Error in handleChartMouseDown:', error)
        }
      }
    },
    [config, chartInstance, drawingTools, findClosestDataIndex]
  )

  const handleChartMouseUp = useCallback(
    (params: ECElementEvent) => {
      // Reset mouse down flag and cancel any pending animation frames
      isMouseDownRef.current = false
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }

      const currentTools = drawingTools
      if (!config.enableDrawingTools || !currentTools) {
        return
      }

      if (currentTools.isDragging) {
        log.business.debug('🎯 Mouse up during drag - ending drag')

        const dataPoint = chartInstance.convertPixelToData(
          params.offsetX,
          params.offsetY,
          config.data
        )

        if (dataPoint && currentTools.dragState?.toolId) {
          const tool = currentTools.getTool(currentTools.dragState.toolId)
          if (tool) {
            const chartEvent = {
              timestamp: dataPoint.timestamp,
              price: dataPoint.price,
              x: params.offsetX,
              y: params.offsetY,
            }
            currentTools.endDrag(chartEvent, tool)
          }
        }
        return
      }

      // Handle simple clicks that didn't turn into drags
      if (currentTools.isMouseDown && !currentTools.isDragging) {
        log.business.debug('🎯 Mouse up without drag - resetting mouse down state')
        if (currentTools.endDrag) {
          const dataPoint = chartInstance.convertPixelToData(
            params.offsetX,
            params.offsetY,
            config.data
          )
          if (dataPoint) {
            const dummyEvent = {
              timestamp: dataPoint.timestamp,
              price: dataPoint.price,
              x: params.offsetX,
              y: params.offsetY,
            }
            currentTools.endDrag(dummyEvent, null)
          }
        }
      }
    },
    [config, chartInstance, drawingTools]
  )

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [])

  return {
    handleChartMouseMove,
    handleChartMouseDown,
    handleChartMouseUp,
  }
}
