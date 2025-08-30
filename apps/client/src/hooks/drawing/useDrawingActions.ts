import { useCallback, useRef, useEffect } from 'react'
import type {
  DrawingTool,
  DrawingToolType,
  DrawingMode,
  DrawingPoint,
} from '@trading-viewer/shared'
import type { ECharts } from 'echarts'
import type { PriceData } from '../../utils/indicators'
import type { DrawingAction, DrawingState } from './useDrawingState'

export interface ChartMouseEvent {
  timestamp: number
  price: number
}

/**
 * Hook for drawing tool actions and operations
 * Handles user interactions and tool operations
 */
export const useDrawingActions = (
  state: DrawingState,
  dispatch: React.Dispatch<DrawingAction>,
  currentDrawingRef: React.MutableRefObject<Partial<DrawingTool> | null>
) => {
  const animationFrameRef = useRef<number | null>(null)

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Generate unique ID for drawing tools
  const generateId = useCallback(() => {
    return `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Snap price to nearby levels
  const snapPrice = useCallback(
    (price: number, nearbyPrices: number[] = []): number => {
      if (!state.snapToPrice || nearbyPrices.length === 0) return price

      // Find the closest price level within tolerance
      const tolerance =
        (Math.max(...nearbyPrices) - Math.min(...nearbyPrices)) * (state.snapTolerance / 100)

      for (const snapPrice of nearbyPrices) {
        if (Math.abs(price - snapPrice) <= tolerance) {
          return snapPrice
        }
      }

      return price
    },
    [state.snapToPrice, state.snapTolerance]
  )

  // Set active tool type
  const setToolType = useCallback(
    (toolType: DrawingToolType | null) => {
      console.log('useDrawingActions - setToolType called with:', toolType)
      dispatch({ type: 'SET_TOOL_TYPE', payload: toolType })
    },
    [dispatch]
  )

  // Set drawing mode
  const setMode = useCallback(
    (mode: DrawingMode) => {
      dispatch({ type: 'SET_MODE', payload: mode })
    },
    [dispatch]
  )

  // Start drawing operation
  const startDrawing = useCallback(
    (event: ChartMouseEvent) => {
      console.log('🎯 startDrawing called with event:', event)

      if (!state.activeToolType) {
        console.log('🎯 No active tool type, cannot start drawing')
        return
      }

      const snappedPrice = snapPrice(event.price)
      const startPoint: DrawingPoint = {
        timestamp: event.timestamp,
        price: snappedPrice,
      }

      const newDrawing = {
        id: generateId(),
        type: state.activeToolType,
        points: [startPoint],
        style: { ...state.defaultStyle },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        locked: false,
        visible: true,
      }

      // 水平線と垂直線は単一クリックで完成するため、すぐに描画を完了
      if (state.activeToolType === 'horizontal' || state.activeToolType === 'vertical') {
        console.log('🎯 Creating single-click drawing tool:', newDrawing)
        dispatch({ type: 'ADD_TOOL', payload: newDrawing as DrawingTool })
        return
      }

      // その他のツールは従来通り描画を開始
      currentDrawingRef.current = newDrawing
      console.log('🎯 Created drawing tool:', newDrawing)
      dispatch({ type: 'START_DRAWING', payload: newDrawing })
    },
    [state.activeToolType, state.defaultStyle, snapPrice, generateId, dispatch]
  )

  // Update drawing in progress
  const updateDrawing = useCallback(
    (event: ChartMouseEvent) => {
      console.log('🎯 updateDrawing called:', {
        isDrawing: state.isDrawing,
        hasCurrentDrawing: !!currentDrawingRef.current,
        event,
      })

      if (!state.isDrawing || !currentDrawingRef.current) {
        console.log('🎯 Cannot update drawing - not in drawing mode or no current drawing')
        return
      }

      // 水平線と垂直線は単一クリックなので更新不要
      if (
        currentDrawingRef.current.type === 'horizontal' ||
        currentDrawingRef.current.type === 'vertical'
      ) {
        return
      }

      // Use requestAnimationFrame for throttling
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const snappedPrice = snapPrice(event.price)
        const currentPoint: DrawingPoint = {
          timestamp: event.timestamp,
          price: snappedPrice,
        }

        if (!currentDrawingRef.current) return

        // Update the drawing based on tool type
        switch (currentDrawingRef.current.type) {
          case 'trendline':
            // Update or add second point
            if (currentDrawingRef.current.points!.length === 1) {
              currentDrawingRef.current.points!.push(currentPoint)
            } else {
              currentDrawingRef.current.points![1] = currentPoint
            }
            break

          case 'fibonacci':
            // Update or add second point for fibonacci retracement
            if (currentDrawingRef.current.points!.length === 1) {
              currentDrawingRef.current.points!.push(currentPoint)
            } else {
              currentDrawingRef.current.points![1] = currentPoint
            }
            break

          default:
            break
        }

        // Force a re-render to update the preview
        dispatch({ type: 'UPDATE_PREVIEW', payload: currentDrawingRef.current })
      })
    },
    [state.isDrawing, snapPrice, dispatch]
  )

  // Finish drawing operation
  const finishDrawing = useCallback(() => {
    console.log('finishDrawing called:', {
      hasCurrentDrawing: !!currentDrawingRef.current,
      isDrawing: state.isDrawing,
      currentDrawing: currentDrawingRef.current,
    })

    if (!currentDrawingRef.current || !state.isDrawing) {
      console.log('Cannot finish drawing - no current drawing or not in drawing mode')
      return
    }

    // 水平線と垂直線は startDrawing で既に完了しているため、ここでは処理しない
    if (
      currentDrawingRef.current.type === 'horizontal' ||
      currentDrawingRef.current.type === 'vertical'
    ) {
      currentDrawingRef.current = null
      dispatch({ type: 'STOP_DRAWING' })
      return
    }

    // Validate the drawing has enough points
    const minPoints = currentDrawingRef.current.type === 'text' ? 1 : 2
    if (currentDrawingRef.current.points!.length >= minPoints) {
      console.log('Adding completed drawing tool:', currentDrawingRef.current)
      dispatch({
        type: 'ADD_TOOL',
        payload: currentDrawingRef.current as DrawingTool,
      })
    } else {
      console.log('Drawing does not have enough points:', currentDrawingRef.current.points?.length)
    }

    currentDrawingRef.current = null
    dispatch({ type: 'STOP_DRAWING' })
  }, [state.isDrawing, dispatch])

  // Cancel drawing operation
  const cancelDrawing = useCallback(() => {
    console.log('cancelDrawing called')
    currentDrawingRef.current = null
    dispatch({ type: 'STOP_DRAWING' })
  }, [dispatch])

  // Mouse down on handle or line (prepare for potential drag)
  const mouseDown = useCallback(
    (
      toolId: string,
      handleType: 'start' | 'end' | 'line',
      startPos: { x: number; y: number },
      originalPoints?: { timestamp: number; price: number }[]
    ) => {
      console.log('🎯 mouseDown called with:', { toolId, handleType, startPos, originalPoints })
      console.log('🎯 Current state before MOUSE_DOWN:', {
        isMouseDown: state.isMouseDown,
        isDragging: state.isDragging,
        dragState: state.dragState,
        selectedToolId: state.selectedToolId,
      })

      // 重複実行を防ぐため、既にマウスダウン状態の場合は処理しない
      if (state.isMouseDown) {
        console.log('🎯 mouseDown ignored - already in mouse down state')
        return
      }

      // ドラッグ中の場合も処理しない
      if (state.isDragging) {
        console.log('🎯 mouseDown ignored - already in dragging state')
        return
      }

      console.log('🎯 Dispatching MOUSE_DOWN action')
      dispatch({
        type: 'MOUSE_DOWN',
        payload: { toolId, handleType, startPos, originalPoints },
      })
      console.log('🎯 MOUSE_DOWN dispatched successfully')
    },
    [dispatch, state.isMouseDown, state.isDragging, state.dragState, state.selectedToolId]
  )

  // Start dragging a handle
  const startDrag = useCallback(
    (
      toolId: string,
      handleType: 'start' | 'end' | 'line',
      startPos: { x: number; y: number },
      originalPoints?: { timestamp: number; price: number }[]
    ) => {
      console.log('🎯 startDrag called:', { toolId, handleType, startPos })
      dispatch({
        type: 'START_DRAG',
        payload: { toolId, handleType, startPos, originalPoints },
      })
    },
    [dispatch]
  )

  // Update drag position - ドラッグ中のリアルタイム座標更新
  const updateDrag = useCallback(
    (x: number, y: number, chartInstance?: ECharts, data?: PriceData[]) => {
      console.log('🎯 updateDrag called:', {
        x,
        y,
        isDragging: state.isDragging,
        dragState: state.dragState,
      })
      if (!state.isDragging || !state.dragState) return

      const { toolId, handleType } = state.dragState

      // チャートインスタンスとデータが提供されている場合、リアルタイム座標変換
      if (chartInstance && data) {
        const dataPoint = chartInstance.convertPixelToData(x, y, data)
        if (dataPoint) {
          const snappedPrice = snapPrice(dataPoint.price)
          const newPoint = {
            timestamp: dataPoint.timestamp,
            price: snappedPrice,
          }

          // 現在のツールを取得して座標を更新
          const currentTool = state.tools.find(tool => tool.id === toolId)
          if (currentTool && currentTool.points && currentTool.points.length >= 1) {
            const updatedPoints = [...currentTool.points]

            // Handle horizontal and vertical lines (single point)
            if (currentTool.type === 'horizontal' || currentTool.type === 'vertical') {
              if (handleType === 'line') {
                // For single-point lines, update the single point
                if (currentTool.type === 'horizontal') {
                  // For horizontal lines, only update the price (Y coordinate)
                  updatedPoints[0] = {
                    timestamp: currentTool.points[0].timestamp, // Keep original timestamp
                    price: snappedPrice, // Update to new price level
                  }
                } else if (currentTool.type === 'vertical') {
                  // For vertical lines, only update the timestamp (X coordinate)
                  updatedPoints[0] = {
                    timestamp: dataPoint.timestamp, // Update to new timestamp
                    price: currentTool.points[0].price, // Keep original price
                  }
                }
              }
            } else if (handleType === 'start') {
              updatedPoints[0] = newPoint
            } else if (handleType === 'end') {
              updatedPoints[1] = newPoint
            } else if (
              handleType === 'line' &&
              state.dragState?.originalPoints &&
              state.dragState?.startPos
            ) {
              // ライン全体移動: ドラッグ開始位置からの差分で移動
              const originalPoints = state.dragState.originalPoints
              const startPos = state.dragState.startPos

              if (originalPoints && originalPoints.length >= 2 && startPos) {
                // ドラッグ開始位置と現在位置の差分を計算
                const currentDataPoint = dataPoint
                const startDataPoint = chartInstance.convertPixelToData(
                  startPos.x,
                  startPos.y,
                  data
                )

                if (startDataPoint) {
                  const priceDelta = currentDataPoint.price - startDataPoint.price
                  const timeDelta = currentDataPoint.timestamp - startDataPoint.timestamp

                  // 両方の点に同じ差分を適用してライン形状を維持
                  updatedPoints[0] = {
                    timestamp: originalPoints[0].timestamp + timeDelta,
                    price: originalPoints[0].price + priceDelta,
                  }
                  updatedPoints[1] = {
                    timestamp: originalPoints[1].timestamp + timeDelta,
                    price: originalPoints[1].price + priceDelta,
                  }
                }
              }
            }

            // リアルタイムでツールの座標を更新（プレビュー）
            dispatch({
              type: 'UPDATE_TOOL',
              payload: {
                id: toolId,
                updates: { points: updatedPoints },
              },
            })
          }
        }
      }

      // ドラッグ状態も更新
      dispatch({
        type: 'UPDATE_DRAG',
        payload: { x, y },
      })
    },
    [dispatch, state.isDragging, state.dragState, state.tools, snapPrice]
  )

  // End dragging and apply changes
  const endDrag = useCallback(
    (event: ChartMouseEvent, currentTool?: DrawingTool | null) => {
      console.log('🎯 endDrag called:', event)

      // If called with null tool, just reset state (for simple clicks that didn't become drags)
      if (currentTool === null) {
        console.log('🎯 endDrag: Resetting state for simple click')
        dispatch({ type: 'END_DRAG' })
        return
      }

      if (!state.isDragging || !state.dragState) {
        console.log('🎯 endDrag: Not in dragging state, just resetting')
        dispatch({ type: 'END_DRAG' })
        return
      }

      const { toolId, handleType } = state.dragState
      const snappedPrice = snapPrice(event.price)
      const newPoint: DrawingPoint = {
        timestamp: event.timestamp,
        price: snappedPrice,
      }

      // Get current tool to preserve existing points
      if (!currentTool) {
        console.error('🎯 endDrag: currentTool is required for actual drag')
        dispatch({ type: 'END_DRAG' })
        return
      }

      // Create updated points array
      const updatedPoints = [...(currentTool.points || [])]

      // Handle horizontal and vertical lines (single point)
      if (currentTool.type === 'horizontal' || currentTool.type === 'vertical') {
        if (handleType === 'line') {
          // For single-point lines, updateDrag already handled the movement
          // Just use the current points that were updated in real-time
          const currentPoints = currentTool.points
          if (currentPoints && currentPoints.length >= 1) {
            updatedPoints[0] = currentPoints[0]
            console.log('🎯 Single-point line move finalized:', {
              type: currentTool.type,
              finalPoint: updatedPoints[0],
            })
          }
        }
      } else if (handleType === 'start') {
        updatedPoints[0] = newPoint
      } else if (handleType === 'end') {
        updatedPoints[1] = newPoint
      } else if (
        handleType === 'line' &&
        state.dragState?.originalPoints &&
        state.dragState?.startPos
      ) {
        // Move entire line: ドラッグ開始位置からの差分で移動
        const originalPoints = state.dragState.originalPoints
        const startPos = state.dragState.startPos

        if (originalPoints && originalPoints.length >= 2 && startPos) {
          // endDrag では、実際には chartInstance が利用できないため、
          // 簡略化した計算を使用。updateDrag で既にリアルタイム更新されているため、
          // ここでは最終的な座標確定のみ行う

          // 現在のマウス位置とドラッグ開始位置の差分を、
          // 既に updateDrag で計算済みの座標を使用
          const currentPoints = currentTool.points
          if (currentPoints && currentPoints.length >= 2) {
            // updateDrag で既に更新された座標を使用
            updatedPoints[0] = currentPoints[0]
            updatedPoints[1] = currentPoints[1]

            console.log('🎯 Line move finalized (using current points):', {
              finalStart: updatedPoints[0],
              finalEnd: updatedPoints[1],
            })
          }
        }
      }

      // Update the actual tool coordinates
      dispatch({
        type: 'UPDATE_TOOL',
        payload: {
          id: toolId,
          updates: {
            points: updatedPoints,
          },
        },
      })

      dispatch({ type: 'END_DRAG' })
    },
    [dispatch, state.isDragging, state.dragState, snapPrice]
  )

  return {
    // Core actions
    setToolType,
    setMode,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,

    // Drag actions
    mouseDown,
    startDrag,
    updateDrag,
    endDrag,

    // Utilities
    generateId,
    snapPrice,
  }
}
