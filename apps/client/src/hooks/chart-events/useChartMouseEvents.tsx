import { useCallback, useRef } from 'react'
import { ECElementEvent } from 'echarts'
import { log } from '@/services/logger'
import type { ChartEventsConfig } from './types'

type UseChartMouseEventsProps = {
  config: ChartEventsConfig
  chartInstance: any
  drawingTools: any
  findClosestDataIndex: (timestamp: number) => number
}

export const useChartMouseEvents = ({ 
  config, 
  chartInstance, 
  drawingTools,
  findClosestDataIndex 
}: UseChartMouseEventsProps) => {
  const lastMouseMoveTime = useRef(0)
  const MOUSE_MOVE_THROTTLE = 16 // 60fps

  const handleChartMouseMove = useCallback(
    (params: ECElementEvent) => {
      const currentState = drawingTools
      const isDragRelated = currentState?.isMouseDown || currentState?.isDragging

      // Throttling: only restrict for non-drag related events
      if (!isDragRelated) {
        const now = Date.now()
        if (now - lastMouseMoveTime.current < MOUSE_MOVE_THROTTLE) {
          return
        }
        lastMouseMoveTime.current = now
      }

      log.business.debug('🎯 handleChartMouseMove entry point:', {
        offsetX: params.offsetX,
        offsetY: params.offsetY,
        isDragRelated,
        isMouseDown: currentState?.isMouseDown,
        isDragging: currentState?.isDragging,
      })

      const dataPoint = chartInstance.convertPixelToData(
        params.offsetX,
        params.offsetY,
        config.data
      )
      if (!dataPoint) {
        log.business.debug('🎯 Mouse move - failed to convert pixel to data')
        return
      }

      // Update crosshair only when drawing tools are disabled
      if (!config.enableDrawingTools && config.onCrosshairMove) {
        config.onCrosshairMove(dataPoint.price, dataPoint.timestamp)
      }

      const currentTools = drawingTools
      if (!config.enableDrawingTools || !currentTools) {
        return
      }

      // Handle drag movement
      if (currentTools.isDragging) {
        log.business.debug('🎯 Mouse move during drag - updating drag position')
        if (currentTools.updateDrag) {
          currentTools.updateDrag(params.offsetX, params.offsetY, chartInstance, config.data)
        }
        return
      }

      // Start drag if mouse is down and moving with sufficient distance
      const canStartDrag = currentTools.isMouseDown && !currentTools.isDragging && currentTools.dragState

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
          } else if (selectedTool.points.length >= 2) {
            // Handle two-point lines
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
                currentTools.mouseDown(
                  selectedTool.id,
                  'start',
                  { x: params.offsetX, y: params.offsetY },
                  selectedTool.points
                )
              } else if (endDistance <= handleTolerance) {
                currentTools.mouseDown(
                  selectedTool.id,
                  'end',
                  { x: params.offsetX, y: params.offsetY },
                  selectedTool.points
                )
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

  return {
    handleChartMouseMove,
    handleChartMouseDown,
    handleChartMouseUp
  }
}