// Refactored drawing hooks - separated from the original God Object
export { useDrawingState, type DrawingState, type DrawingAction, initialState, drawingReducer } from './useDrawingState'
export { useDrawingActions } from './useDrawingActions'
export { useDrawingToolManagement } from './useDrawingToolManagement'

// Main drawing tools hook - composed from separated concerns
import { useEffect } from 'react'
import { useDrawingState } from './useDrawingState'
import { useDrawingActions } from './useDrawingActions'
import { useDrawingToolManagement } from './useDrawingToolManagement'

/**
 * Refactored useDrawingTools - now composed from separated concerns
 * This replaces the original God Object with a clean, modular approach
 */
export const useDrawingTools = () => {
  const { 
    state, 
    currentDrawingRef, 
    dispatch, 
    hasTools, 
    visibleTools, 
    isInDrawingMode, 
    isInEditingMode, 
    canDraw, 
    toolCount 
  } = useDrawingState()

  const {
    setToolType,
    setMode,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
  } = useDrawingActions(state, dispatch, currentDrawingRef)

  const {
    selectTool,
    updateTool,
    deleteTool,
    clearAllTools,
    duplicateTool,
    setDefaultStyle,
    toggleSnap,
    loadTools,
    exportTools,
    importTools,
    getTool,
    selectedTool,
    filterTools,
    getToolsByType,
    getVisibleTools,
    getLockedTools,
    batchUpdateTools,
    batchDeleteTools,
    getToolStatistics,
  } = useDrawingToolManagement(state, dispatch)

  // Debug logging for state changes
  useEffect(() => {
    console.log('🎯 Drawing state updated:', {
      activeToolType: state.activeToolType,
      isDrawing: state.isDrawing,
      drawingMode: state.drawingMode,
      toolCount: state.tools.length,
      hasCurrentDrawing: !!currentDrawingRef.current,
    })
  }, [state.activeToolType, state.isDrawing, state.drawingMode, state.tools.length])

  return {
    // State (read-only access)
    tools: state.tools,
    activeToolType: state.activeToolType,
    drawingMode: state.drawingMode,
    selectedToolId: state.selectedToolId,
    selectedTool,
    isDrawing: state.isDrawing,
    defaultStyle: state.defaultStyle,
    snapToPrice: state.snapToPrice,
    snapTolerance: state.snapTolerance,
    currentDrawing: state.currentDrawing,
    lastPreviewUpdate: state.lastPreviewUpdate,

    // Drawing actions
    setToolType,
    setMode,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,

    // Tool management
    selectTool,
    updateTool,
    deleteTool,
    clearAllTools,
    duplicateTool,
    setDefaultStyle,
    toggleSnap,

    // Import/Export
    loadTools,
    exportTools,
    importTools,

    // Tool queries
    getTool,
    filterTools,
    getToolsByType,
    getVisibleTools,
    getLockedTools,

    // Batch operations
    batchUpdateTools,
    batchDeleteTools,

    // Statistics and computed properties
    getToolStatistics,
    hasTools,
    visibleTools,
    isInDrawingMode,
    isInEditingMode,
    canDraw,
    toolCount,
  }
}

// Default export for backward compatibility
export default useDrawingTools