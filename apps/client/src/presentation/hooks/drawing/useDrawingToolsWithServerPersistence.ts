import { useDrawingTools } from '@/presentation/hooks/index'
import {
  useDrawingServerPersistence,
  type DrawingServerPersistenceOptions,
} from './useDrawingServerPersistence'

/**
 * Enhanced drawing tools hook with server API persistence
 * Automatically saves and restores drawing tools based on current symbol and authenticated user
 */
export const useDrawingToolsWithServerPersistence = (
  options: DrawingServerPersistenceOptions = {}
) => {
  const drawingTools = useDrawingTools()

  const serverPersistence = useDrawingServerPersistence(
    drawingTools.tools,
    drawingTools.loadTools,
    options
  )

  return {
    // All original drawing tools functionality
    ...drawingTools,

    // Server persistence methods
    saveToServer: serverPersistence.saveToServer,
    loadFromServer: serverPersistence.loadFromServer,
    restoreForSymbol: serverPersistence.restoreForSymbol,
    deleteSavedData: serverPersistence.deleteSavedData,

    // Persistence state
    isSaving: serverPersistence.isSaving,
    isLoading: serverPersistence.isLoading,
    isAuthenticated: serverPersistence.isAuthenticated,

    // Manual save/load with current symbol
    save: serverPersistence.save,
    restore: serverPersistence.restore,

    // Clear current tools and save empty state
    clearAndSave: async () => {
      drawingTools.clearAllTools()
      if (options.symbol && serverPersistence.isAuthenticated) {
        await serverPersistence.saveToServer(options.symbol)
      }
    },
  }
}

export default useDrawingToolsWithServerPersistence
