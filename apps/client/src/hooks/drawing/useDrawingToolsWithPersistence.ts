import { useEffect } from 'react'
import { useDrawingTools } from './index'
import { useDrawingPersistence, type DrawingPersistenceOptions } from './useDrawingPersistence'

/**
 * Enhanced drawing tools hook with localStorage persistence
 * Automatically saves and restores drawing tools based on current symbol
 */
export const useDrawingToolsWithPersistence = (options: DrawingPersistenceOptions = {}) => {
  const drawingTools = useDrawingTools()

  const persistence = useDrawingPersistence(drawingTools.tools, drawingTools.loadTools, options)

  // When symbol or timeframe changes, restore tools for that combination
  useEffect(() => {
    if (options.symbol) {
      console.log(
        `🔄 Symbol/timeframe changed to: ${options.symbol}:${options.timeframe || '1D'}, restoring drawings...`
      )
      persistence.restoreForSymbolAndTimeframe(options.symbol, options.timeframe)
    }
  }, [options.symbol, options.timeframe]) // Re-run when symbol or timeframe changes

  return {
    // All original drawing tools functionality
    ...drawingTools,

    // Enhanced persistence methods
    saveToLocalStorage: persistence.saveToLocalStorage,
    loadFromLocalStorage: persistence.loadFromLocalStorage,
    restoreForSymbolAndTimeframe: persistence.restoreForSymbolAndTimeframe,
    deleteSavedData: persistence.deleteSavedData,
    getSavedCombinations: persistence.getSavedCombinations,
    getStorageStatistics: persistence.getStorageStatistics,

    // Manual save/load with current symbol and timeframe
    save: () => persistence.saveToLocalStorage(options.symbol, options.timeframe),
    restore: () => {
      if (options.symbol) {
        persistence.restoreForSymbolAndTimeframe(options.symbol, options.timeframe)
      }
    },

    // Clear current tools and save empty state
    clearAndSave: () => {
      drawingTools.clearAllTools()
      if (options.symbol) {
        persistence.saveToLocalStorage(options.symbol, options.timeframe)
      }
    },
  }
}

export default useDrawingToolsWithPersistence
