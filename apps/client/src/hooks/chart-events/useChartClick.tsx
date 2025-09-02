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
  findClosestDataIndex,
}: UseChartClickProps) => {
  const distanceFromPointToLine = useCallback(
    (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
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
    },
    []
  )

  const findClickedTool = useCallback(
    (params: ECElementEvent, tools: any[]): DrawingTool | null => {
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
            log.business.debug('🎯 Finding tool selection - single point', {
              toolType: tool.type,
              toolId: tool.id,
              timestamp: tool.points[0].timestamp,
              dataIndex,
              price: tool.points[0].price,
            })

            // dataIndex should never be -1 now, but keep safety check
            if (dataIndex < 0) {
              log.business.warn('🎯 Invalid data index for tool selection', {
                toolType: tool.type,
                toolId: tool.id,
                timestamp: tool.points[0].timestamp,
                dataIndex,
              })
              return false
            }

            const pixel = chart.convertToPixel('grid', [dataIndex, tool.points[0].price])
            log.business.debug('🎯 Pixel conversion result', {
              toolType: tool.type,
              pixel,
              clickPosition: { x: params.offsetX, y: params.offsetY },
            })

            if (pixel && Array.isArray(pixel)) {
              if (tool.type === 'horizontal') {
                const distance = Math.abs(params.offsetY - pixel[1])
                const isHit = distance <= tolerance
                log.business.debug('🎯 Horizontal line hit test', {
                  distance,
                  tolerance,
                  isHit,
                  pixelY: pixel[1],
                  clickY: params.offsetY,
                })
                return isHit
              } else if (tool.type === 'vertical') {
                const distance = Math.abs(params.offsetX - pixel[0])
                const isHit = distance <= tolerance
                log.business.debug('🎯 Vertical line hit test', {
                  distance,
                  tolerance,
                  isHit,
                  pixelX: pixel[0],
                  clickX: params.offsetX,
                })
                return isHit
              }
            }
            return false
          }

          // Handle Fibonacci Retracement
          if (tool.type === 'fibonacci') {
            if (tool.points.length < 2) return false

            const startDataIndex = findClosestDataIndex(tool.points[0].timestamp)
            const endDataIndex = findClosestDataIndex(tool.points[1].timestamp)

            const startPixel = chart.convertToPixel('grid', [startDataIndex, tool.points[0].price])
            const endPixel = chart.convertToPixel('grid', [endDataIndex, tool.points[1].price])

            if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
              // Define the fibonacci area bounds
              const leftX = Math.min(startPixel[0], endPixel[0])
              const rightX = Math.max(startPixel[0], endPixel[0])
              const topY = Math.min(startPixel[1], endPixel[1])
              const bottomY = Math.max(startPixel[1], endPixel[1])

              // Extend the selectable area slightly beyond the fibonacci range
              const extendX = Math.abs(rightX - leftX) * 0.1 // 10% extension
              const extendY = Math.abs(bottomY - topY) * 0.1 // 10% extension

              const expandedLeftX = leftX - extendX
              const expandedRightX = rightX + extendX
              const expandedTopY = topY - extendY
              const expandedBottomY = bottomY + extendY

              // Check if click is within the fibonacci area
              if (
                params.offsetX >= expandedLeftX &&
                params.offsetX <= expandedRightX &&
                params.offsetY >= expandedTopY &&
                params.offsetY <= expandedBottomY
              ) {
                return true
              }

              // Also check individual fibonacci levels for more precise selection
              const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
              const startPrice = tool.points[0].price
              const endPrice = tool.points[1].price
              const priceRange = endPrice - startPrice

              for (const level of fibLevels) {
                const levelPrice = startPrice + priceRange * level
                const levelPixel = chart.convertToPixel('grid', [startDataIndex, levelPrice])

                if (levelPixel && Array.isArray(levelPixel)) {
                  if (Math.abs(params.offsetY - levelPixel[1]) <= tolerance) {
                    // Extend fibonacci level lines beyond the price range
                    const levelLineStartX = leftX - extendX
                    const levelLineEndX = rightX + extendX

                    if (params.offsetX >= levelLineStartX && params.offsetX <= levelLineEndX) {
                      return true
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

          log.business.debug('🎯 Finding tool selection - two point line', {
            toolType: tool.type,
            toolId: tool.id,
            startTimestamp: tool.points[0].timestamp,
            endTimestamp: tool.points[1].timestamp,
            startDataIndex,
            endDataIndex,
          })

          if (startDataIndex < 0 || endDataIndex < 0) {
            log.business.warn('🎯 Invalid data index for two-point tool selection', {
              toolType: tool.type,
              toolId: tool.id,
              startDataIndex,
              endDataIndex,
            })
            return false
          }

          const startPixel = chart.convertToPixel('grid', [startDataIndex, tool.points[0].price])
          const endPixel = chart.convertToPixel('grid', [endDataIndex, tool.points[1].price])

          log.business.debug('🎯 Two-point pixel conversion result', {
            toolType: tool.type,
            startPixel,
            endPixel,
            clickPosition: { x: params.offsetX, y: params.offsetY },
          })

          if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
            const distance = distanceFromPointToLine(
              params.offsetX,
              params.offsetY,
              startPixel[0],
              startPixel[1],
              endPixel[0],
              endPixel[1]
            )
            const isHit = distance <= tolerance
            log.business.debug('🎯 Two-point line hit test', {
              distance,
              tolerance,
              isHit,
            })
            return isHit
          }
        } catch (error: unknown) {
          log.business.error('🎯 Error checking tool click:', error)
        }
        return false
      })
    },
    [chartInstance, findClosestDataIndex, distanceFromPointToLine]
  )

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
      const availableTools = currentTools.getVisibleTools?.() || []
      log.business.debug('🎯 Searching for clicked tool', {
        availableToolsCount: availableTools.length,
        clickPosition: { x: params.offsetX, y: params.offsetY },
        currentlySelected: currentTools.selectedToolId,
      })

      const clickedTool = findClickedTool(params, availableTools)

      log.business.debug('🎯 Tool search result', {
        clickedToolId: clickedTool?.id,
        clickedToolType: clickedTool?.type,
      })

      if (clickedTool) {
        const wasSelected = currentTools.selectedToolId === clickedTool.id

        if (wasSelected) {
          // Handle already selected tool interaction
          log.business.debug('🎯 Line was already selected', { toolId: clickedTool.id })
        } else {
          // Select the tool
          log.business.info('🎯 Selecting tool for first time', {
            toolId: clickedTool.id,
            toolType: clickedTool.type,
          })
          currentTools.selectTool(clickedTool.id)
        }
        return
      } else {
        log.business.debug('🎯 No tool found at click position')
        // Deselect if clicking elsewhere
        if (currentTools.selectedToolId) {
          log.business.debug('🎯 Deselecting tool', {
            previouslySelected: currentTools.selectedToolId,
          })
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
