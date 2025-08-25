// Command pattern types for application commands
import type { UserPreferences } from '../core/user'

// Base command interfaces
export interface ICommand<TResult = any, TUndo = any> {
  execute(): Promise<TResult> | TResult
  undo(): Promise<TUndo> | TUndo
  redo(): Promise<TResult> | TResult
  canUndo: boolean
  canRedo: boolean
  getDescription(): string
}

export interface CommandResult<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

export interface CommandHistoryEntry {
  command: ICommand
  timestamp: number
  description: string
  result?: CommandResult
}

export interface ICommandInvoker {
  executeCommand<T>(command: ICommand<T>): Promise<CommandResult<T>>
  undo(): Promise<boolean>
  redo(): Promise<boolean>
  getHistory(): CommandHistoryEntry[]
  clearHistory(): void
  canUndo: boolean
  canRedo: boolean
}

export interface ICommandFactory {
  createCommand(type: string, params: any): ICommand
  registerCommand(type: string, factory: (params: any) => ICommand): void
}

// Application-specific command types
export type AppCommand =
  | 'chart.addIndicator'
  | 'chart.removeIndicator'
  | 'chart.changeTimeframe'
  | 'drawing.create'
  | 'drawing.update'
  | 'drawing.delete'
  | 'user.updatePreferences'
  | 'user.exportPreferences'
  | 'watchlist.add'
  | 'watchlist.remove'

// Chart command interfaces
export interface IAddIndicatorCommand extends ICommand {
  indicatorType: string
  parameters: Record<string, any>
}

export interface IRemoveIndicatorCommand extends ICommand {
  indicatorId: string
}

// Note: Drawing command interfaces are now defined in ../commands.ts to avoid conflicts

// User preferences command interfaces
export interface IUpdateUserPreferencesCommand extends ICommand<UserPreferences> {
  preferences: Partial<UserPreferences>
}

// Drawing modes
export enum DrawingMode {
  NONE = 'none',
  LINE = 'line',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  TEXT = 'text',
  ARROW = 'arrow',
  FIBONACCI = 'fibonacci',
  TRENDLINE = 'trendline',
}

// DrawingStyle is already defined in ui/drawing.ts
// Export it from there to avoid duplication
