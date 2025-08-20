import { useCallback, useEffect } from 'react'
import type { DrawingTool } from '@trading-viewer/shared'

export interface DrawingPersistenceOptions {
  symbol?: string
  timeframe?: string
  autoSave?: boolean
  autoSaveInterval?: number
}

const STORAGE_KEY_PREFIX = 'trading-viewer-drawings'

/**
 * Hook for persisting drawing tools to localStorage
 * Provides symbol-specific storage and auto-save functionality
 */
export const useDrawingPersistence = (
  tools: DrawingTool[],
  loadTools: (tools: DrawingTool[]) => void,
  options: DrawingPersistenceOptions = {}
) => {
  const { symbol, timeframe, autoSave = true, autoSaveInterval = 2000 } = options

  // Generate storage key for current symbol and timeframe
  const getStorageKey = useCallback(
    (targetSymbol?: string, targetTimeframe?: string) => {
      const symbolKey = targetSymbol || symbol || 'default'
      const timeframeKey = targetTimeframe || timeframe || '1D'
      return `${STORAGE_KEY_PREFIX}-${symbolKey}-${timeframeKey}`
    },
    [symbol, timeframe]
  )

  // Save tools to localStorage
  const saveToLocalStorage = useCallback(
    (targetSymbol?: string, targetTimeframe?: string) => {
      try {
        const key = getStorageKey(targetSymbol, targetTimeframe)
        const data = {
          version: '1.0',
          timestamp: Date.now(),
          symbol: targetSymbol || symbol,
          timeframe: targetTimeframe || timeframe || '1D',
          tools: tools,
        }
        localStorage.setItem(key, JSON.stringify(data))
        console.log(
          `💾 Saved ${tools.length} drawing tools for ${targetSymbol || symbol}:${targetTimeframe || timeframe || '1D'}`
        )
        return true
      } catch {
        console.error('Operation failed')
        return false
      }
    },
    [tools, symbol, timeframe, getStorageKey]
  )

  // Load tools from localStorage
  const loadFromLocalStorage = useCallback(
    (targetSymbol?: string, targetTimeframe?: string) => {
      try {
        const key = getStorageKey(targetSymbol, targetTimeframe)
        const stored = localStorage.getItem(key)

        if (!stored) {
          console.log(
            `📂 No saved drawings found for ${targetSymbol || symbol}:${targetTimeframe || timeframe || '1D'}`
          )
          return []
        }

        const data = JSON.parse(stored)

        // Validate data structure
        if (!data.tools || !Array.isArray(data.tools)) {
          console.warn('Invalid drawing data format in localStorage')
          return []
        }

        console.log(
          `📂 Loaded ${data.tools.length} drawing tools for ${targetSymbol || symbol}:${targetTimeframe || timeframe || '1D'}`
        )
        return data.tools as DrawingTool[]
      } catch {
        console.error('Operation failed')
        return []
      }
    },
    [symbol, timeframe, getStorageKey]
  )

  // Auto-restore on symbol and timeframe change
  const restoreForSymbolAndTimeframe = useCallback(
    (targetSymbol: string, targetTimeframe?: string) => {
      const savedTools = loadFromLocalStorage(targetSymbol, targetTimeframe)
      if (savedTools.length > 0) {
        loadTools(savedTools)
      } else {
        // Clear current tools when switching to symbol/timeframe with no saved drawings
        loadTools([])
      }
    },
    [loadFromLocalStorage, loadTools]
  )

  // Get all saved symbol/timeframe combinations
  const getSavedCombinations = useCallback(() => {
    const combinations: { symbol: string; timeframe: string }[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const stored = localStorage.getItem(key)
          if (stored) {
            const data = JSON.parse(stored)
            if (data.symbol && data.timeframe) {
              combinations.push({ symbol: data.symbol, timeframe: data.timeframe })
            }
          }
        } catch {
          console.warn(`Failed to parse data for key: ${key}`)
        }
      }
    }

    return combinations.sort((a, b) => {
      const symbolCompare = a.symbol.localeCompare(b.symbol)
      return symbolCompare !== 0 ? symbolCompare : a.timeframe.localeCompare(b.timeframe)
    })
  }, [])

  // Delete saved data for a symbol and timeframe
  const deleteSavedData = useCallback(
    (targetSymbol: string, targetTimeframe?: string) => {
      try {
        const key = getStorageKey(targetSymbol, targetTimeframe)
        localStorage.removeItem(key)
        console.log(`🗑️ Deleted saved drawings for ${targetSymbol}:${targetTimeframe || '1D'}`)
        return true
      } catch {
        console.error('Operation failed')
        return false
      }
    },
    [getStorageKey]
  )

  // Get statistics about saved data
  const getStorageStatistics = useCallback(() => {
    const combinations = getSavedCombinations()
    let totalTools = 0
    let totalSize = 0

    combinations.forEach(({ symbol, timeframe }) => {
      const key = getStorageKey(symbol, timeframe)
      const stored = localStorage.getItem(key)
      if (stored) {
        totalSize += stored.length
        try {
          const data = JSON.parse(stored)
          if (data.tools) {
            totalTools += data.tools.length
          }
        } catch {
          // Skip invalid entries
        }
      }
    })

    return {
      combinationCount: combinations.length,
      totalTools,
      totalSizeBytes: totalSize,
      combinations,
    }
  }, [getSavedCombinations, getStorageKey])

  // Auto-save effect (debounced)
  useEffect(() => {
    if (!autoSave || tools.length === 0) return

    const timeoutId = setTimeout(() => {
      saveToLocalStorage()
    }, autoSaveInterval)

    return () => clearTimeout(timeoutId)
  }, [tools, autoSave, autoSaveInterval, saveToLocalStorage])

  // Auto-restore on mount and symbol/timeframe change
  useEffect(() => {
    if (symbol && timeframe) {
      const savedTools = loadFromLocalStorage(symbol, timeframe)
      if (savedTools.length > 0) {
        loadTools(savedTools)
      }
    }
  }, [symbol, timeframe]) // Run when symbol or timeframe changes

  return {
    // Core operations
    saveToLocalStorage,
    loadFromLocalStorage,
    restoreForSymbolAndTimeframe,

    // Management operations
    deleteSavedData,
    getSavedCombinations,
    getStorageStatistics,

    // Utilities
    getStorageKey,
  }
}

export default useDrawingPersistence
