// Drawing and annotation UI types
export type DrawingToolType =
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'text'
  | 'fibonacci'
  | 'trendline'
  | 'channel'
  | 'polygon'

// Re-export DrawingTool from domains for backward compatibility
export type { DrawingTool } from '../domains/drawing'

export interface DrawingPoint {
  x: number
  y: number
  time?: number
  price?: number
}

export interface DrawingStyle {
  color: string
  lineWidth: number
  lineDash?: number[]
  fillColor?: string
  fontSize?: number
  fontFamily?: string
}

export interface DrawingObject {
  id: string
  type: DrawingToolType
  points: DrawingPoint[]
  style: DrawingStyle
  text?: string
  locked: boolean
  visible: boolean
  selected?: boolean
  zIndex: number
  createdAt: number
  updatedAt: number
}

export interface DrawingState {
  objects: DrawingObject[]
  selectedTool: DrawingToolType | null
  selectedObjects: string[]
  isDrawing: boolean
  snapToPrice: boolean
  snapToTime: boolean
}

// Drawing tool configuration
export interface DrawingToolConfig {
  type: DrawingToolType
  name: string
  icon: string
  cursor: string
  requiresPoints: number
  allowsMultiplePoints: boolean
  defaultStyle: DrawingStyle
}

// Drawing events
export interface DrawingEvent {
  type: 'start' | 'update' | 'end' | 'select' | 'deselect' | 'delete'
  object: DrawingObject
  point?: DrawingPoint
}

// Drawing toolbar
export interface DrawingToolbarProps {
  selectedTool: DrawingToolType | null
  onToolSelect: (tool: DrawingToolType | null) => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  disabled?: boolean
}

// Drawing layer props
export interface DrawingLayerProps {
  objects: DrawingObject[]
  selectedTool: DrawingToolType | null
  onObjectCreate: (object: Omit<DrawingObject, 'id' | 'createdAt' | 'updatedAt'>) => void
  onObjectUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onObjectDelete: (id: string) => void
  onObjectSelect: (id: string, multiSelect?: boolean) => void
  width: number
  height: number
  priceToY: (price: number) => number
  timeToX: (time: number) => number
  yToPrice: (y: number) => number
  xToTime: (x: number) => number
}
