import { useCallback, useRef, useEffect } from 'react'
import type { DrawingTool, DrawingToolType, DrawingMode, DrawingStyle, DrawingPoint } from '@shared'
import type { DrawingAction, DrawingState } from './useDrawingState'

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
  const setToolType = useCallback((toolType: DrawingToolType | null) => {
    console.log('useDrawingActions - setToolType called with:', toolType)
    dispatch({ type: 'SET_TOOL_TYPE', payload: toolType })
  }, [dispatch])

  // Set drawing mode
  const setMode = useCallback((mode: DrawingMode) => {
    dispatch({ type: 'SET_MODE', payload: mode })
  }, [dispatch])

  // Start drawing operation
  const startDrawing = useCallback(
    (event: any) => {
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
    (event: any) => {
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
      if (currentDrawingRef.current.type === 'horizontal' || currentDrawingRef.current.type === 'vertical') {
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

          case 'rectangle':
          case 'circle':
            // For shapes, we need diagonal corners
            currentDrawingRef.current.points = [currentDrawingRef.current.points![0], currentPoint]
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
    if (currentDrawingRef.current.type === 'horizontal' || currentDrawingRef.current.type === 'vertical') {
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

  return {
    // Core actions
    setToolType,
    setMode,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    
    // Utilities
    generateId,
    snapPrice,
  }
}