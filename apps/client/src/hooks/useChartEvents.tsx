import { useCallback, useEffect, useRef } from 'react'
import type { ECElementEvent } from 'echarts/core'
import type useDrawingTools from './useDrawingTools'
import type { useChartInstance } from './useChartInstance'
import { PriceData } from '../utils/indicators'
import { DrawingTool } from '@trading-viewer/shared'
import { log } from '../services/logger'

interface ChartEventHandlers {
  handleChartClick: (params: ECElementEvent) => void
  handleChartMouseMove: (params: ECElementEvent) => void
  handleChartMouseDown: (params: ECElementEvent) => void
  handleChartMouseUp: (params: ECElementEvent) => void
  handleChartRightClick: (params: ECElementEvent) => void
  drawingTools: ReturnType<typeof useDrawingTools> | undefined
}

interface ChartEventsConfig {
  enableDrawingTools: boolean
  onCrosshairMove?: (price: number | null, time: number | null) => void
  onChartClick?: () => void
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

  const handlersRef = useRef<Partial<ChartEventHandlers>>({})
  const lastMouseMoveTime = useRef(0)
  const drawingToolsRef = useRef(drawingTools)
  const currentSelectedToolRef = useRef<string | null>(null) // 選択状態を即座に追跡
  // DOM イベントハンドラー用の状態 ref - クロージャー問題を回避
  const drawingToolsStateRef = useRef<{
    isDrawing: boolean
    isMouseDown: boolean
    isDragging: boolean
    selectedToolId: string | null
  }>({
    isDrawing: false,
    isMouseDown: false,
    isDragging: false,
    selectedToolId: null,
  })
  const MOUSE_MOVE_THROTTLE = 16 // 60fps 相当

  // ref を最新の状態に更新
  useEffect(() => {
    drawingToolsRef.current = drawingTools
    // 選択状態も同期
    if (drawingTools) {
      currentSelectedToolRef.current = drawingTools.selectedToolId
      // DOM イベントハンドラー用の状態も同期
      drawingToolsStateRef.current = {
        isDrawing: drawingTools.isDrawing,
        isMouseDown: drawingTools.isMouseDown,
        isDragging: drawingTools.isDragging,
        selectedToolId: drawingTools.selectedToolId,
      }
    }
  }, [drawingTools])

  // Chart click handler
  const handleChartClick = useCallback(
    (params: ECElementEvent) => {
      log.business.debug('🎯 Chart clicked:', params)

      // Call the onChartClick callback if provided
      config.onChartClick?.()

      // 最新の drawingTools を取得（ref ではなく直接パラメータから）
      const currentTools = drawingTools
      if (!config.enableDrawingTools || !currentTools) {
        return
      }

      const dataPoint = chartInstance.convertPixelToData(
        params.offsetX,
        params.offsetY,
        config.data
      )
      if (dataPoint) {
        // First, find if we clicked on any tool (line)
        const clickedTool = currentTools.getVisibleTools?.()?.find((tool: DrawingTool) => {
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
                  // For horizontal lines, check if click is within tolerance of the price level
                  return Math.abs(params.offsetY - pixel[1]) <= tolerance
                } else if (tool.type === 'vertical') {
                  // For vertical lines, check if click is within tolerance of the time level
                  return Math.abs(params.offsetX - pixel[0]) <= tolerance
                }
              }
              return false
            }

            // Handle Fibonacci Retracement (multiple lines)
            if (tool.type === 'fibonacci') {
              if (tool.points.length < 2) return false

              // Find closest data index instead of exact match
              let startDataIndex = config.data.findIndex(
                d => d.timestamp === tool.points[0].timestamp
              )
              if (startDataIndex === -1) {
                // Find closest timestamp if exact match not found
                let closestIndex = 0
                let minDiff = Math.abs(config.data[0].timestamp - tool.points[0].timestamp)
                for (let i = 1; i < config.data.length; i++) {
                  const diff = Math.abs(config.data[i].timestamp - tool.points[0].timestamp)
                  if (diff < minDiff) {
                    minDiff = diff
                    closestIndex = i
                  }
                }
                startDataIndex = closestIndex
              }
              const startPixel = chart.convertToPixel('grid', [
                startDataIndex,
                tool.points[0].price,
              ])

              if (startPixel && Array.isArray(startPixel)) {
                const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
                const startPrice = tool.points[0].price
                const endPrice = tool.points[1].price
                const priceRange = endPrice - startPrice

                // Check if click is within any fibonacci level line
                for (const level of fibLevels) {
                  const levelPrice = startPrice + priceRange * level
                  const levelPixel = chart.convertToPixel('grid', [startDataIndex, levelPrice])

                  if (levelPixel && Array.isArray(levelPixel)) {
                    // Check if click is within tolerance of this fibonacci level
                    if (Math.abs(params.offsetY - levelPixel[1]) <= tolerance) {
                      // Also check if click is within the horizontal range of fibonacci lines
                      // Find closest data index for end point
                      let endDataIndex = config.data.findIndex(
                        d => d.timestamp === tool.points[1].timestamp
                      )
                      if (endDataIndex === -1) {
                        // Find closest timestamp if exact match not found
                        let closestIndex = 0
                        let minDiff = Math.abs(config.data[0].timestamp - tool.points[1].timestamp)
                        for (let i = 1; i < config.data.length; i++) {
                          const diff = Math.abs(config.data[i].timestamp - tool.points[1].timestamp)
                          if (diff < minDiff) {
                            minDiff = diff
                            closestIndex = i
                          }
                        }
                        endDataIndex = closestIndex
                      }
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

            // Find closest data index using helper function
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

        if (clickedTool) {
          log.business.debug('🎯 Line clicked:', clickedTool.id)
          const wasSelected = currentSelectedToolRef.current === clickedTool.id
          log.business.debug(
            '🎯 Current selectedToolId (ref):',
            currentSelectedToolRef.current,
            'wasSelected:',
            wasSelected
          )

          if (wasSelected) {
            // If already selected, check if click is on handle first
            log.business.debug('🎯 Line was already selected, checking for handle click')

            // Skip handle detection for horizontal/vertical lines as they don't have endpoints
            if (clickedTool.type === 'horizontal' || clickedTool.type === 'vertical') {
              log.business.debug('🎯 Single-point line clicked (no handle detection needed)')
              // For single-point lines, any click on the line is considered a body click
            } else {
              // Handle detection for two-point lines (trendlines, etc.)
              let clickedHandle: { tool: DrawingTool; handleType: 'start' | 'end' } | null = null
              const chart = chartInstance.chartRef.current?.getEchartsInstance()

              if (chart) {
                try {
                  // Find closest data indices for clicked tool
                  const startDataIndex = findClosestDataIndex(clickedTool.points[0].timestamp)
                  const endDataIndex = findClosestDataIndex(clickedTool.points[1].timestamp)

                  const startPixel = chart.convertToPixel('grid', [
                    startDataIndex,
                    clickedTool.points[0].price,
                  ])
                  const endPixel = chart.convertToPixel('grid', [
                    endDataIndex,
                    clickedTool.points[1].price,
                  ])

                  if (
                    startPixel &&
                    endPixel &&
                    Array.isArray(startPixel) &&
                    Array.isArray(endPixel)
                  ) {
                    const handleTolerance = 12 // pixels for handle detection

                    // Check start handle
                    const startDistance = Math.sqrt(
                      Math.pow(params.offsetX - startPixel[0], 2) +
                        Math.pow(params.offsetY - startPixel[1], 2)
                    )
                    if (startDistance <= handleTolerance) {
                      clickedHandle = { tool: clickedTool, handleType: 'start' }
                    } else {
                      // Check end handle
                      const endDistance = Math.sqrt(
                        Math.pow(params.offsetX - endPixel[0], 2) +
                          Math.pow(params.offsetY - endPixel[1], 2)
                      )
                      if (endDistance <= handleTolerance) {
                        clickedHandle = { tool: clickedTool, handleType: 'end' }
                      }
                    }
                  }
                } catch (error: unknown) {
                  log.business.error('🎯 Error checking handle click:', error)
                }
              }

              if (clickedHandle) {
                log.business.debug('🎯 Handle clicked:', clickedHandle.handleType)
                // Don't start drag on click event - wait for actual mousedown
                // This prevents the issue where click events leave isMouseDown state stuck
              } else {
                log.business.debug('🎯 No handle clicked, line body clicked')
                // Don't start drag on click event - wait for actual mousedown
              }
            }
            // Common logic for both single-point and two-point lines
            // Any further actions after selection would go here
          } else {
            // If not selected, select it now
            log.business.debug('🎯 Selecting line for first time')
            currentSelectedToolRef.current = clickedTool.id
            currentTools.selectTool(clickedTool.id)
          }
          return // ツールが選択された場合は、新規描画を開始しない
        } else {
          // ツール以外の場所をクリックしたら選択解除
          if (currentSelectedToolRef.current) {
            log.business.debug('🎯 Deselecting tool')
            currentSelectedToolRef.current = null
            currentTools.selectTool(null)
          }
        }
      }

      if (!currentTools.canDraw) {
        log.business.debug('🎯 Cannot draw - no active tool selected')
        return
      }

      // dataPoint は既に上で取得済みなので、再度チェックするだけ
      if (!dataPoint) {
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

      // 描画状態の判定を改善
      const shouldStartNewDrawing = !currentTools.isDrawing && !currentTools.currentDrawing
      const shouldFinishDrawing = currentTools.isDrawing && currentTools.currentDrawing

      if (shouldStartNewDrawing) {
        log.business.debug('🎯 Starting new drawing with event:', chartEvent)
        currentTools.startDrawing(chartEvent)
      } else if (shouldFinishDrawing) {
        log.business.debug('🎯 Finishing current drawing')
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
        log.business.debug('🎯 Unexpected state - resetting drawing')
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
    [config.enableDrawingTools, config.data, chartInstance, drawingTools]
  )

  // Chart mouse move handler
  const handleChartMouseMove = useCallback(
    (params: ECElementEvent) => {
      // ドラッグ関連の場合はスロットリングを無視
      const currentState = drawingToolsStateRef.current
      const isDragRelated = currentState.isMouseDown || currentState.isDragging

      // スロットリング: ドラッグ関連でない場合のみ制限
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
        isMouseDown: currentState.isMouseDown,
        isDragging: currentState.isDragging,
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

      log.business.debug('🎯 Pixel to data conversion successful:', dataPoint)

      // 描画ツールが有効でない場合のみ crosshair を更新
      if (!config.enableDrawingTools && config.onCrosshairMove) {
        config.onCrosshairMove(dataPoint.price, dataPoint.timestamp)
      }

      // 最新の drawingTools を直接パラメータから取得（ useCallback の依存関係で最新が保証される）
      const currentTools = drawingTools
      log.business.debug('🎯 handleChartMouseMove - currentTools check:', {
        enableDrawingTools: config.enableDrawingTools,
        currentTools: !!currentTools,
        drawingToolsParam: !!drawingTools,
        isMouseDown: currentTools?.isMouseDown,
        isDragging: currentTools?.isDragging,
        dragState: currentTools?.dragState,
      })

      if (!config.enableDrawingTools || !currentTools) {
        log.business.debug('🎯 Returning early - drawing tools not available')
        return
      }

      // Debug mouse move state - ドラッグ関連の状態のみログ出力
      if (currentTools.isMouseDown || currentTools.isDragging) {
        log.business.debug('🎯 Mouse move state check:', {
          isMouseDown: currentTools.isMouseDown,
          isDragging: currentTools.isDragging,
          hasDragState: !!currentTools.dragState,
          dragState: currentTools.dragState,
        })
      }

      // Start drag if mouse is down and moving
      const canStartDrag =
        currentTools.isMouseDown && !currentTools.isDragging && currentTools.dragState

      // 詳細なドラッグ条件ログ - 常に出力
      log.business.debug('🎯 Detailed drag conditions:', {
        isMouseDown: currentTools.isMouseDown,
        isDragging: currentTools.isDragging,
        dragState: currentTools.dragState,
        canStartDrag,
        hasStartDragFunction: !!currentTools.startDrag,
        hasUpdateDragFunction: !!currentTools.updateDrag,
      })

      if (canStartDrag) {
        // ドラッグ開始に最小移動距離の判定を追加
        const dragThreshold = 5 // pixels
        const startPos = currentTools.dragState.startPos
        if (startPos) {
          const distance = Math.sqrt(
            Math.pow(params.offsetX - startPos.x, 2) + Math.pow(params.offsetY - startPos.y, 2)
          )

          log.business.debug('🎯 Drag distance check:', {
            currentPos: { x: params.offsetX, y: params.offsetY },
            startPos,
            distance,
            threshold: dragThreshold,
            shouldStartDrag: distance >= dragThreshold,
          })

          if (distance >= dragThreshold) {
            log.business.debug('🎯 Starting drag from mouse move - threshold exceeded')
            const { toolId, handleType, originalPoints } = currentTools.dragState
            if (currentTools.startDrag) {
              currentTools.startDrag(toolId!, handleType!, startPos, originalPoints)
              log.business.debug('🎯 startDrag called successfully')
            } else {
              log.business.error('🎯 startDrag function not available')
            }
            return // ドラッグ開始したら return
          } else {
            log.business.debug('🎯 Mouse movement below threshold, not starting drag yet')
            return // 閾値以下の場合はドラッグを開始しない
          }
        }
      }

      // Handle drag movement
      if (currentTools.isDragging) {
        log.business.debug('🎯 Mouse move during drag - updating drag position')
        if (currentTools.updateDrag) {
          currentTools.updateDrag(params.offsetX, params.offsetY, chartInstance, config.data)
          log.business.debug('🎯 updateDrag called successfully')
        } else {
          log.business.error('🎯 updateDrag function not available')
        }
        return
      }

      // Handle drawing tools mouse move - use ref for latest state
      if (!currentTools.isDrawing) {
        // Don't log every time to avoid spam
        return
      }

      log.business.debug('🎯 Mouse move during drawing - calling updateDrawing')

      const chartEvent = {
        timestamp: dataPoint.timestamp,
        price: dataPoint.price,
        x: params.offsetX,
        y: params.offsetY,
      }

      currentTools.updateDrawing(chartEvent)
    },
    [config.enableDrawingTools, config.data, config.onCrosshairMove, chartInstance, drawingTools]
  )

  // Chart mouse down handler - for starting drag operations
  const handleChartMouseDown = useCallback(
    (params: ECElementEvent) => {
      const currentTools = drawingTools
      if (!config.enableDrawingTools || !currentTools) {
        return
      }

      log.business.debug('🎯 handleChartMouseDown called:', params)

      // If a tool is selected, check if we're clicking on a handle or line
      if (currentTools.selectedToolId) {
        const selectedTool = currentTools.getTool(currentTools.selectedToolId)
        if (!selectedTool || !selectedTool.points || selectedTool.points.length < 1) {
          return
        }

        const chart = chartInstance.chartRef.current?.getEchartsInstance()
        if (!chart) return

        try {
          // Handle horizontal and vertical lines (single point)
          if (selectedTool.type === 'horizontal' || selectedTool.type === 'vertical') {
            if (selectedTool.points.length < 1) return

            const dataIndex = findClosestDataIndex(selectedTool.points[0].timestamp)
            const pixel = chart.convertToPixel('grid', [dataIndex, selectedTool.points[0].price])

            if (pixel && Array.isArray(pixel)) {
              const tolerance = 10 // pixels
              let shouldStartDrag = false

              if (selectedTool.type === 'horizontal') {
                // For horizontal lines, check if click is within tolerance of the price level
                shouldStartDrag = Math.abs(params.offsetY - pixel[1]) <= tolerance
              } else if (selectedTool.type === 'vertical') {
                // For vertical lines, check if click is within tolerance of the time level
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
            return
          }

          // Handle Fibonacci Retracement (same as two-point tools but with multiple lines)
          if (selectedTool.type === 'fibonacci') {
            if (selectedTool.points.length < 2) return

            // Find closest data indices for selected tool
            let startDataIndex = config.data.findIndex(
              d => d.timestamp === selectedTool.points[0].timestamp
            )
            if (startDataIndex === -1) {
              let closestIndex = 0
              let minDiff = Math.abs(config.data[0].timestamp - selectedTool.points[0].timestamp)
              for (let i = 1; i < config.data.length; i++) {
                const diff = Math.abs(config.data[i].timestamp - selectedTool.points[0].timestamp)
                if (diff < minDiff) {
                  minDiff = diff
                  closestIndex = i
                }
              }
              startDataIndex = closestIndex
            }

            let endDataIndex = config.data.findIndex(
              d => d.timestamp === selectedTool.points[1].timestamp
            )
            if (endDataIndex === -1) {
              let closestIndex = 0
              let minDiff = Math.abs(config.data[0].timestamp - selectedTool.points[1].timestamp)
              for (let i = 1; i < config.data.length; i++) {
                const diff = Math.abs(config.data[i].timestamp - selectedTool.points[1].timestamp)
                if (diff < minDiff) {
                  minDiff = diff
                  closestIndex = i
                }
              }
              endDataIndex = closestIndex
            }

            const startPixel = chart.convertToPixel('grid', [
              startDataIndex,
              selectedTool.points[0].price,
            ])
            const endPixel = chart.convertToPixel('grid', [
              endDataIndex,
              selectedTool.points[1].price,
            ])

            if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
              const handleTolerance = 12 // pixels for handle detection

              // Check start handle
              const startDistance = Math.sqrt(
                Math.pow(params.offsetX - startPixel[0], 2) +
                  Math.pow(params.offsetY - startPixel[1], 2)
              )
              if (startDistance <= handleTolerance) {
                log.business.debug('🎯 MouseDown on fibonacci start handle')
                currentTools.mouseDown(
                  selectedTool.id,
                  'start',
                  { x: params.offsetX, y: params.offsetY },
                  selectedTool.points
                )
                return
              }

              // Check end handle
              const endDistance = Math.sqrt(
                Math.pow(params.offsetX - endPixel[0], 2) +
                  Math.pow(params.offsetY - endPixel[1], 2)
              )
              if (endDistance <= handleTolerance) {
                log.business.debug('🎯 MouseDown on fibonacci end handle')
                currentTools.mouseDown(
                  selectedTool.id,
                  'end',
                  { x: params.offsetX, y: params.offsetY },
                  selectedTool.points
                )
                return
              }

              // Check if clicking on any fibonacci level line for line body drag
              const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
              const startPrice = selectedTool.points[0].price
              const endPrice = selectedTool.points[1].price
              const priceRange = endPrice - startPrice

              for (const level of fibLevels) {
                const levelPrice = startPrice + priceRange * level
                const levelPixel = chart.convertToPixel('grid', [startDataIndex, levelPrice])

                if (levelPixel && Array.isArray(levelPixel)) {
                  const tolerance = 10 // pixels
                  if (Math.abs(params.offsetY - levelPixel[1]) <= tolerance) {
                    // Check if click is within horizontal range
                    const lineStartX = Math.min(startPixel[0], endPixel[0])
                    const lineEndX =
                      Math.max(startPixel[0], endPixel[0]) +
                      Math.abs(startPixel[0] - endPixel[0]) * 0.2

                    if (params.offsetX >= lineStartX && params.offsetX <= lineEndX) {
                      log.business.debug('🎯 MouseDown on fibonacci line body')
                      currentTools.mouseDown(
                        selectedTool.id,
                        'line',
                        { x: params.offsetX, y: params.offsetY },
                        selectedTool.points
                      )
                      return
                    }
                  }
                }
              }
            }
            return
          }

          // Handle two-point lines (trendlines, etc.)
          if (selectedTool.points.length < 2) {
            return
          }

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
            const handleTolerance = 12 // pixels for handle detection

            // Check start handle
            const startDistance = Math.sqrt(
              Math.pow(params.offsetX - startPixel[0], 2) +
                Math.pow(params.offsetY - startPixel[1], 2)
            )
            if (startDistance <= handleTolerance) {
              log.business.debug('🎯 MouseDown on start handle')
              currentTools.mouseDown(
                selectedTool.id,
                'start',
                { x: params.offsetX, y: params.offsetY },
                selectedTool.points
              )
              return
            }

            // Check end handle
            const endDistance = Math.sqrt(
              Math.pow(params.offsetX - endPixel[0], 2) + Math.pow(params.offsetY - endPixel[1], 2)
            )
            if (endDistance <= handleTolerance) {
              log.business.debug('🎯 MouseDown on end handle')
              currentTools.mouseDown(
                selectedTool.id,
                'end',
                { x: params.offsetX, y: params.offsetY },
                selectedTool.points
              )
              return
            }

            // Check if clicking on line itself
            const tolerance = 10 // pixels
            const distance = distanceFromPointToLine(
              params.offsetX,
              params.offsetY,
              startPixel[0],
              startPixel[1],
              endPixel[0],
              endPixel[1]
            )
            if (distance <= tolerance) {
              log.business.debug('🎯 MouseDown on line body')
              currentTools.mouseDown(
                selectedTool.id,
                'line',
                { x: params.offsetX, y: params.offsetY },
                selectedTool.points
              )
            }
          }
        } catch (error: unknown) {
          log.business.error('🎯 Error in handleChartMouseDown:', error)
        }
      }
    },
    [config.enableDrawingTools, config.data, chartInstance, drawingTools]
  )

  // Chart mouse up handler
  const handleChartMouseUp = useCallback(
    (params: ECElementEvent) => {
      const currentTools = drawingTools
      if (!config.enableDrawingTools || !currentTools) {
        return
      }

      // Handle drag end
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

      // Handle mouse up when in mouseDown state but not dragging (simple click)
      if (currentTools.isMouseDown && !currentTools.isDragging) {
        log.business.debug('🎯 Mouse up without drag - resetting mouse down state')
        // Reset mouse down state for simple clicks that didn't turn into drags
        if (currentTools.endDrag) {
          // Use a dummy event to reset the state
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
        return
      }

      // Handle any mouse up logic for drawing tools
      if (currentTools.isDrawing) {
        // Could be used for complex drawing tools that need mouse up events
      }
    },
    [config.enableDrawingTools, config.data, chartInstance, drawingTools]
  )

  // Chart right click handler for context menu
  const handleChartRightClick = useCallback(
    (params: ECElementEvent) => {
      log.business.debug('🎯 Chart right clicked:', params)

      const currentTools = drawingTools
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

      // Find if clicking on a drawing tool
      const clickedTool = currentTools.getVisibleTools?.()?.find((tool: DrawingTool) => {
        if (!tool.points || tool.points.length < 1) {
          return false
        }

        // Check if click is near the line (simple distance check)
        const tolerance = 10 // pixels
        const chart = chartInstance.chartRef.current?.getEchartsInstance()
        if (!chart) return false

        try {
          // Handle horizontal and vertical lines (single point)
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
          // Handle fibonacci retracement (check all level lines)
          else if (tool.type === 'fibonacci' && tool.points.length >= 2) {
            // Find closest data index using helper function
            const startDataIndex = findClosestDataIndex(tool.points[0].timestamp)
            const endDataIndex = findClosestDataIndex(tool.points[1].timestamp)
            const startPixel = chart.convertToPixel('grid', [startDataIndex, tool.points[0].price])
            const endPixel = chart.convertToPixel('grid', [endDataIndex, tool.points[1].price])

            if (startPixel && endPixel && Array.isArray(startPixel) && Array.isArray(endPixel)) {
              // Fibonacci levels
              const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
              const startPrice = tool.points[0].price
              const endPrice = tool.points[1].price
              const priceRange = endPrice - startPrice

              // Check if click is within any fibonacci level line
              for (const level of fibLevels) {
                const levelPrice = startPrice + priceRange * level
                const levelPixel = chart.convertToPixel('grid', [startDataIndex, levelPrice])

                if (levelPixel && Array.isArray(levelPixel)) {
                  // Check if click is within tolerance of this fibonacci level
                  if (Math.abs(params.offsetY - levelPixel[1]) <= tolerance) {
                    // Also check if click is within the horizontal range of fibonacci lines
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
          // Handle other two-point lines (trendlines)
          else if (tool.points.length >= 2) {
            // Find closest data index using helper function
            const startDataIndex = findClosestDataIndex(tool.points[0].timestamp)
            const endDataIndex = findClosestDataIndex(tool.points[1].timestamp)

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
          }
        } catch (error: unknown) {
          log.business.error('🎯 Error checking drawing tool click:', error)
        }
        return false
      })

      if (clickedTool) {
        log.business.debug('🎯 Right-clicked on drawing tool:', clickedTool.id)

        // Reset drag state and selection highlighting before showing context menu
        if (currentTools.isDragging || currentTools.isMouseDown) {
          log.business.debug('🎯 Resetting drag state on right-click')
          // Reset drag and mouse down states
          if (currentTools.endDrag) {
            const dataPoint = chartInstance.convertPixelToData(
              params.offsetX,
              params.offsetY,
              config.data
            )
            if (dataPoint) {
              const resetEvent = {
                timestamp: dataPoint.timestamp,
                price: dataPoint.price,
                x: params.offsetX,
                y: params.offsetY,
              }
              currentTools.endDrag(resetEvent, null)
            }
          }
        }

        // Deselect any currently selected tool to remove highlighting
        if (currentTools.selectedToolId) {
          log.business.debug(
            '🎯 Deselecting tool before showing context menu:',
            currentTools.selectedToolId
          )
          currentTools.selectTool(null)
        }

        // Show context menu for the drawing tool
        currentTools.showContextMenu?.(clickedTool.id, params.offsetX, params.offsetY)
      }
    },
    [config.enableDrawingTools, config.data, chartInstance, drawingTools]
  )

  // Helper function to calculate distance from point to line
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

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = {
      handleChartClick,
      handleChartMouseMove,
      handleChartMouseDown,
      handleChartMouseUp,
      handleChartRightClick,
      drawingTools, // 最新の drawingTools も保存
    }
    log.business.debug('🎯 Handlers ref updated')
  }, [
    handleChartClick,
    handleChartMouseMove,
    handleChartMouseDown,
    handleChartMouseUp,
    handleChartRightClick,
    drawingTools,
  ])

  // DOM イベントリスナーの管理
  useEffect(() => {
    if (!chartInstance.chartReady || !chartInstance.chartRef.current) return

    const chartEchartsInstance = chartInstance.getEChartsInstance()
    if (!chartEchartsInstance) return

    const chartDom = chartEchartsInstance.getDom()
    if (!chartDom) return

    // イベントリスナーを追加
    const clickHandler = (event: MouseEvent) => {
      log.business.debug('🎯 DOM click event fired!')

      if (!config.enableDrawingTools) return

      const params = {
        offsetX: event.offsetX,
        offsetY: event.offsetY,
        event: event,
        domClick: true,
      }

      log.business.debug('🎯 DOM click params:', params)
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
      }

      handlersRef.current.handleChartMouseDown?.(params)
    }

    const mouseMoveHandler = (event: MouseEvent) => {
      // DOM イベントハンドラー用の状態 ref から取得 - クロージャー問題を回避
      const currentState = drawingToolsStateRef.current

      // ドラッグ関連のイベントのみスロットリングを無視してログ出力
      const isDragRelated = currentState.isMouseDown || currentState.isDragging

      if (isDragRelated) {
        log.business.debug('🎯 DOM mouse move (drag-related) event fired!', {
          offsetX: event.offsetX,
          offsetY: event.offsetY,
          enableDrawingTools: config.enableDrawingTools,
          isDrawing: currentState.isDrawing,
          isMouseDown: currentState.isMouseDown,
          isDragging: currentState.isDragging,
          conditionMet:
            config.enableDrawingTools &&
            (currentState.isDrawing || currentState.isMouseDown || currentState.isDragging),
          throttleTime: Date.now() - lastMouseMoveTime.current,
        })
      }

      // スロットリング: 60fps 相当（16ms 間隔）で制限
      const now = Date.now()
      if (now - lastMouseMoveTime.current < MOUSE_MOVE_THROTTLE) {
        if (isDragRelated) {
          log.business.debug('🎯 DOM mouse move throttled, but processing for drag')
        } else {
          return
        }
      }
      lastMouseMoveTime.current = now

      // 描画ツールが有効で、描画中またはマウスダウン中またはドラッグ中の場合処理
      if (
        config.enableDrawingTools &&
        (currentState.isDrawing || currentState.isMouseDown || currentState.isDragging)
      ) {
        log.business.debug('🎯 DOM mouse move - calling handleChartMouseMove')
        const params = {
          offsetX: event.offsetX,
          offsetY: event.offsetY,
          event: event,
          domMove: true,
        }

        try {
          if (handlersRef.current.handleChartMouseMove) {
            log.business.debug('🎯 About to call handleChartMouseMove with params:', params)
            handlersRef.current.handleChartMouseMove(params)
            log.business.debug('🎯 handleChartMouseMove called successfully')
          } else {
            log.business.error('🎯 handleChartMouseMove is undefined in handlersRef')
          }
        } catch (error: unknown) {
          log.business.error('🎯 Error calling handleChartMouseMove:', error)
        }
      } else {
        if (isDragRelated) {
          log.business.debug(
            '🎯 DOM mouse move - condition not met despite drag state, not calling handleChartMouseMove'
          )
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
      }

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
      }

      log.business.debug('🎯 DOM right click params:', params)
      handlersRef.current.handleChartRightClick?.(params)
    }

    chartDom.addEventListener('click', clickHandler)
    chartDom.addEventListener('mousedown', mouseDownHandler)
    chartDom.addEventListener('mousemove', mouseMoveHandler)
    chartDom.addEventListener('mouseup', mouseUpHandler)
    chartDom.addEventListener('contextmenu', rightClickHandler)
    log.business.debug('🎯 DOM event listeners added')

    // クリーンアップ
    return () => {
      chartDom.removeEventListener('click', clickHandler)
      chartDom.removeEventListener('mousedown', mouseDownHandler)
      chartDom.removeEventListener('mousemove', mouseMoveHandler)
      chartDom.removeEventListener('mouseup', mouseUpHandler)
      chartDom.removeEventListener('contextmenu', rightClickHandler)
      log.business.debug('🎯 DOM event listeners removed')
    }
  }, [chartInstance.chartReady, config.enableDrawingTools, drawingTools])

  return {
    handleChartClick,
    handleChartMouseMove,
    handleChartMouseDown,
    handleChartMouseUp,
    handleChartRightClick,
  }
}

export default useChartEvents
