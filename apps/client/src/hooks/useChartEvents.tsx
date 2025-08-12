import { useCallback, useEffect, useRef } from 'react'
import type useDrawingTools from './useDrawingTools'
import type { useChartInstance } from './useChartInstance'
import { PriceData } from '../utils/indicators'

interface ChartEventsConfig {
  enableDrawingTools: boolean
  onCrosshairMove?: (price: number | null, time: number | null) => void
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
  const handlersRef = useRef<any>({})
  const lastMouseMoveTime = useRef(0)
  const drawingToolsRef = useRef(drawingTools)
  const MOUSE_MOVE_THROTTLE = 16 // 60fps 相当

  // ref を最新の状態に更新
  useEffect(() => {
    drawingToolsRef.current = drawingTools
  }, [drawingTools])

  // Chart click handler
  const handleChartClick = useCallback(
    (params: any) => {
      console.log('🎯 Chart clicked:', params)

      const currentTools = drawingToolsRef.current
      if (!config.enableDrawingTools || !currentTools) {
        return
      }

      if (!currentTools.canDraw) {
        console.log('🎯 Cannot draw - no active tool selected')
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

      const chartEvent = {
        timestamp: dataPoint.timestamp,
        price: dataPoint.price,
        x: params.offsetX,
        y: params.offsetY,
      }

      console.log('🎯 Current drawing state:', {
        isDrawing: currentTools.isDrawing,
        hasCurrentDrawing: !!currentTools.currentDrawing,
        currentDrawingPoints: currentTools.currentDrawing?.points?.length || 0,
      })

      // 描画状態の判定を改善
      const shouldStartNewDrawing = !currentTools.isDrawing && !currentTools.currentDrawing
      const shouldFinishDrawing = currentTools.isDrawing && currentTools.currentDrawing

      if (shouldStartNewDrawing) {
        console.log('🎯 Starting new drawing with event:', chartEvent)
        currentTools.startDrawing(chartEvent)
      } else if (shouldFinishDrawing) {
        console.log('🎯 Finishing current drawing')
        // 2 つ目の点を更新してから終了
        currentTools.updateDrawing(chartEvent)
        // 少し遅延を入れて状態を安定させる
        setTimeout(() => {
          const tools = drawingToolsRef.current
          if (tools) {
            tools.finishDrawing()
          }
        }, 10)
      } else {
        console.log('🎯 Unexpected state - resetting drawing')
        currentTools.cancelDrawing()
        // 状態をリセットした後、新しい描画を開始
        setTimeout(() => {
          const tools = drawingToolsRef.current
          if (tools) {
            tools.startDrawing(chartEvent)
          }
        }, 10)
      }
    },
    [config.enableDrawingTools, config.data, chartInstance]
  )

  // Chart mouse move handler
  const handleChartMouseMove = useCallback(
    (params: any) => {
      // スロットリング: 60fps 相当（16ms 間隔）で制限
      const now = Date.now()
      if (now - lastMouseMoveTime.current < MOUSE_MOVE_THROTTLE) {
        return
      }
      lastMouseMoveTime.current = now

      const dataPoint = chartInstance.convertPixelToData(
        params.offsetX,
        params.offsetY,
        config.data
      )
      if (!dataPoint) {
        console.log('🎯 Mouse move - failed to convert pixel to data')
        return
      }

      // 描画ツールが有効でない場合のみ crosshair を更新
      if (!config.enableDrawingTools && config.onCrosshairMove) {
        config.onCrosshairMove(dataPoint.price, dataPoint.timestamp)
      }

      // Handle drawing tools mouse move - use ref for latest state
      const currentTools = drawingToolsRef.current
      if (!config.enableDrawingTools || !currentTools || !currentTools.isDrawing) {
        // Don't log every time to avoid spam
        return
      }

      console.log('🎯 Mouse move during drawing - calling updateDrawing')

      const chartEvent = {
        timestamp: dataPoint.timestamp,
        price: dataPoint.price,
        x: params.offsetX,
        y: params.offsetY,
      }

      currentTools.updateDrawing(chartEvent)
    },
    [config.enableDrawingTools, config.data, config.onCrosshairMove, chartInstance]
  )

  // Chart mouse up handler
  const handleChartMouseUp = useCallback(() => {
    // Handle any mouse up logic for drawing tools
    if (config.enableDrawingTools && drawingTools && drawingTools.isDrawing) {
      // Could be used for complex drawing tools that need mouse up events
    }
  }, [config.enableDrawingTools, drawingTools])

  // Chart right click handler for context menu
  const handleChartRightClick = useCallback(
    (params: any) => {
      console.log('🎯 Chart right clicked:', params)

      const currentTools = drawingToolsRef.current
      if (!config.enableDrawingTools || !currentTools) {
        return
      }

      // Check if right-click is on a trendline
      const dataPoint = chartInstance.convertPixelToData(
        params.offsetX,
        params.offsetY,
        config.data
      )
      if (!dataPoint) {
        return
      }

      // Find if clicking on a trendline
      const clickedTool = currentTools.visibleTools?.find((tool: any) => {
        if (tool.type !== 'trendline' || !tool.points || tool.points.length < 2) {
          return false
        }

        // Check if click is near the line (simple distance check)
        const tolerance = 10 // pixels
        const chart = chartInstance.chartRef.current?.getEchartsInstance()
        if (!chart) return false

        try {
          const startDataIndex = config.data.findIndex(d => d.timestamp === tool.points[0].timestamp)
          const endDataIndex = config.data.findIndex(d => d.timestamp === tool.points[1].timestamp)

          const startPixel = chart.convertToPixel('grid', [startDataIndex, tool.points[0].price])
          const endPixel = chart.convertToPixel('grid', [endDataIndex, tool.points[1].price])

          if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
            // Calculate distance from point to line
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
        } catch (error) {
          console.error('🎯 Error checking trendline click:', error)
        }
        return false
      })

      if (clickedTool) {
        console.log('🎯 Right-clicked on trendline:', clickedTool.id)
        // Show context menu for the trendline
        currentTools.showContextMenu?.(clickedTool.id, params.offsetX, params.offsetY)
      }
    },
    [config.enableDrawingTools, config.data, chartInstance]
  )

  // Helper function to calculate distance from point to line
  const distanceFromPointToLine = (
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
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

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = {
      handleChartClick,
      handleChartMouseMove,
      handleChartMouseUp,
      handleChartRightClick,
    }
    console.log('🎯 Handlers ref updated')
  }, [handleChartClick, handleChartMouseMove, handleChartMouseUp, handleChartRightClick])

  // DOM イベントリスナーの管理
  useEffect(() => {
    if (!chartInstance.chartReady || !chartInstance.chartRef.current) return

    const chartEchartsInstance = chartInstance.getEChartsInstance()
    if (!chartEchartsInstance) return

    const chartDom = chartEchartsInstance.getDom()
    if (!chartDom) return

    // イベントリスナーを追加
    const clickHandler = (event: MouseEvent) => {
      console.log('🎯 DOM click event fired!')

      if (!config.enableDrawingTools) return

      const params = {
        offsetX: event.offsetX,
        offsetY: event.offsetY,
        event: event,
        domClick: true,
      }

      console.log('🎯 DOM click params:', params)
      handlersRef.current.handleChartClick?.(params)
    }

    const mouseMoveHandler = (event: MouseEvent) => {
      // スロットリング: 60fps 相当（16ms 間隔）で制限
      const now = Date.now()
      if (now - lastMouseMoveTime.current < MOUSE_MOVE_THROTTLE) {
        return
      }
      lastMouseMoveTime.current = now

      // 描画中の場合のみログ出力
      if (drawingToolsRef.current?.isDrawing) {
        console.log('🎯 DOM mouse move event fired!', {
          offsetX: event.offsetX,
          offsetY: event.offsetY,
          isDrawing: drawingToolsRef.current.isDrawing,
          hasCurrentDrawing: !!drawingToolsRef.current.currentDrawing,
        })
      }

      // 描画ツールが有効で描画中の場合のみ処理
      if (config.enableDrawingTools && drawingToolsRef.current?.isDrawing) {
        const params = {
          offsetX: event.offsetX,
          offsetY: event.offsetY,
          event: event,
          domMove: true,
        }

        handlersRef.current.handleChartMouseMove?.(params)
      }
    }

    const rightClickHandler = (event: MouseEvent) => {
      console.log('🎯 DOM right click event fired!')
      event.preventDefault() // Prevent browser context menu

      if (!config.enableDrawingTools) return

      const params = {
        offsetX: event.offsetX,
        offsetY: event.offsetY,
        event: event,
        domRightClick: true,
      }

      console.log('🎯 DOM right click params:', params)
      handlersRef.current.handleChartRightClick?.(params)
    }

    chartDom.addEventListener('click', clickHandler)
    chartDom.addEventListener('mousemove', mouseMoveHandler)
    chartDom.addEventListener('contextmenu', rightClickHandler)
    console.log('🎯 DOM event listeners added')

    // クリーンアップ
    return () => {
      chartDom.removeEventListener('click', clickHandler)
      chartDom.removeEventListener('mousemove', mouseMoveHandler)
      chartDom.removeEventListener('contextmenu', rightClickHandler)
      console.log('🎯 DOM event listeners removed')
    }
  }, [chartInstance.chartReady, config.enableDrawingTools])

  return {
    handleChartClick,
    handleChartMouseMove,
    handleChartMouseUp,
    handleChartRightClick,
  }
}

export default useChartEvents
