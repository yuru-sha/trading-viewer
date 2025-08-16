import type { ICommand, ICommandFactory, AppCommand } from '@trading-viewer/shared'
import { BaseCommand } from './BaseCommand'
import {
  CreateDrawingToolCommand,
  UpdateDrawingToolCommand,
  DeleteDrawingToolCommand,
  BatchDrawingCommand,
} from './DrawingCommands'
import { ChartSettingsCommand, AddIndicatorCommand, RemoveIndicatorCommand } from './ChartCommands'
import { UpdateUserPreferencesCommand } from './UserPreferencesCommands'

/**
 * Command Factory Implementation
 * Creates command instances based on type and parameters
 */
export class CommandFactory implements ICommandFactory {
  private registry: Map<string, CommandCreator> = new Map()
  private contexts: Map<string, any> = new Map()

  constructor() {
    this.registerDefaultCommands()
  }

  /**
   * Create a command of the specified type
   */
  createCommand<T extends ICommand>(type: T['type'], params: T['params']): T {
    const creator = this.registry.get(type)
    if (!creator) {
      throw new Error(`Unknown command type: ${type}`)
    }

    try {
      return creator(params, this.getContexts()) as T
    } catch (error) {
      throw new Error(`Failed to create command '${type}': ${error}`)
    }
  }

  /**
   * Register a command creator
   */
  registerCommand<T extends ICommand>(type: string, creator: CommandCreator<T>): void {
    this.registry.set(type, creator)
  }

  /**
   * Register a context for dependency injection
   */
  registerContext(name: string, context: any): void {
    this.contexts.set(name, context)
  }

  /**
   * Get all registered contexts
   */
  private getContexts(): Record<string, any> {
    const contexts: Record<string, any> = {}
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
  createBatchCommand(commands: ICommand[]): AppCommand {
    return this.createCommand('BATCH', { commands })
  }

  /**
   * Create command from serialized data
   */
  createFromSerialized<T extends ICommand>(serializedCommand: string): T {
    try {
      const data = JSON.parse(serializedCommand)
      return this.createCommand(data.type, data.params)
    } catch (error) {
      throw new Error(`Failed to deserialize command: ${error}`)
    }
  }

  /**
   * Register default commands
   */
  private registerDefaultCommands(): void {
    // Drawing Commands
    this.registerCommand(
      'CREATE_DRAWING',
      (params, contexts) => new CreateDrawingToolCommand(params, contexts.drawing)
    )

    this.registerCommand(
      'UPDATE_DRAWING',
      (params, contexts) => new UpdateDrawingToolCommand(params, contexts.drawing)
    )

    this.registerCommand(
      'DELETE_DRAWING',
      (params, contexts) => new DeleteDrawingToolCommand(params, contexts.drawing)
    )

    this.registerCommand('BATCH_DRAWING', params => new BatchDrawingCommand(params.commands))

    // Chart Commands
    this.registerCommand(
      'UPDATE_CHART_SETTINGS',
      (params, contexts) => new ChartSettingsCommand(params, contexts.chart)
    )

    this.registerCommand(
      'ADD_INDICATOR',
      (params, contexts) => new AddIndicatorCommand(params, contexts.chart)
    )

    this.registerCommand(
      'REMOVE_INDICATOR',
      (params, contexts) => new RemoveIndicatorCommand(params, contexts.chart)
    )

    // User Preferences Commands
    this.registerCommand(
      'UPDATE_USER_PREFERENCES',
      (params, contexts) => new UpdateUserPreferencesCommand(params, contexts.userPreferences)
    )

    // Batch Command
    this.registerCommand('BATCH', params => {
      return new BatchCommand(params.commands)
    })
  }
}

/**
 * Command Creator Function Type
 */
type CommandCreator<T extends ICommand = ICommand> = (
  params: T['params'],
  contexts: Record<string, any>
) => T

/**
 * Generic Batch Command Implementation
 */
class BatchCommand extends BaseCommand<any[], { commands: ICommand[] }> {
  readonly type = 'BATCH'
  private results: any[] = []

  constructor(commands: ICommand[]) {
    super('BATCH', { commands }, true)
  }

  async doExecute(): Promise<any[]> {
    this.results = []

    for (const command of this.params.commands) {
      const result = await command.execute()
      this.results.push(result)
    }

    return this.results
  }

  protected async doUndo(): Promise<void> {
    // Undo commands in reverse order
    for (let i = this.params.commands.length - 1; i >= 0; i--) {
      const command = this.params.commands[i]
      if (command.canUndo && command.undo) {
        try {
          await command.undo()
        } catch (error) {
          console.error(`Failed to undo command ${command.id}:`, error)
        }
      }
    }
  }

  protected async doRedo(): Promise<any[]> {
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
      if (command.validate) {
        const result = command.validate()
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
export function createCommand<T extends ICommand>(type: T['type'], params: T['params']): T {
  return commandFactory.createCommand<T>(type, params)
}

/**
 * Command Builder - Fluent interface for complex command creation
 */
export class CommandBuilder {
  private commandType?: string
  private commandParams: any = {}
  private contexts: Record<string, any> = {}

  type(type: string): this {
    this.commandType = type
    return this
  }

  params(params: any): this {
    this.commandParams = { ...this.commandParams, ...params }
    return this
  }

  param(key: string, value: any): this {
    this.commandParams[key] = value
    return this
  }

  context(name: string, context: any): this {
    this.contexts[name] = context
    return this
  }

  build<T extends ICommand>(): T {
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
  createDrawing(params: any): this {
    return this.type('CREATE_DRAWING').params(params)
  }

  updateDrawing(id: string, properties: any): this {
    return this.type('UPDATE_DRAWING').params({ id, properties })
  }

  deleteDrawing(id: string): this {
    return this.type('DELETE_DRAWING').params({ id })
  }

  updateChartSettings(settings: any): this {
    return this.type('UPDATE_CHART_SETTINGS').params(settings)
  }

  addIndicator(type: string, params: any): this {
    return this.type('ADD_INDICATOR').params({ type, params })
  }

  removeIndicator(id: string): this {
    return this.type('REMOVE_INDICATOR').params({ id })
  }

  updateUserPreferences(preferences: any): this {
    return this.type('UPDATE_USER_PREFERENCES').params(preferences)
  }
}

/**
 * Create a new command builder
 */
export function buildCommand(): CommandBuilder {
  return new CommandBuilder()
}

export default CommandFactory
