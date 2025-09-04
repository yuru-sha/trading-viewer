import type {
  ICommand,
  ICommandFactory,
  DrawingCommandParams as SharedDrawingCommandParams,
} from '@trading-viewer/shared'
import { log } from '@/infrastructure/services/LoggerService'
import { BaseCommand } from './BaseCommand'
import {
  CreateDrawingToolCommand,
  UpdateDrawingToolCommand,
  DeleteDrawingToolCommand,
  BatchDrawingCommand,
} from './DrawingCommands'
import { ChartSettingsCommand, AddIndicatorCommand, RemoveIndicatorCommand } from './ChartCommands'
import { UpdateUserPreferencesCommand } from './UserPreferencesCommands'

// Local type definitions for compatibility
interface ChartSettingsParams {
  timeframe?: string
  chartType?: 'candlestick' | 'line' | 'area'
  indicators?: string[]
  theme?: 'light' | 'dark'
}

interface UserPreferencesParams {
  theme?: 'light' | 'dark' | 'auto'
  language?: string
  notifications?: boolean
  autoSave?: boolean
  [key: string]: unknown
}

// Context types for dependency injection
interface DrawingContext {
  createDrawingTool: (params: SharedDrawingCommandParams) => void
  updateDrawingTool: (drawingId: string, updates: Record<string, unknown>) => void
  deleteDrawingTool: (drawingId: string) => void
}

interface ChartContext {
  updateSettings: (settings: ChartSettingsParams) => void
  addIndicator: (type: string, params: Record<string, unknown>) => void
  removeIndicator: (id: string) => void
}

interface UserPreferencesContext {
  updatePreferences: (preferences: UserPreferencesParams) => void
}

/**
 * Command Factory Implementation
 * Creates command instances based on type and parameters
 */
export class CommandFactory implements ICommandFactory {
  private registry: Map<string, CommandCreator> = new Map()
  private contexts: Map<string, unknown> = new Map()

  constructor() {
    this.registerDefaultCommands()
  }

  /**
   * Create a command of the specified type
   */
  createCommand<T extends ICommand<unknown, unknown>>(type: string, params: unknown): T {
    const creator = this.registry.get(type)
    if (!creator) {
      throw new Error(`Unknown command type: ${type}`)
    }

    try {
      return creator(params, this.getContexts()) as T
    } catch {
      throw new Error(`Failed to create command '${type}'`)
    }
  }

  /**
   * Register a command creator
   */
  registerCommand(type: string, creator: CommandCreator<ICommand<unknown, unknown>>): void {
    this.registry.set(type, creator)
  }

  /**
   * Register a context for dependency injection
   */
  registerContext(name: string, context: unknown): void {
    this.contexts.set(name, context)
  }

  /**
   * Get all registered contexts
   */
  private getContexts(): Record<string, unknown> {
    const contexts: Record<string, unknown> = {}
    for (const [name, context] of this.contexts) {
      contexts[name] = context
    }
    return contexts
  }

  /**
   * Get available command types
   */
  getAvailableCommands(): string[] {
    return Array.from(this.registry.keys())
  }

  /**
   * Check if command type is registered
   */
  isCommandRegistered(type: string): boolean {
    return this.registry.has(type)
  }

  /**
   * Create batch command from multiple commands
   */
  createBatchCommand(commands: ICommand<unknown, unknown>[]): ICommand<unknown, unknown> {
    return this.createCommand('BATCH', { commands })
  }

  /**
   * Create command from serialized data
   */
  createFromSerialized<T extends ICommand<unknown, unknown>>(serializedCommand: string): T {
    try {
      const data = JSON.parse(serializedCommand)
      return this.createCommand(data.type, data.params)
    } catch {
      throw new Error(`Failed to deserialize command`)
    }
  }

  /**
   * Register default commands
   */
  private registerDefaultCommands(): void {
    // Drawing Commands
    this.registerCommand(
      'CREATE_DRAWING',
      (params, contexts) =>
        new CreateDrawingToolCommand(
          params as SharedDrawingCommandParams,
          contexts.drawing as DrawingContext
        )
    )

    this.registerCommand(
      'UPDATE_DRAWING',
      (params, contexts) =>
        new UpdateDrawingToolCommand(
          params as { drawingId: string; updates: Record<string, unknown> },
          contexts.drawing as DrawingContext
        )
    )

    this.registerCommand(
      'DELETE_DRAWING',
      (params, contexts) =>
        new DeleteDrawingToolCommand(
          params as { drawingId: string },
          contexts.drawing as DrawingContext
        )
    )

    this.registerCommand(
      'BATCH_DRAWING',
      params =>
        new BatchDrawingCommand((params as { commands: BaseCommand<unknown, unknown>[] }).commands)
    )

    // Chart Commands
    this.registerCommand(
      'UPDATE_CHART_SETTINGS',
      (params, contexts) =>
        new ChartSettingsCommand(params as ChartSettingsParams, contexts.chart as ChartContext)
    )

    this.registerCommand(
      'ADD_INDICATOR',
      (params, contexts) =>
        new AddIndicatorCommand(
          params as { type: string; params: Record<string, unknown> },
          contexts.chart as ChartContext
        )
    )

    this.registerCommand(
      'REMOVE_INDICATOR',
      (params, contexts) =>
        new RemoveIndicatorCommand(params as { id: string }, contexts.chart as ChartContext)
    )

    // User Preferences Commands
    this.registerCommand(
      'UPDATE_USER_PREFERENCES',
      (params, contexts) =>
        new UpdateUserPreferencesCommand(
          params as UserPreferencesParams,
          contexts.userPreferences as UserPreferencesContext
        )
    )

    // Batch Command
    this.registerCommand('BATCH', params => {
      return new BatchCommand((params as { commands: ICommand<unknown, unknown>[] }).commands)
    })
  }
}

/**
 * Command Creator Function Type
 */
type CommandCreator<T extends ICommand<unknown, unknown> = ICommand<unknown, unknown>> = (
  params: unknown,
  contexts: Record<string, unknown>
) => T

/**
 * Generic Batch Command Implementation
 */
class BatchCommand extends BaseCommand<unknown[], { commands: ICommand<unknown, unknown>[] }> {
  readonly type = 'BATCH'
  private results: unknown[] = []

  constructor(commands: ICommand<unknown, unknown>[]) {
    super('BATCH', { commands }, true)
  }

  async doExecute(): Promise<unknown[]> {
    this.results = []

    for (const command of this.params.commands) {
      const result = await command.execute()
      this.results.push(result)
    }

    return this.results
  }

  protected async doUndo(): Promise<{ commands: ICommand<unknown, unknown>[] }> {
    // Undo commands in reverse order
    for (let i = this.params.commands.length - 1; i >= 0; i--) {
      const command = this.params.commands[i]
      if (command?.canUndo) {
        try {
          await command.undo?.()
        } catch {
          log.system.error('Batch command undo operation failed')
        }
      }
    }
    return this.params
  }

  protected async doRedo(): Promise<unknown[]> {
    this.results = []

    for (const command of this.params.commands) {
      const result = command.redo ? await command.redo() : await command.execute()
      this.results.push(result)
    }

    return this.results
  }

  validate(): boolean | string {
    if (!this.params.commands || this.params.commands.length === 0) {
      return 'At least one command is required for batch execution'
    }

    for (const command of this.params.commands) {
      if ('validate' in command && typeof command.validate === 'function') {
        const result = (command as ICommand & { validate(): boolean | string }).validate()
        if (result !== true) {
          return `Invalid command: ${result}`
        }
      }
    }

    return true
  }
}

/**
 * Singleton Command Factory Instance
 */
export const commandFactory = new CommandFactory()

/**
 * Convenience function to create commands
 */
export function createCommand<T extends ICommand<unknown, unknown>>(
  type: string,
  params: unknown
): T {
  return commandFactory.createCommand<T>(type, params)
}

/**
 * Command Builder - Fluent interface for complex command creation
 */
export class CommandBuilder {
  private commandType?: string
  private commandParams: Record<string, unknown> = {}
  private contexts: Record<string, unknown> = {}

  type(type: string): this {
    this.commandType = type
    return this
  }

  params(params: Record<string, unknown>): this {
    this.commandParams = { ...this.commandParams, ...params }
    return this
  }

  param(key: string, value: unknown): this {
    this.commandParams[key] = value
    return this
  }

  context(name: string, context: unknown): this {
    this.contexts[name] = context
    return this
  }

  build<T extends ICommand<unknown, unknown>>(): T {
    if (!this.commandType) {
      throw new Error('Command type is required')
    }

    // Register contexts temporarily
    for (const [name, context] of Object.entries(this.contexts)) {
      commandFactory.registerContext(name, context)
    }

    return commandFactory.createCommand<T>(this.commandType, this.commandParams)
  }

  // Convenience methods for common command types
  createDrawing(params: unknown): this {
    return this.type('CREATE_DRAWING').params(params as Record<string, unknown>)
  }

  updateDrawing(id: string, properties: unknown): this {
    return this.type('UPDATE_DRAWING').params({
      id,
      properties: properties as Record<string, unknown>,
    })
  }

  deleteDrawing(id: string): this {
    return this.type('DELETE_DRAWING').params({ id })
  }

  updateChartSettings(settings: unknown): this {
    return this.type('UPDATE_CHART_SETTINGS').params(settings as Record<string, unknown>)
  }

  addIndicator(type: string, params: unknown): this {
    return this.type('ADD_INDICATOR').params({ type, params: params as Record<string, unknown> })
  }

  removeIndicator(id: string): this {
    return this.type('REMOVE_INDICATOR').params({ id })
  }

  updateUserPreferences(preferences: unknown): this {
    return this.type('UPDATE_USER_PREFERENCES').params(preferences as Record<string, unknown>)
  }
}

/**
 * Create a new command builder
 */
export function buildCommand(): CommandBuilder {
  return new CommandBuilder()
}

export default CommandFactory
