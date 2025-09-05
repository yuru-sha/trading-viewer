// UI-related types and common interfaces

// Error types
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export interface AppApiError {
  type: ErrorType
  message: string
  details?: unknown
  timestamp: number
}

// Generic API Response type
export type UIApiResponse<T> = { success: true; data: T } | { success: false; error: AppApiError }

// Annotation types
export interface Annotation {
  id: string
  type: 'text' | 'arrow' | 'shape'
  x: number
  y: number
  content: string
  style: {
    color: string
    fontSize: number
    fontWeight: string
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
  }
  createdAt: number
  updatedAt: number
}

export interface AnnotationStyle {
  color: string
  fontSize: number
  fontWeight: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
}

export type AnnotationType = 'text' | 'arrow' | 'shape'

export interface AnnotationState {
  annotations: Annotation[]
  selectedAnnotation: string | null
  isEditing: boolean
  defaultStyle: AnnotationStyle
}

// Commands types
export interface BaseCommand {
  id: string
  name: string
  description: string
  execute: () => void | Promise<void>
  canExecute?: () => boolean
  shortcut?: string
}

export interface ChartCommand extends BaseCommand {
  category: 'chart'
  chartAction: string
}

export interface UserPreferencesCommand extends BaseCommand {
  category: 'preferences'
  preferenceKey: string
  preferenceValue: unknown
}

export interface DrawingCommand extends BaseCommand {
  category: 'drawing'
  drawingAction: string
  payload?: unknown
}

export type Command = ChartCommand | UserPreferencesCommand | DrawingCommand

export interface CommandContext {
  chartInstance?: unknown
  selectedTool?: unknown
  userPreferences?: unknown
}

export interface CommandInvoker {
  register(command: Command): void
  execute(commandId: string, context?: CommandContext): Promise<void>
  canExecute(commandId: string, context?: CommandContext): boolean
  getCommands(): Command[]
  getCommand(id: string): Command | undefined
}
