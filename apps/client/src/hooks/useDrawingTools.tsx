import { useReducer, useCallback, useRef, useEffect } from 'react'
import {
  DrawingTool,
  DrawingToolType,
  DrawingStyle,
  DrawingMode,
  DrawingState,
  DrawingAction,
  DrawingPoint,
  ChartMouseEvent,
  DRAWING_PRESETS,
} from '@trading-viewer/shared'

const initialState: DrawingState = {
  tools: [],
  activeToolType: null,
  drawingMode: 'none',
  selectedToolId: null,
  isDrawing: false,
  defaultStyle: DRAWING_PRESETS.trendline,
  snapToPrice: true,
  snapTolerance: 0.5, // 0.5% of price range
  lastPreviewUpdate: 0,
  currentDrawing: null, // 現在描画中のツール
}

const drawingReducer = (state: DrawingState, action: DrawingAction): DrawingState => {
  console.log('🔄 drawingReducer called with action:', action.type, 'payload:', action.payload)
  console.log('🔄 drawingReducer current state:', {
    activeToolType: state.activeToolType,
    drawingMode: state.drawingMode,
    isDrawing: state.isDrawing,
    toolCount: state.tools.length,
  })

  switch (action.type) {
    case 'SET_TOOL_TYPE':
      const newState = {
        ...state,
        activeToolType: action.payload,
        drawingMode: action.payload ? 'drawing' : 'none',
      }
      console.log('🔄 drawingReducer returning new state for SET_TOOL_TYPE:', {
        activeToolType: newState.activeToolType,
        drawingMode: newState.drawingMode,
        isDrawing: newState.isDrawing,
      })
      return newState

    case 'SET_MODE':
      const newModeState = {
        ...state,
        drawingMode: action.payload,
        isDrawing: action.payload === 'drawing' && state.activeToolType !== null,
      }
      console.log('🔄 SET_MODE returning state:', {
        drawingMode: newModeState.drawingMode,
        isDrawing: newModeState.isDrawing,
        activeToolType: newModeState.activeToolType,
      })
      return newModeState

    case 'START_DRAWING':
      console.log('🔄 START_DRAWING action')
      return {
        ...state,
        isDrawing: true,
        drawingMode: 'drawing',
        currentDrawing: action.payload, // 現在描画中のツールを設定
      }

    case 'STOP_DRAWING':
      console.log('🔄 STOP_DRAWING action')
      return {
        ...state,
        isDrawing: false,
        currentDrawing: null, // 描画終了時に currentDrawing をクリア
        // drawingMode は変更しない（連続描画を可能にする）
      }

    case 'ADD_TOOL':
      return {
        ...state,
        tools: [...state.tools, action.payload],
        isDrawing: false,
        // drawingMode は変更しない（連続描画を可能にする）
        selectedToolId: action.payload.id,
      }

    case 'UPDATE_TOOL':
      return {
        ...state,
        tools: state.tools.map(tool =>
          tool.id === action.payload.id
            ? { ...tool, ...action.payload.updates, updatedAt: Date.now() }
            : tool
        ),
      }

    case 'DELETE_TOOL':
      return {
        ...state,
        tools: state.tools.filter(tool => tool.id !== action.payload),
        selectedToolId: state.selectedToolId === action.payload ? null : state.selectedToolId,
      }

    case 'SELECT_TOOL':
      return {
        ...state,
        selectedToolId: action.payload,
        drawingMode: action.payload ? 'editing' : 'none',
      }

    case 'SET_STYLE':
      return {
        ...state,
        defaultStyle: { ...state.defaultStyle, ...action.payload },
      }

    case 'CLEAR_ALL':
      return {
        ...state,
        tools: [],
        selectedToolId: null,
        drawingMode: 'none',
        isDrawing: false,
      }

    case 'TOGGLE_SNAP':
      return {
        ...state,
        snapToPrice: !state.snapToPrice,
      }

    case 'LOAD_TOOLS':
      return {
        ...state,
        tools: action.payload,
      }

    case 'UPDATE_PREVIEW':
      // Force re-render for preview updates
      return {
        ...state,
        currentDrawing: action.payload, // 現在の描画ツールを更新
        // Add a timestamp to force re-render
        lastPreviewUpdate: Date.now(),
      }

    default:
      return state
  }
}

/**
 * Drawing Tools Management Hook
 * - Handles all drawing tool interactions
 * - Manages drawing state and mode
 * - Provides utilities for creating and editing tools
 * - Supports snap-to-price functionality
 */
// DEPRECATED: This file is maintained for backward compatibility
// Use the new modular hooks from './drawing/' instead

// Re-export the refactored hook for seamless migration
export { useDrawingTools } from './drawing'
export * from './drawing'

// Default export for backward compatibility
import { useDrawingTools } from './drawing'
export default useDrawingTools
