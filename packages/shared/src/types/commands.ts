/**
 * Command Pattern Types
 * Defines interfaces for command-based operations with undo/redo functionality
 */

/**
 * Base Command Interface
 * All commands must implement this interface
 */
export interface ICommand<TResult = any, TParams = any> {
  readonly id: string
  readonly type: string
  readonly params: TParams
  readonly timestamp: number
  readonly canUndo: boolean

  execute(): Promise<TResult> | TResult
  undo?(): Promise<void> | void
  redo?(): Promise<TResult> | TResult
  validate?(): boolean | string
}

/**
 * Command Execution Result
 */
export interface CommandResult<T = any> {
  success: boolean
  data?: T
  error?: string
  executionTime: number
  commandId: string
}

/**
 * Command History Entry
 */
export interface CommandHistoryEntry<T = any> {
  command: ICommand<T>
  result: CommandResult<T>
  undone: boolean
}

/**
 * Drawing Commands
 */
import type { DrawingToolType } from './drawing'

export interface DrawingCommandParams {
  toolType: DrawingToolType
  startPoint: { x: number; y: number }
  endPoint?: { x: number; y: number }
  properties: Record<string, any>
}

export interface CreateDrawingCommand extends ICommand<string, DrawingCommandParams> {
  type: 'CREATE_DRAWING'
}

export interface UpdateDrawingCommand
  extends ICommand<void, { id: string; properties: Record<string, any> }> {
  type: 'UPDATE_DRAWING'
}

export interface DeleteDrawingCommand extends ICommand<void, { id: string }> {
  type: 'DELETE_DRAWING'
}

/**
 * Chart Commands
 */
export interface ChartSettingsParams {
  timeframe?: string
  chartType?: 'candlestick' | 'line' | 'area'
  indicators?: string[]
  theme?: 'light' | 'dark'
}

export interface UpdateChartSettingsCommand extends ICommand<void, ChartSettingsParams> {
  type: 'UPDATE_CHART_SETTINGS'
}

export interface AddIndicatorCommand
  extends ICommand<string, { type: string; params: Record<string, any> }> {
  type: 'ADD_INDICATOR'
}

export interface RemoveIndicatorCommand extends ICommand<void, { id: string }> {
  type: 'REMOVE_INDICATOR'
}

/**
 * User Preference Commands
 */
export interface UserPreferencesParams {
  theme?: string
  language?: string
  notifications?: boolean
  autoSave?: boolean
  [key: string]: any
}

export interface UpdateUserPreferencesCommand extends ICommand<void, UserPreferencesParams> {
  type: 'UPDATE_USER_PREFERENCES'
}

/**
 * Batch Command - executes multiple commands as a unit
 */
export interface BatchCommand extends ICommand<CommandResult[], { commands: ICommand[] }> {
  type: 'BATCH'
}

/**
 * Command Types Union
 */
export type AppCommand =
  | CreateDrawingCommand
  | UpdateDrawingCommand
  | DeleteDrawingCommand
  | UpdateChartSettingsCommand
  | AddIndicatorCommand
  | RemoveIndicatorCommand
  | UpdateUserPreferencesCommand
  | BatchCommand

/**
 * Command Invoker Interface
 */
export interface ICommandInvoker {
  execute<T>(command: ICommand<T>): Promise<CommandResult<T>>
  undo(): Promise<boolean>
  redo(): Promise<boolean>
  canUndo(): boolean
  canRedo(): boolean
  getHistory(): CommandHistoryEntry[]
  clearHistory(): void
}

/**
 * Command Factory Interface
 */
export interface ICommandFactory {
  createCommand<T extends ICommand>(type: T['type'], params: T['params']): T
}
