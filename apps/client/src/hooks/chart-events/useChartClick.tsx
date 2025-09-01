import { useCallback } from 'react'
import { ECElementEvent } from 'echarts'
import { log } from '@/services/logger'
import type { ChartEventsConfig } from './types'
import type { DrawingTool } from '@shared/types/chart'

type UseChartClickProps = {
  config: ChartEventsConfig
  chartInstance: any
  drawingTools: any
  findClosestDataIndex: (timestamp: number) => number
}

export const useChartClick = ({ 
  config, 
  chartInstance, 
  drawingTools, 
  findClosestDataIndex 
}: UseChartClickProps) => {
  const distanceFromPointToLine = useCallback((
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
  }, [])

  const findClickedTool = useCallback((params: ECElementEvent, tools: any[]): DrawingTool | null => {
    return tools.find((tool: DrawingTool) => {
      if (!tool.points || tool.points.length < 1) {
        return false
      }

      const tolerance = 10 // pixels
      const chart = chartInstance.chartRef.current?.getEchartsInstance()
      if (!chart) return false

      try {
        // Handle horizontal and vertical lines (single point)
        if (tool.type === 'horizontal' || tool.type === 'vertical') {
          if (tool.points.length < 1) return false

          const dataIndex = findClosestDataIndex(tool.points[0].timestamp)
          if (dataIndex === -1) return false
          const pixel = chart.convertToPixel('grid', [dataIndex, tool.points[0].price])

          if (pixel && Array.isArray(pixel)) {
            if (tool.type === 'horizontal') {
              return Math.abs(params.offsetY - pixel[1]) <= tolerance
            } else if (tool.type === 'vertical') {
              return Math.abs(params.offsetX - pixel[0]) <= tolerance
            }
          }
          return false
        }

        // Handle Fibonacci Retracement
        if (tool.type === 'fibonacci') {
          if (tool.points.length < 2) return false

          const startDataIndex = findClosestDataIndex(tool.points[0].timestamp)
          const startPixel = chart.convertToPixel('grid', [
            startDataIndex,
            tool.points[0].price,
          ])

          if (startPixel && Array.isArray(startPixel)) {
            const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
            const startPrice = tool.points[0].price
            const endPrice = tool.points[1].price
            const priceRange = endPrice - startPrice

            for (const level of fibLevels) {
              const levelPrice = startPrice + priceRange * level
              const levelPixel = chart.convertToPixel('grid', [startDataIndex, levelPrice])

              if (levelPixel && Array.isArray(levelPixel)) {
                if (Math.abs(params.offsetY - levelPixel[1]) <= tolerance) {
                  const endDataIndex = findClosestDataIndex(tool.points[1].timestamp)
                  const endPixel = chart.convertToPixel('grid', [
                    endDataIndex,
                    tool.points[1].price,
                  ])

                  if (endPixel && Array.isArray(endPixel)) {
                    const lineStartX = Math.min(startPixel[0], endPixel[0])
                    const lineEndX =
                      Math.max(startPixel[0], endPixel[0]) +
                      Math.abs(startPixel[0] - endPixel[0]) * 0.2

                    if (params.offsetX >= lineStartX && params.offsetX <= lineEndX) {
                      return true
                    }
                  }
                }
              }
            }
          }
          return false
        }

        // Handle two-point lines (trendlines, etc.)
        if (tool.points.length < 2) {
          return false
        }

        const startDataIndex = findClosestDataIndex(tool.points[0].timestamp)
        const endDataIndex = findClosestDataIndex(tool.points[1].timestamp)

        const startPixel = chart.convertToPixel('grid', [startDataIndex, tool.points[0].price])
        const endPixel = chart.convertToPixel('grid', [endDataIndex, tool.points[1].price])

        if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
          const distance = distanceFromPointToLine(
            params.offsetX,
            params.offsetY,
            startPixel[0],
            startPixel[1],
            endPixel[0],
            endPixel[1]
          )
          return distance <= tolerance
        }
      } catch (error: unknown) {
        log.business.error('🎯 Error checking tool click:', error)
      }
      return false
    })
  }, [chartInstance, findClosestDataIndex, distanceFromPointToLine])

  const handleChartClick = useCallback(
    (params: ECElementEvent) => {
      log.business.debug('🎯 Chart clicked:', params)

      config.onChartClick?.()

      const currentTools = drawingTools
      if (!config.enableDrawingTools || !currentTools) {
        return
      }

      const dataPoint = chartInstance.convertPixelToData(
        params.offsetX,
        params.offsetY,
        config.data
      )
      
      if (!dataPoint) {
        return
      }

      // Find clicked tool
      const clickedTool = findClickedTool(params, currentTools.getVisibleTools?.() || [])

      if (clickedTool) {
        const wasSelected = currentTools.selectedToolId === clickedTool.id

        if (wasSelected) {
          // Handle already selected tool interaction
          log.business.debug('🎯 Line was already selected')
        } else {
          // Select the tool
          log.business.debug('🎯 Selecting line for first time')
          currentTools.selectTool(clickedTool.id)
        }
        return
      } else {
        // Deselect if clicking elsewhere
        if (currentTools.selectedToolId) {
          log.business.debug('🎯 Deselecting tool')
          currentTools.selectTool(null)
        }
      }

      // Handle drawing tools
      if (!currentTools.canDraw) {
        log.business.debug('🎯 Cannot draw - no active tool selected')
        return
      }

      const chartEvent = {
        timestamp: dataPoint.timestamp,
        price: dataPoint.price,
        x: params.offsetX,
        y: params.offsetY,
      }

      log.business.debug('🎯 Current drawing state:', {
        isDrawing: currentTools.isDrawing,
        hasCurrentDrawing: !!currentTools.currentDrawing,
        currentDrawingPoints: currentTools.currentDrawing?.points?.length || 0,
      })

      const shouldStartNewDrawing = !currentTools.isDrawing && !currentTools.currentDrawing
      const shouldFinishDrawing = currentTools.isDrawing && currentTools.currentDrawing

      if (shouldStartNewDrawing) {
        log.business.debug('🎯 Starting new drawing with event:', chartEvent)
        currentTools.startDrawing(chartEvent)
      } else if (shouldFinishDrawing) {
        log.business.debug('🎯 Finishing current drawing')
        currentTools.updateDrawing(chartEvent)
        setTimeout(() => {
          const tools = currentTools
          if (tools) {
            tools.finishDrawing()
          }
        }, 10)
      } else {
        log.business.debug('🎯 Unexpected state - resetting drawing')
        currentTools.cancelDrawing()
        setTimeout(() => {
          const tools = currentTools
          if (tools) {
            tools.startDrawing(chartEvent)
          }
        }, 10)
      }
    },
    [config, chartInstance, drawingTools, findClickedTool]
  )

  return { handleChartClick }
}