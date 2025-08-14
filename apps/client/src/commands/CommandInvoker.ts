import type { ICommand, ICommandInvoker, CommandResult, CommandHistoryEntry } from '@shared'
import { UI_TIMEOUTS } from '@shared'

/**
 * Command Invoker Implementation
 * Manages command execution, undo/redo operations, and command history
 */
export class CommandInvoker implements ICommandInvoker {
  private history: CommandHistoryEntry[] = []
  private currentIndex: number = -1
  private maxHistorySize: number
  private isExecuting: boolean = false

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize
  }

  /**
   * Execute a command and add it to history
   */
  async execute<T>(command: ICommand<T>): Promise<CommandResult<T>> {
    if (this.isExecuting) {
      throw new Error('Cannot execute command while another command is executing')
    }

    this.isExecuting = true
    const startTime = performance.now()

    try {
      // Execute the command
      const data = await command.execute()
      const executionTime = performance.now() - startTime

      const result: CommandResult<T> = {
        success: true,
        data,
        executionTime,
        commandId: command.id,
      }

      // Add to history if the command can be undone
      if (command.canUndo) {
        this.addToHistory(command, result)
      }

      return result
    } catch (error) {
      const executionTime = performance.now() - startTime
      const result: CommandResult<T> = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        commandId: command.id,
      }

      // Even failed commands might need to be in history for debugging
      if (command.canUndo) {
        this.addToHistory(command, result)
      }

      throw error
    } finally {
      this.isExecuting = false
    }
  }

  /**
   * Undo the last executed command
   */
  async undo(): Promise<boolean> {
    if (!this.canUndo()) {
      return false
    }

    if (this.isExecuting) {
      throw new Error('Cannot undo while a command is executing')
    }

    this.isExecuting = true

    try {
      const entry = this.history[this.currentIndex]

      if (!entry.command.undo) {
        return false
      }

      await entry.command.undo()
      entry.undone = true
      this.currentIndex--

      return true
    } catch (error) {
      console.error('Failed to undo command:', error)
      return false
    } finally {
      this.isExecuting = false
    }
  }

  /**
   * Redo the next undone command
   */
  async redo(): Promise<boolean> {
    if (!this.canRedo()) {
      return false
    }

    if (this.isExecuting) {
      throw new Error('Cannot redo while a command is executing')
    }

    this.isExecuting = true

    try {
      const nextIndex = this.currentIndex + 1
      const entry = this.history[nextIndex]

      if (!entry.command.redo) {
        return false
      }

      await entry.command.redo()
      entry.undone = false
      this.currentIndex++

      return true
    } catch (error) {
      console.error('Failed to redo command:', error)
      return false
    } finally {
      this.isExecuting = false
    }
  }

  /**
   * Check if undo is possible
   */
  canUndo(): boolean {
    return (
      this.currentIndex >= 0 &&
      this.history[this.currentIndex] &&
      !this.history[this.currentIndex].undone &&
      this.history[this.currentIndex].result.success
    )
  }

  /**
   * Check if redo is possible
   */
  canRedo(): boolean {
    const nextIndex = this.currentIndex + 1
    return (
      nextIndex < this.history.length &&
      this.history[nextIndex] &&
      this.history[nextIndex].undone &&
      this.history[nextIndex].result.success
    )
  }

  /**
   * Get command history
   */
  getHistory(): CommandHistoryEntry[] {
    return [...this.history]
  }

  /**
   * Get recent history (last N commands)
   */
  getRecentHistory(count: number = 10): CommandHistoryEntry[] {
    return this.history.slice(-count)
  }

  /**
   * Get successful commands only
   */
  getSuccessfulHistory(): CommandHistoryEntry[] {
    return this.history.filter(entry => entry.result.success)
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = []
    this.currentIndex = -1
  }

  /**
   * Remove commands older than specified age
   */
  cleanupHistory(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - maxAgeMs
    const cutoffIndex = this.history.findIndex(entry => entry.command.timestamp > cutoffTime)

    if (cutoffIndex > 0) {
      this.history = this.history.slice(cutoffIndex)
      this.currentIndex = Math.max(-1, this.currentIndex - cutoffIndex)
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeSequence<T>(commands: ICommand<T>[]): Promise<CommandResult<T>[]> {
    const results: CommandResult<T>[] = []

    for (const command of commands) {
      try {
        const result = await this.execute(command)
        results.push(result)
      } catch (error) {
        // If a command fails, stop execution
        break
      }
    }

    return results
  }

  /**
   * Execute commands in parallel
   */
  async executeParallel<T>(commands: ICommand<T>[]): Promise<CommandResult<T>[]> {
    const promises = commands.map(command =>
      this.execute(command).catch(
        error =>
          ({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: 0,
            commandId: command.id,
          }) as CommandResult<T>
      )
    )

    return Promise.all(promises)
  }

  /**
   * Execute command with timeout
   */
  async executeWithTimeout<T>(
    command: ICommand<T>,
    timeoutMs: number = UI_TIMEOUTS.DEFAULT_COMMAND
  ): Promise<CommandResult<T>> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Command timed out after ${timeoutMs}ms`)), timeoutMs)
    })

    try {
      return await Promise.race([this.execute(command), timeoutPromise])
    } catch (error) {
      throw error
    }
  }

  /**
   * Retry failed command with exponential backoff
   */
  async executeWithRetry<T>(
    command: ICommand<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<CommandResult<T>> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(command)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))

          // Create a new instance of the command for retry
          if ('clone' in command && typeof command.clone === 'function') {
            command = (command as any).clone()
          }
        }
      }
    }

    throw lastError
  }

  /**
   * Get statistics about command execution
   */
  getStatistics() {
    const total = this.history.length
    const successful = this.history.filter(e => e.result.success).length
    const failed = total - successful
    const undone = this.history.filter(e => e.undone).length

    const executionTimes = this.history
      .filter(e => e.result.success)
      .map(e => e.result.executionTime)

    const avgExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
        : 0

    const maxExecutionTime = executionTimes.length > 0 ? Math.max(...executionTimes) : 0

    return {
      total,
      successful,
      failed,
      undone,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgExecutionTime: Math.round(avgExecutionTime * 100) / 100,
      maxExecutionTime: Math.round(maxExecutionTime * 100) / 100,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      currentIndex: this.currentIndex,
      historySize: this.history.length,
    }
  }

  /**
   * Add command to history
   */
  private addToHistory<T>(command: ICommand<T>, result: CommandResult<T>): void {
    const entry: CommandHistoryEntry<T> = {
      command,
      result,
      undone: false,
    }

    // Remove any commands after current index (they become invalid)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    // Add new command
    this.history.push(entry)
    this.currentIndex = this.history.length - 1

    // Maintain max history size
    if (this.history.length > this.maxHistorySize) {
      const excess = this.history.length - this.maxHistorySize
      this.history = this.history.slice(excess)
      this.currentIndex -= excess
    }
  }
}
