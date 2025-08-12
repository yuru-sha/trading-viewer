export interface ChartAnnotation {
  id: string
  type: 'note' | 'highlight' | 'callout' | 'alert'
  title: string
  content: string
  timestamp: number
  price?: number
  position: AnnotationPosition
  style: AnnotationStyle
  metadata: AnnotationMetadata
  createdAt: number
  updatedAt: number
  userId?: string
  isPrivate: boolean
  tags: string[]
  attachments?: AnnotationAttachment[]
}

export interface AnnotationPosition {
  x: number // Pixel position or percentage
  y: number // Pixel position or percentage
  anchor: 'price' | 'time' | 'chart' | 'fixed'
  anchorPrice?: number
  anchorTimestamp?: number
}

export interface AnnotationStyle {
  backgroundColor: string
  textColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  fontSize: number
  fontWeight: 'normal' | 'bold'
  opacity: number
  shadow: boolean
  maxWidth?: number
  zIndex: number
}

export interface AnnotationMetadata {
  symbol?: string
  timeframe?: string
  chartType?: string
  context?: Record<string, any>
  version: number
}

export interface AnnotationAttachment {
  id: string
  type: 'image' | 'link' | 'file'
  name: string
  url: string
  size?: number
  mimeType?: string
  thumbnailUrl?: string
}

export type AnnotationType = ChartAnnotation['type']

export interface AnnotationGroup {
  id: string
  name: string
  description?: string
  color: string
  annotations: string[] // Annotation IDs
  isCollapsed: boolean
  createdAt: number
  updatedAt: number
}

export interface AnnotationFilter {
  types?: AnnotationType[]
  tags?: string[]
  dateRange?: {
    start: number
    end: number
  }
  priceRange?: {
    min: number
    max: number
  }
  userId?: string
  isPrivate?: boolean
  groups?: string[]
}

export interface AnnotationSearchQuery {
  query: string
  filter?: AnnotationFilter
  sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'timestamp'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface AnnotationTemplate {
  id: string
  name: string
  description?: string
  type: AnnotationType
  style: AnnotationStyle
  defaultContent: string
  tags: string[]
  isGlobal: boolean
  createdAt: number
}

// Action types for annotation management
export type AnnotationAction =
  | { type: 'ADD_ANNOTATION'; payload: ChartAnnotation }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<ChartAnnotation> } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'BULK_DELETE_ANNOTATIONS'; payload: string[] }
  | { type: 'MOVE_ANNOTATION'; payload: { id: string; position: AnnotationPosition } }
  | { type: 'SET_ANNOTATIONS'; payload: ChartAnnotation[] }
  | { type: 'FILTER_ANNOTATIONS'; payload: AnnotationFilter }
  | { type: 'SEARCH_ANNOTATIONS'; payload: AnnotationSearchQuery }
  | { type: 'GROUP_ANNOTATIONS'; payload: { groupId: string; annotationIds: string[] } }
  | { type: 'CREATE_GROUP'; payload: AnnotationGroup }
  | { type: 'DELETE_GROUP'; payload: string }
  | { type: 'TOGGLE_GROUP'; payload: string }

export interface AnnotationState {
  annotations: ChartAnnotation[]
  groups: AnnotationGroup[]
  templates: AnnotationTemplate[]
  filter: AnnotationFilter | null
  searchQuery: AnnotationSearchQuery | null
  selectedAnnotationId: string | null
  isEditing: boolean
  showAnnotations: boolean
}

// Predefined annotation styles
export const ANNOTATION_PRESETS: Record<AnnotationType, AnnotationStyle> = {
  note: {
    backgroundColor: '#fef3c7',
    textColor: '#92400e',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'normal',
    opacity: 0.95,
    shadow: true,
    zIndex: 100,
  },
  highlight: {
    backgroundColor: '#dbeafe',
    textColor: '#1e40af',
    borderColor: '#3b82f6',
    borderWidth: 2,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.9,
    shadow: false,
    zIndex: 99,
  },
  callout: {
    backgroundColor: '#ecfdf5',
    textColor: '#065f46',
    borderColor: '#10b981',
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 'bold',
    opacity: 1,
    shadow: true,
    maxWidth: 200,
    zIndex: 101,
  },
  alert: {
    backgroundColor: '#fef2f2',
    textColor: '#991b1b',
    borderColor: '#ef4444',
    borderWidth: 2,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 1,
    shadow: true,
    zIndex: 102,
  },
}

export const DEFAULT_ANNOTATION_STYLE: AnnotationStyle = ANNOTATION_PRESETS.note

// Annotation interaction events
export interface AnnotationEvent {
  type: 'click' | 'hover' | 'focus' | 'edit' | 'delete' | 'move'
  annotationId: string
  position?: { x: number; y: number }
  data?: any
}

// Annotation validation
export interface AnnotationValidation {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
  }>
}

export const validateAnnotation = (annotation: Partial<ChartAnnotation>): AnnotationValidation => {
  const errors: Array<{ field: string; message: string }> = []

  if (!annotation.title || annotation.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required' })
  }

  if (annotation.title && annotation.title.length > 100) {
    errors.push({ field: 'title', message: 'Title must be 100 characters or less' })
  }

  if (!annotation.content || annotation.content.trim().length === 0) {
    errors.push({ field: 'content', message: 'Content is required' })
  }

  if (annotation.content && annotation.content.length > 1000) {
    errors.push({ field: 'content', message: 'Content must be 1000 characters or less' })
  }

  if (!annotation.type) {
    errors.push({ field: 'type', message: 'Annotation type is required' })
  }

  if (!annotation.position) {
    errors.push({ field: 'position', message: 'Position is required' })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
