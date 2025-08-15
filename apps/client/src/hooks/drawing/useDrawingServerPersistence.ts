import { useCallback, useEffect, useState } from 'react'
import type { DrawingTool } from '@shared'
import { api } from '../../lib/apiClient'
import { useAuth } from '../../contexts/AuthContext'

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
      if (!isAuthenticated || !targetSymbol) return false

      setIsSaving(true)
      try {
        // Delete existing tools for this symbol first
        const existingTools = await api.drawings.getDrawingTools(targetSymbol)
        if (existingTools.data && Array.isArray(existingTools.data)) {
          for (const tool of existingTools.data) {
            await api.drawings.deleteDrawingTool(tool.id)
          }
        }

        // Save new tools
        for (const tool of tools) {
          await api.drawings.createDrawingTool({
            symbol: targetSymbol,
            tool: {
              type: tool.type,
              points: tool.points,
              style: tool.style,
              text: tool.text,
              locked: tool.locked,
              visible: tool.visible,
            },
          })
        }

        console.log(
          `💾 Saved ${tools.length} drawing tools to server for ${targetSymbol}`
        )
        return true
      } catch (error) {
        console.error('Failed to save drawing tools to server:', error)
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [tools, isAuthenticated]
  )

  // Load tools from server API
  const loadFromServer = useCallback(
    async (targetSymbol?: string) => {
      if (!isAuthenticated || !targetSymbol) return []

      setIsLoading(true)
      try {
        const response = await api.drawings.getDrawingTools(targetSymbol)
        
        if (response.data && Array.isArray(response.data)) {
          console.log(
            `📂 Loaded ${response.data.length} drawing tools from server for ${targetSymbol}`
          )
          return response.data as DrawingTool[]
        }

        console.log(`📂 No saved drawings found on server for ${targetSymbol}`)
        return []
      } catch (error) {
        console.error('Failed to load drawing tools from server:', error)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated]
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
            await api.drawings.deleteDrawingTool(tool.id)
          }
        }

        console.log(`🗑️ Deleted saved drawings from server for ${targetSymbol}`)
        return true
      } catch (error) {
        console.error('Failed to delete saved drawings from server:', error)
        return false
      }
    },
    [isAuthenticated]
  )

  // Auto-save effect (debounced)
  useEffect(() => {
    if (!autoSave || !symbol || !isAuthenticated || tools.length === 0) return

    const timeoutId = setTimeout(() => {
      saveToServer(symbol)
    }, autoSaveInterval)

    return () => clearTimeout(timeoutId)
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
    save: () => symbol ? saveToServer(symbol) : Promise.resolve(false),
    restore: () => symbol ? restoreForSymbol(symbol) : Promise.resolve(),
  }
}

export default useDrawingServerPersistence