import { useCallback } from 'react'
import { ECElementEvent } from 'echarts'
import { log } from '@/services/logger'
import type { ChartEventsConfig } from './types'
import type { DrawingTool } from '@shared/types/chart'

type UseChartRightClickProps = {
  config: ChartEventsConfig
  chartInstance: any
  drawingTools: any
  findClosestDataIndex: (timestamp: number) => number
}

export const useChartRightClick = ({ 
  config, 
  chartInstance, 
  drawingTools, 
  findClosestDataIndex 
}: UseChartRightClickProps) => {
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

  const findRightClickedTool = useCallback((params: ECElementEvent, tools: any[]): DrawingTool | null => {
    return tools.find((tool: DrawingTool) => {
      if (!tool.points || tool.points.length < 1) {
        return false
      }

      const tolerance = 10 // pixels
      const chart = chartInstance.chartRef.current?.getEchartsInstance()
      if (!chart) return false

      try {
        // Handle horizontal and vertical lines
        if (tool.type === 'horizontal' || tool.type === 'vertical') {
          if (tool.points.length < 1) return false
          const dataIndex = findClosestDataIndex(tool.points[0].timestamp)
          const pixel = chart.convertToPixel('grid', [dataIndex, tool.points[0].price])
          if (pixel && Array.isArray(pixel)) {
            if (tool.type === 'horizontal') {
              return Math.abs(params.offsetY - pixel[1]) <= tolerance
            } else if (tool.type === 'vertical') {
              return Math.abs(params.offsetX - pixel[0]) <= tolerance
            }
          }
        }
        // Handle fibonacci retracement
        else if (tool.type === 'fibonacci' && tool.points.length >= 2) {
          const startDataIndex = findClosestDataIndex(tool.points[0].timestamp)
          const endDataIndex = findClosestDataIndex(tool.points[1].timestamp)
          const startPixel = chart.convertToPixel('grid', [startDataIndex, tool.points[0].price])
          const endPixel = chart.convertToPixel('grid', [endDataIndex, tool.points[1].price])

          if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
            const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
            const startPrice = tool.points[0].price
            const endPrice = tool.points[1].price
            const priceRange = endPrice - startPrice

            for (const level of fibLevels) {
              const levelPrice = startPrice + priceRange * level
              const levelPixel = chart.convertToPixel('grid', [startDataIndex, levelPrice])

              if (levelPixel && Array.isArray(levelPixel)) {
                if (Math.abs(params.offsetY - levelPixel[1]) <= tolerance) {
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
        // Handle other two-point lines
        else if (tool.points.length >= 2) {
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
        }
      } catch (error: unknown) {
        log.business.error('🎯 Error checking drawing tool right click:', error)
      }
      return false
    })
  }, [chartInstance, findClosestDataIndex, distanceFromPointToLine])

  const handleChartRightClick = useCallback(
    (params: ECElementEvent) => {
      log.business.debug('🎯 Chart right clicked:', params)

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

      // Find if right-clicking on a drawing tool
      const clickedTool = findRightClickedTool(params, currentTools.getVisibleTools?.() || [])

      if (clickedTool) {
        log.business.debug('🎯 Right-clicked on drawing tool:', clickedTool.id)

        // Reset drag state before showing context menu
        if (currentTools.isDragging || currentTools.isMouseDown) {
          log.business.debug('🎯 Resetting drag state on right-click')
          if (currentTools.endDrag) {
            const resetEvent = {
              timestamp: dataPoint.timestamp,
              price: dataPoint.price,
              x: params.offsetX,
              y: params.offsetY,
            }
            currentTools.endDrag(resetEvent, null)
          }
        }

        // Deselect any currently selected tool
        if (currentTools.selectedToolId) {
          log.business.debug(
            '🎯 Deselecting tool before showing context menu:',
            currentTools.selectedToolId
          )
          currentTools.selectTool(null)
        }

        // Show context menu
        currentTools.showContextMenu?.(clickedTool.id, params.offsetX, params.offsetY)
      }
    },
    [config, chartInstance, drawingTools, findRightClickedTool]
  )

  return { handleChartRightClick }
}