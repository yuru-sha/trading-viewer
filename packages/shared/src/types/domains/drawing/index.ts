// Drawing-related types
export interface DrawingPoint {
  timestamp: number
  price: number
}

export type DrawingToolType = 'trendline' | 'horizontal' | 'vertical' | 'fibonacci'

export interface DrawingTool {
  id: string
  type: DrawingToolType
  points: DrawingPoint[]
  style: DrawingStyle
  text?: string
  createdAt: number
  updatedAt: number
  locked?: boolean
  visible?: boolean
}

export interface DrawingStyle {
  color: string
  thickness: number
  opacity: number
  dashPattern?: number[]
  fillColor?: string
  fillOpacity?: number
  fontSize?: number
  fontFamily?: string
}

export type DrawingMode = 'none' | 'drawing' | 'editing' | 'deleting'

export interface DrawingState {
  tools: DrawingTool[]
  activeToolType: DrawingToolType | null
  drawingMode: DrawingMode
  selectedToolId: string | null
  isDrawing: boolean
  defaultStyle: DrawingStyle
  snapToPrice: boolean
  snapTolerance: number
}

// Support and Resistance specific types
export interface SupportResistanceLevel {
  id: string
  price: number
  strength: number // How many times price has bounced off this level
  type: 'support' | 'resistance'
  startTimestamp: number
  endTimestamp: number
  touches: DrawingPoint[]
  style: DrawingStyle
}

export interface SupportResistanceConfig {
  minTouches: number // Minimum touches to qualify as S/R level
  priceThreshold: number // Price difference threshold to consider as same level
  lookbackPeriods: number // How many periods to look back
  showLabels: boolean
  autoDetect: boolean
}

// Drawing actions for state management
export type DrawingAction =
  | { type: 'SET_TOOL_TYPE'; payload: DrawingToolType | null }
  | { type: 'SET_MODE'; payload: DrawingMode }
  | { type: 'START_DRAWING'; payload?: Partial<DrawingTool> }
  | { type: 'UPDATE_PREVIEW'; payload: Partial<DrawingTool> }
  | { type: 'STOP_DRAWING' }
  | { type: 'ADD_TOOL'; payload: DrawingTool }
  | { type: 'UPDATE_TOOL'; payload: { id: string; updates: Partial<DrawingTool> } }
  | { type: 'DELETE_TOOL'; payload: string }
  | { type: 'SELECT_TOOL'; payload: string | null }
  | { type: 'SET_STYLE'; payload: Partial<DrawingStyle> }
  | { type: 'CLEAR_ALL' }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'LOAD_TOOLS'; payload: DrawingTool[] }

// Presets for different drawing styles
export const DRAWING_PRESETS = {
  trendline: {
    color: '#3b82f6',
    thickness: 2,
    opacity: 1,
  } as DrawingStyle,

  horizontal: {
    color: '#ef4444',
    thickness: 2,
    opacity: 0.8,
  } as DrawingStyle,

  vertical: {
    color: '#10b981',
    thickness: 2,
    opacity: 0.8,
  } as DrawingStyle,

  fibonacci: {
    color: '#f59e0b',
    thickness: 1,
    opacity: 0.8,
    dashPattern: [4, 4],
  } as DrawingStyle,

  support: {
    color: '#10b981',
    thickness: 2,
    opacity: 0.8,
    dashPattern: [5, 5],
  } as DrawingStyle,

  resistance: {
    color: '#ef4444',
    thickness: 2,
    opacity: 0.8,
    dashPattern: [5, 5],
  } as DrawingStyle,

  annotation: {
    color: '#8b5cf6',
    thickness: 1,
    opacity: 0.9,
    fontSize: 12,
    fontFamily: 'system-ui',
  } as DrawingStyle,
}

// Chart interaction types
export interface ChartMouseEvent {
  timestamp: number
  price: number
  pixelX: number
  pixelY: number
  button: 'left' | 'right' | 'middle'
  modifiers: {
    ctrl: boolean
    shift: boolean
    alt: boolean
  }
}

export interface ChartBounds {
  minPrice: number
  maxPrice: number
  startTimestamp: number
  endTimestamp: number
  width: number
  height: number
}

// Drawing Tools API Types
export interface CreateDrawingToolRequest {
  symbol: string
  timeframe?: string
  tool: Omit<DrawingTool, 'id' | 'createdAt' | 'updatedAt'>
}

export interface CreateDrawingToolResponse {
  data: DrawingTool
  status: 'success' | 'error'
  message?: string
}

export interface GetDrawingToolsRequest {
  symbol: string
  timeframe?: string
  userId?: string
}

export interface GetDrawingToolsResponse {
  data: DrawingTool[]
  status: 'success' | 'error'
  message?: string
}

export interface UpdateDrawingToolRequest {
  id: string
  updates: Partial<Omit<DrawingTool, 'id' | 'createdAt' | 'updatedAt'>>
}

export interface UpdateDrawingToolResponse {
  data: DrawingTool
  status: 'success' | 'error'
  message?: string
}

export interface DeleteDrawingToolRequest {
  id: string
}

export interface DeleteDrawingToolResponse {
  status: 'success' | 'error'
  message?: string
}
