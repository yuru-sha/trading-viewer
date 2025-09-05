import { useReducer, useRef } from 'react'
import type { DrawingTool, DrawingToolType } from '@trading-viewer/shared'
import { log } from '@/infrastructure/services/LoggerService'

// Use local type definitions that match domains/drawing
export type DrawingMode = 'none' | 'drawing' | 'editing' | 'deleting'

export interface LocalDrawingStyle {
  color: string
  thickness: number
  opacity: number
  dashPattern?: number[]
  fillColor?: string
  fillOpacity?: number
  fontSize?: number
  fontFamily?: string
}

// Drawing state types
export interface DrawingState {
  tools: DrawingTool[]
  activeToolType: DrawingToolType | null
  drawingMode: DrawingMode
  selectedToolId: string | null
  isDrawing: boolean
  defaultStyle: LocalDrawingStyle
  snapToPrice: boolean
  snapTolerance: number
  currentDrawing: DrawingTool | null
  lastPreviewUpdate: number
  // Drag state for handle manipulation
  isDragging: boolean
  isMouseDown: boolean
  dragState: {
    toolId: string | null
    handleType: 'start' | 'end' | 'line' | null // 'line' for moving entire line
    startPos: { x: number; y: number } | null
    originalPoints?: { timestamp: number; price: number }[] | undefined // Store original line points
  } | null
}

// Action types for state management
export type DrawingAction =
  | { type: 'SET_TOOL_TYPE'; payload: DrawingToolType | null }
  | { type: 'SET_MODE'; payload: DrawingMode }
  | { type: 'START_DRAWING'; payload: Partial<DrawingTool> }
  | { type: 'UPDATE_PREVIEW'; payload: Partial<DrawingTool> }
  | { type: 'STOP_DRAWING' }
  | { type: 'ADD_TOOL'; payload: DrawingTool }
  | { type: 'SELECT_TOOL'; payload: string | null }
  | { type: 'UPDATE_TOOL'; payload: { id: string; updates: Partial<DrawingTool> } }
  | { type: 'DELETE_TOOL'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_STYLE'; payload: Partial<LocalDrawingStyle> }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'LOAD_TOOLS'; payload: DrawingTool[] }
  | {
      type: 'MOUSE_DOWN'
      payload: {
        toolId: string
        handleType: 'start' | 'end' | 'line'
        startPos: { x: number; y: number }
        originalPoints?: { timestamp: number; price: number }[]
      }
    }
  | {
      type: 'START_DRAG'
      payload: {
        toolId: string
        handleType: 'start' | 'end' | 'line'
        startPos: { x: number; y: number }
        originalPoints?: { timestamp: number; price: number }[]
      }
    }
  | { type: 'UPDATE_DRAG'; payload: { x: number; y: number } }
  | {
      type: 'BATCH_UPDATE_DRAG'
      payload: {
        toolUpdate: { id: string; updates: Partial<DrawingTool> }
        dragUpdate: { x: number; y: number }
      }
    }
  | { type: 'END_DRAG' }

// Initial state configuration
export const initialState: DrawingState = {
  tools: [],
  activeToolType: null,
  drawingMode: 'none',
  selectedToolId: null,
  isDrawing: false,
  defaultStyle: {
    color: '#2563eb',
    thickness: 2,
    opacity: 1,
    dashPattern: [],
  },
  snapToPrice: true,
  snapTolerance: 2,
  currentDrawing: null,
  lastPreviewUpdate: 0,
  isDragging: false,
  isMouseDown: false,
  dragState: null,
}

// State reducer for drawing operations
export const drawingReducer = (state: DrawingState, action: DrawingAction): DrawingState => {
  switch (action.type) {
    case 'SET_TOOL_TYPE':
      return {
        ...state,
        activeToolType: action.payload,
        drawingMode: action.payload ? 'drawing' : 'none',
        selectedToolId: null,
      }

    case 'SET_MODE':
      return {
        ...state,
        drawingMode: action.payload,
        activeToolType: action.payload === 'drawing' ? state.activeToolType : null,
      }

    case 'START_DRAWING':
      return {
        ...state,
        isDrawing: true,
        currentDrawing: action.payload as DrawingTool,
      }

    case 'UPDATE_PREVIEW':
      return {
        ...state,
        currentDrawing: action.payload as DrawingTool,
        lastPreviewUpdate: Date.now(),
      }

    case 'STOP_DRAWING':
      return {
        ...state,
        isDrawing: false,
        currentDrawing: null,
      }

    case 'ADD_TOOL':
      return {
        ...state,
        tools: [...state.tools, action.payload],
        currentDrawing: null,
        isDrawing: false,
      }

    case 'SELECT_TOOL':
      log.business.debug('Drawing tool selection', {
        newSelection: action.payload,
        previousSelection: state.selectedToolId,
      })
      return {
        ...state,
        selectedToolId: action.payload,
        // ✨ FIX: Don't change drawingMode or activeToolType when selecting existing tools
        // This allows users to keep their drawing tool active while selecting/editing existing tools
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

    case 'CLEAR_ALL':
      return {
        ...state,
        tools: [],
        selectedToolId: null,
        currentDrawing: null,
        isDrawing: false,
      }

    case 'SET_STYLE':
      return {
        ...state,
        defaultStyle: { ...state.defaultStyle, ...action.payload },
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
        selectedToolId: null,
        currentDrawing: null,
        isDrawing: false,
      }

    case 'MOUSE_DOWN': {
      log.business.debug('Processing mouse down on drawing tool', action.payload)
      const newState = {
        ...state,
        isMouseDown: true,
        dragState: {
          toolId: action.payload.toolId,
          handleType: action.payload.handleType,
          startPos: action.payload.startPos,
          originalPoints: action.payload.originalPoints,
        },
      }
      log.business.debug('Mouse down state updated', {
        isMouseDown: newState.isMouseDown,
        dragState: newState.dragState,
      })
      return newState
    }

    case 'START_DRAG':
      return {
        ...state,
        isDragging: true,
        isMouseDown: false,
        dragState: state.dragState
          ? {
              ...state.dragState,
              toolId: action.payload.toolId,
              handleType: action.payload.handleType,
              startPos: action.payload.startPos,
              originalPoints: action.payload.originalPoints,
            }
          : {
              toolId: action.payload.toolId,
              handleType: action.payload.handleType,
              startPos: action.payload.startPos,
              originalPoints: action.payload.originalPoints,
            },
      }

    case 'UPDATE_DRAG':
      // ドラッグ中は実際の座標更新は行わず、プレビューのみ
      return {
        ...state,
        lastPreviewUpdate: Date.now(),
      }

    case 'BATCH_UPDATE_DRAG':
      // Batch update both tool and drag state in a single render
      return {
        ...state,
        tools: state.tools.map(tool =>
          tool.id === action.payload.toolUpdate.id
            ? { ...tool, ...action.payload.toolUpdate.updates }
            : tool
        ),
        lastPreviewUpdate: Date.now(),
      }

    case 'END_DRAG':
      return {
        ...state,
        isDragging: false,
        isMouseDown: false,
        dragState: null,
      }

    default:
      return state
  }
}

/**
 * Hook for managing drawing state
 * Handles the core state management for drawing tools
 */
export const useDrawingState = () => {
  const [state, dispatch] = useReducer(drawingReducer, initialState)
  const currentDrawingRef = useRef<Partial<DrawingTool> | null>(null)

  return {
    // State
    state,
    currentDrawingRef,

    // Actions
    dispatch,

    // Computed properties
    hasTools: state.tools.length > 0,
    visibleTools: state.tools.filter(tool => tool.visible !== false),
    isInDrawingMode: state.drawingMode === 'drawing',
    isInEditingMode: state.drawingMode === 'editing',
    canDraw: state.activeToolType !== null,
    toolCount: state.tools.length,
  }
}
