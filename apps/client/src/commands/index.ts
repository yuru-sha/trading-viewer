/**
 * Command Pattern Implementation - Main Export File
 * Exports all command-related classes, interfaces, and utilities
 */

// Base classes and interfaces
export { BaseCommand } from './BaseCommand'
export { CommandInvoker } from './CommandInvoker'
export { CommandFactory, commandFactory, createCommand, CommandBuilder } from './CommandFactory'

// Specific command implementations
export {
  CreateDrawingToolCommand,
  UpdateDrawingToolCommand,
  DeleteDrawingToolCommand,
  BatchDrawingCommand,
} from './DrawingCommands'

export {
  ChartSettingsCommand,
  AddIndicatorCommand,
  RemoveIndicatorCommand,
  BatchChartCommand,
} from './ChartCommands'

export {
  UpdateUserPreferencesCommand,
  ResetUserPreferencesCommand,
  ImportUserPreferencesCommand,
  ExportUserPreferencesCommand,
} from './UserPreferencesCommands'

// React hooks
export {
  useCommandSystem,
  useSimpleCommands,
  useDrawingCommands,
  useChartCommands,
} from '../hooks/useCommandSystem'

// Re-export shared types for convenience
export type {
  ICommand,
  ICommandInvoker,
  ICommandFactory,
  CommandResult,
  CommandHistoryEntry,
  AppCommand,
  DrawingCommandParams,
  CreateDrawingCommand,
  UpdateDrawingCommand,
  DeleteDrawingCommand,
  UserPreferencesParams,
  BatchCommand,
  DrawingToolType,
} from '@trading-viewer/shared'

/**
 * Command System Factory
 * Convenience function to create a fully configured command system
 */
export async function createCommandSystem(options?: {
  maxHistorySize?: number
  contexts?: Record<string, unknown>
}) {
  const { maxHistorySize = 100, contexts = {} } = options || {}

  // Import locally to avoid circular dependency issues
  const { CommandInvoker: LocalCommandInvoker } = await import('./CommandInvoker')
  const { CommandFactory: LocalCommandFactory } = await import('./CommandFactory')

  const invoker = new LocalCommandInvoker(maxHistorySize)
  const factory = new LocalCommandFactory()

  // Register contexts
  Object.entries(contexts).forEach(([name, context]) => {
    factory.registerContext(name, context)
  })

  return {
    invoker,
    factory,
    execute: (command: ICommand<unknown, unknown>) => invoker.execute(command),
    createCommand: <T extends ICommand<unknown, unknown>>(type: string, params: unknown) =>
      factory.createCommand<T>(type, params),
    undo: () => invoker.undo(),
    redo: () => invoker.redo(),
    canUndo: () => invoker.canUndo(),
    canRedo: () => invoker.canRedo(),
    getHistory: () => invoker.getHistory(),
    clearHistory: () => invoker.clearHistory(),
    getStatistics: () => invoker.getStatistics(),
  }
}

/**
 * Create default command system instance
 */
const defaultCommandSystem = createCommandSystem()

/**
 * Default export - Command System factory
 */
export default defaultCommandSystem
