import { useCallback, useEffect, useState } from 'react'
import type { DrawingTool } from '@trading-viewer/shared'
import { api } from '../../lib/apiClient'
import { useAuth } from '../../contexts/AuthContext'
import { log } from '../../services/logger'

export interface DrawingServerPersistenceOptions {
  symbol?: string
  timeframe?: string
  autoSave?: boolean
  autoSaveInterval?: number
}

/**
 * Hook for persisting drawing tools to server API
 * Provides user-specific, symbol-based storage and auto-save functionality
 */
export const useDrawingServerPersistence = (
  tools: DrawingTool[],
  loadTools: (tools: DrawingTool[]) => void,
  options: DrawingServerPersistenceOptions = {}
) => {
  const { symbol, timeframe, autoSave = true, autoSaveInterval = 2000 } = options
  const { isAuthenticated } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Save tools to server API
  const saveToServer = useCallback(
    async (targetSymbol?: string) => {
      log.business.info('Starting server save for drawing tools', {
        symbol: targetSymbol,
        authenticated: isAuthenticated,
        toolsCount: tools.length,
      })

      if (!isAuthenticated || !targetSymbol) {
        log.business.debug('Skipping drawing tools save', {
          authenticated: isAuthenticated,
          symbol: targetSymbol,
        })
        return false
      }

      log.business.debug('Drawing tools to save', { tools })
      setIsSaving(true)
      try {
        // Delete existing tools for this symbol and timeframe first
        log.business.debug('Fetching existing tools for replacement', {
          symbol: targetSymbol,
          timeframe,
        })
        const existingTools = await api.drawings.getDrawingTools(targetSymbol, timeframe)
        log.business.debug('Found existing tools', {
          count: existingTools.data?.length || 0,
        })

        if (existingTools.data && Array.isArray(existingTools.data)) {
          for (const tool of existingTools.data) {
            const toolWithId = tool as { id: string }
            log.business.debug('Deleting existing drawing tool', {
              toolId: toolWithId.id,
            })
            await api.drawings.deleteDrawingTool(toolWithId.id)
          }
        }

        // Save new tools
        for (const tool of tools) {
          log.business.debug('Creating drawing tool on server', { tool })
          const result = await api.drawings.createDrawingTool({
            symbol: targetSymbol,
            timeframe: timeframe || '1D',
            tool: {
              type: tool.type,
              points: tool.points,
              style: tool.style,
              text: tool.text,
              locked: tool.locked,
              visible: tool.visible,
            },
          })
          log.business.debug('Drawing tool created on server', { result })
        }

        log.business.info('Drawing tools saved to server', {
          count: tools.length,
          symbol: targetSymbol,
        })
        return true
      } catch {
        log.business.error('Failed to save drawing tools to server')
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [tools, isAuthenticated, timeframe]
  )

  // Load tools from server API
  const loadFromServer = useCallback(
    async (targetSymbol?: string) => {
      log.business.info('Starting server load for drawing tools', {
        symbol: targetSymbol,
        authenticated: isAuthenticated,
      })

      if (!isAuthenticated || !targetSymbol) {
        log.business.debug('Skipping drawing tools load', {
          authenticated: isAuthenticated,
          symbol: targetSymbol,
        })
        return []
      }

      setIsLoading(true)
      try {
        log.business.debug('Fetching drawing tools from server', {
          symbol: targetSymbol,
          timeframe,
        })
        const response = await api.drawings.getDrawingTools(targetSymbol, timeframe)
        log.business.debug('Server API response for drawing tools', { response })

        if (response.data && Array.isArray(response.data)) {
          log.business.info('Drawing tools loaded from server', {
            count: response.data.length,
            symbol: targetSymbol,
            data: response.data,
          })
          return response.data as DrawingTool[]
        }

        log.business.info('No saved drawings found on server', {
          symbol: targetSymbol,
        })
        return []
      } catch {
        log.business.error('Failed to load drawing tools from server')
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, timeframe]
  )

  // Auto-restore on symbol change
  const restoreForSymbol = useCallback(
    async (targetSymbol: string) => {
      if (!isAuthenticated) {
        loadTools([])
        return
      }

      const savedTools = await loadFromServer(targetSymbol)
      loadTools(savedTools)
    },
    [loadFromServer, loadTools, isAuthenticated]
  )

  // Delete saved data for a symbol
  const deleteSavedData = useCallback(
    async (targetSymbol: string) => {
      if (!isAuthenticated) return false

      try {
        const existingTools = await api.drawings.getDrawingTools(targetSymbol)
        if (existingTools.data && Array.isArray(existingTools.data)) {
          for (const tool of existingTools.data) {
            const toolWithId = tool as { id: string }
            await api.drawings.deleteDrawingTool(toolWithId.id)
          }
        }

        log.business.info('Deleted saved drawings from server', {
          symbol: targetSymbol,
        })
        return true
      } catch {
        log.business.error('Failed to delete saved drawings from server')
        return false
      }
    },
    [isAuthenticated]
  )

  // Auto-save effect (debounced)
  useEffect(() => {
    log.business.debug('Auto-save effect triggered', {
      autoSave,
      symbol,
      authenticated: isAuthenticated,
      toolsCount: tools.length,
    })

    if (!autoSave) {
      log.business.debug('Auto-save skipped - disabled')
      return
    }
    if (!symbol) {
      log.business.debug('Auto-save skipped - no symbol')
      return
    }
    if (!isAuthenticated) {
      log.business.debug('Auto-save skipped - not authenticated')
      return
    }
    // Auto-save even when tools.length === 0 to handle deletions
    log.business.debug('Auto-save scheduling save with deletions', {
      delay: autoSaveInterval,
      toolsCount: tools.length,
    })

    log.business.debug('Auto-save scheduling save', {
      delay: autoSaveInterval,
      toolsCount: tools.length,
    })
    const timeoutId = setTimeout(() => {
      log.business.debug('Executing scheduled auto-save', { symbol })
      saveToServer(symbol)
    }, autoSaveInterval)

    return () => {
      log.business.debug('Clearing auto-save timeout')
      clearTimeout(timeoutId)
    }
  }, [tools, autoSave, autoSaveInterval, saveToServer, symbol, isAuthenticated])

  // Auto-restore on mount and symbol change
  useEffect(() => {
    if (symbol && isAuthenticated) {
      restoreForSymbol(symbol)
    } else if (!isAuthenticated) {
      // Clear tools when not authenticated
      loadTools([])
    }
  }, [symbol, isAuthenticated, restoreForSymbol, loadTools])

  return {
    // Core operations
    saveToServer,
    loadFromServer,
    restoreForSymbol,
    deleteSavedData,

    // State
    isSaving,
    isLoading,
    isAuthenticated,

    // Manual operations with current symbol
    save: () => (symbol ? saveToServer(symbol) : Promise.resolve(false)),
    restore: () => (symbol ? restoreForSymbol(symbol) : Promise.resolve()),
  }
}

export default useDrawingServerPersistence
