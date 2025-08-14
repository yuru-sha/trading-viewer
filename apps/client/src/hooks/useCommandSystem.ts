import { useState, useCallback, useRef, useEffect } from 'react'
import type { ICommand, ICommandInvoker, CommandResult, CommandHistoryEntry } from '@shared'
import { CommandInvoker } from '../commands/CommandInvoker'
import { commandFactory } from '../commands/CommandFactory'
import { useError } from '../contexts/ErrorContext'

/**
 * Command System Hook Configuration
 */
interface UseCommandSystemOptions {
  maxHistorySize?: number
  enableKeyboardShortcuts?: boolean
  enableNotifications?: boolean
  onCommandExecuted?: (result: CommandResult) => void
  onCommandFailed?: (error: Error, command: ICommand) => void
}

/**
 * Command System Hook Return Type
 */
interface UseCommandSystemReturn {
  // Execution methods
  execute: <T>(command: ICommand<T>) => Promise<CommandResult<T>>
  executeSequence: <T>(commands: ICommand<T>[]) => Promise<CommandResult<T>[]>
  executeParallel: <T>(commands: ICommand<T>[]) => Promise<CommandResult<T>[]>

  // Undo/Redo operations
  undo: () => Promise<boolean>
  redo: () => Promise<boolean>
  canUndo: boolean
  canRedo: boolean

  // History management
  history: CommandHistoryEntry[]
  clearHistory: () => void
  getStatistics: () => ReturnType<CommandInvoker['getStatistics']>

  // State
  isExecuting: boolean
  lastResult: CommandResult | null

  // Utility functions
  createCommand: typeof commandFactory.createCommand
  buildBatchCommand: (commands: ICommand[]) => ICommand
}

/**
 * Custom hook for managing command system operations
 */
export function useCommandSystem(options: UseCommandSystemOptions = {}): UseCommandSystemReturn {
  const {
    maxHistorySize = 100,
    enableKeyboardShortcuts = true,
    enableNotifications = true,
    onCommandExecuted,
    onCommandFailed,
  } = options

  // Initialize command invoker
  const invokerRef = useRef<CommandInvoker>(new CommandInvoker(maxHistorySize))
  const invoker = invokerRef.current

  // State management
  const [isExecuting, setIsExecuting] = useState(false)
  const [history, setHistory] = useState<CommandHistoryEntry[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [lastResult, setLastResult] = useState<CommandResult | null>(null)

  // Error handling
  const { addError } = useError()

  // Update state when command operations occur
  const updateState = useCallback(() => {
    setHistory([...invoker.getHistory()])
    setCanUndo(invoker.canUndo())
    setCanRedo(invoker.canRedo())
  }, [invoker])

  // Execute a single command
  const execute = useCallback(
    async <T>(command: ICommand<T>): Promise<CommandResult<T>> => {
      setIsExecuting(true)

      try {
        const result = await invoker.execute(command)
        setLastResult(result)
        updateState()

        if (result.success) {
          onCommandExecuted?.(result)

          if (enableNotifications) {
            // You could integrate with a notification system here
            console.log(`Command executed: ${command.type}`)
          }
        } else if (result.error) {
          const error = new Error(result.error)
          onCommandFailed?.(error, command)

          if (enableNotifications) {
            addError({
              type: 'error',
              title: 'Command Failed',
              message: result.error,
              source: 'client',
            })
          }
        }

        return result
      } catch (error) {
        const errorResult: CommandResult<T> = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: 0,
          commandId: command.id,
        }

        setLastResult(errorResult)
        onCommandFailed?.(error instanceof Error ? error : new Error(String(error)), command)

        if (enableNotifications) {
          addError({
            type: 'error',
            title: 'Command Execution Error',
            message: errorResult.error || 'Unknown error occurred',
            source: 'client',
          })
        }

        throw error
      } finally {
        setIsExecuting(false)
      }
    },
    [invoker, updateState, onCommandExecuted, onCommandFailed, enableNotifications, addError]
  )

  // Execute multiple commands in sequence
  const executeSequence = useCallback(
    async <T>(commands: ICommand<T>[]): Promise<CommandResult<T>[]> => {
      setIsExecuting(true)

      try {
        const results = await invoker.executeSequence(commands)
        updateState()
        return results
      } finally {
        setIsExecuting(false)
      }
    },
    [invoker, updateState]
  )

  // Execute multiple commands in parallel
  const executeParallel = useCallback(
    async <T>(commands: ICommand<T>[]): Promise<CommandResult<T>[]> => {
      setIsExecuting(true)

      try {
        const results = await invoker.executeParallel(commands)
        updateState()
        return results
      } finally {
        setIsExecuting(false)
      }
    },
    [invoker, updateState]
  )

  // Undo last command
  const undo = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true)

    try {
      const result = await invoker.undo()
      updateState()

      if (result && enableNotifications) {
        console.log('Command undone')
      }

      return result
    } catch (error) {
      if (enableNotifications) {
        addError({
          type: 'error',
          title: 'Undo Failed',
          message: error instanceof Error ? error.message : String(error),
          source: 'client',
        })
      }
      return false
    } finally {
      setIsExecuting(false)
    }
  }, [invoker, updateState, enableNotifications, addError])

  // Redo next command
  const redo = useCallback(async (): Promise<boolean> => {
    setIsExecuting(true)

    try {
      const result = await invoker.redo()
      updateState()

      if (result && enableNotifications) {
        console.log('Command redone')
      }

      return result
    } catch (error) {
      if (enableNotifications) {
        addError({
          type: 'error',
          title: 'Redo Failed',
          message: error instanceof Error ? error.message : String(error),
          source: 'client',
        })
      }
      return false
    } finally {
      setIsExecuting(false)
    }
  }, [invoker, updateState, enableNotifications, addError])

  // Clear command history
  const clearHistory = useCallback(() => {
    invoker.clearHistory()
    updateState()
  }, [invoker, updateState])

  // Get execution statistics
  const getStatistics = useCallback(() => {
    return invoker.getStatistics()
  }, [invoker])

  // Create command using factory
  const createCommand = useCallback(
    <T extends ICommand>(type: T['type'], params: T['params']): T => {
      return commandFactory.createCommand<T>(type, params)
    },
    []
  )

  // Build batch command
  const buildBatchCommand = useCallback((commands: ICommand[]): ICommand => {
    return commandFactory.createBatchCommand(commands)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        if (canUndo && !isExecuting) {
          undo()
        }
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      if (
        ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) ||
        ((event.ctrlKey || event.metaKey) && event.key === 'y')
      ) {
        event.preventDefault()
        if (canRedo && !isExecuting) {
          redo()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardShortcuts, canUndo, canRedo, isExecuting, undo, redo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup any ongoing operations
      if (invoker) {
        // invoker.dispose() if implemented
      }
    }
  }, [invoker])

  return {
    // Execution methods
    execute,
    executeSequence,
    executeParallel,

    // Undo/Redo operations
    undo,
    redo,
    canUndo,
    canRedo,

    // History management
    history,
    clearHistory,
    getStatistics,

    // State
    isExecuting,
    lastResult,

    // Utility functions
    createCommand,
    buildBatchCommand,
  }
}

/**
 * Hook for simplified command execution (for basic use cases)
 */
export function useSimpleCommands() {
  const commandSystem = useCommandSystem({
    enableKeyboardShortcuts: false,
    enableNotifications: false,
  })

  return {
    execute: commandSystem.execute,
    createCommand: commandSystem.createCommand,
    isExecuting: commandSystem.isExecuting,
  }
}

/**
 * Hook for drawing commands specifically
 */
export function useDrawingCommands(drawingContext: any) {
  const commandSystem = useCommandSystem()

  // Register drawing context
  useEffect(() => {
    commandFactory.registerContext('drawing', drawingContext)
  }, [drawingContext])

  const createDrawing = useCallback(
    (params: any) => {
      const command = commandSystem.createCommand('CREATE_DRAWING', params)
      return commandSystem.execute(command)
    },
    [commandSystem]
  )

  const updateDrawing = useCallback(
    (id: string, properties: any) => {
      const command = commandSystem.createCommand('UPDATE_DRAWING', { id, properties })
      return commandSystem.execute(command)
    },
    [commandSystem]
  )

  const deleteDrawing = useCallback(
    (id: string) => {
      const command = commandSystem.createCommand('DELETE_DRAWING', { id })
      return commandSystem.execute(command)
    },
    [commandSystem]
  )

  return {
    ...commandSystem,
    createDrawing,
    updateDrawing,
    deleteDrawing,
  }
}

/**
 * Hook for chart commands specifically
 */
export function useChartCommands(chartContext: any) {
  const commandSystem = useCommandSystem()

  // Register chart context
  useEffect(() => {
    commandFactory.registerContext('chart', chartContext)
  }, [chartContext])

  const updateChartSettings = useCallback(
    (settings: any) => {
      const command = commandSystem.createCommand('UPDATE_CHART_SETTINGS', settings)
      return commandSystem.execute(command)
    },
    [commandSystem]
  )

  const addIndicator = useCallback(
    (type: string, params: any) => {
      const command = commandSystem.createCommand('ADD_INDICATOR', { type, params })
      return commandSystem.execute(command)
    },
    [commandSystem]
  )

  const removeIndicator = useCallback(
    (id: string) => {
      const command = commandSystem.createCommand('REMOVE_INDICATOR', { id })
      return commandSystem.execute(command)
    },
    [commandSystem]
  )

  return {
    ...commandSystem,
    updateChartSettings,
    addIndicator,
    removeIndicator,
  }
}

export default useCommandSystem
