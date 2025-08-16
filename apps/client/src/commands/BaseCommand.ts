import type { ICommand, CommandResult } from '@trading-viewer/shared'

/**
 * Abstract Base Command
 * Provides common functionality for all commands
 */
export abstract class BaseCommand<TResult = any, TParams = any>
  implements ICommand<TResult, TParams>
{
  readonly id: string
  readonly type: string
  readonly params: TParams
  readonly timestamp: number
  readonly canUndo: boolean

  // State management for undo functionality
  protected previousState?: any
  protected executed: boolean = false

  constructor(type: string, params: TParams, canUndo: boolean = true) {
    this.id = this.generateId()
    this.type = type
    this.params = params
    this.timestamp = Date.now()
    this.canUndo = canUndo
  }

  /**
   * Template method - subclasses implement the actual execution logic
   */
  abstract doExecute(): Promise<TResult> | TResult

  /**
   * Template method - subclasses implement the undo logic
   */
  protected abstract doUndo?(): Promise<void> | void

  /**
   * Template method - subclasses implement the redo logic
   */
  protected abstract doRedo?(): Promise<TResult> | TResult

  /**
   * Execute the command with error handling and state management
   */
  async execute(): Promise<TResult> {
    try {
      if (this.validate && !this.isValid()) {
        throw new Error(`Command validation failed: ${this.validate()}`)
      }

      // Store state before execution for undo functionality
      if (this.canUndo) {
        this.previousState = await this.captureState()
      }

      const result = await this.doExecute()
      this.executed = true

      return result
    } catch (error) {
      throw new Error(`Command execution failed: ${error}`)
    }
  }

  /**
   * Undo the command
   */
  async undo(): Promise<void> {
    if (!this.canUndo) {
      throw new Error('Command cannot be undone')
    }

    if (!this.executed) {
      throw new Error('Command has not been executed yet')
    }

    if (this.doUndo) {
      await this.doUndo()
    } else {
      // Default undo: restore previous state
      if (this.previousState) {
        await this.restoreState(this.previousState)
      }
    }

    this.executed = false
  }

  /**
   * Redo the command
   */
  async redo(): Promise<TResult> {
    if (!this.executed) {
      return this.execute()
    }

    if (this.doRedo) {
      const result = await this.doRedo()
      this.executed = true
      return result
    } else {
      // Default redo: re-execute
      return this.execute()
    }
  }

  /**
   * Validate command parameters
   */
  validate?(): boolean | string

  /**
   * Check if command is valid
   */
  private isValid(): boolean {
    if (!this.validate) return true
    const result = this.validate()
    return result === true
  }

  /**
   * Generate unique command ID
   */
  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Capture current state for undo functionality
   * Subclasses can override this method
   */
  protected async captureState(): Promise<any> {
    return null
  }

  /**
   * Restore previous state for undo functionality
   * Subclasses can override this method
   */
  protected async restoreState(state: any): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Get command metadata
   */
  getMetadata() {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      canUndo: this.canUndo,
      executed: this.executed,
      paramsSize: JSON.stringify(this.params).length,
    }
  }

  /**
   * Serialize command for storage/transmission
   */
  serialize(): string {
    return JSON.stringify({
      id: this.id,
      type: this.type,
      params: this.params,
      timestamp: this.timestamp,
      canUndo: this.canUndo,
      executed: this.executed,
    })
  }

  /**
   * Clone command with new parameters
   */
  clone(newParams?: Partial<TParams>): BaseCommand<TResult, TParams> {
    const CommandClass = this.constructor as new (
      type: string,
      params: TParams,
      canUndo: boolean
    ) => BaseCommand<TResult, TParams>
    return new CommandClass(this.type, { ...this.params, ...newParams }, this.canUndo)
  }
}
