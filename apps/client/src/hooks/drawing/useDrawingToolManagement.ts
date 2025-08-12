import { useCallback } from 'react'
import type { DrawingTool, DrawingStyle } from '@shared'
import type { DrawingAction, DrawingState } from './useDrawingState'

/**
 * Hook for drawing tool management operations
 * Handles CRUD operations, import/export, and tool utilities
 */
export const useDrawingToolManagement = (
  state: DrawingState,
  dispatch: React.Dispatch<DrawingAction>
) => {
  // Select a specific tool
  const selectTool = useCallback((toolId: string | null) => {
    dispatch({ type: 'SELECT_TOOL', payload: toolId })
  }, [dispatch])

  // Update an existing tool
  const updateTool = useCallback((toolId: string, updates: Partial<DrawingTool>) => {
    dispatch({ type: 'UPDATE_TOOL', payload: { id: toolId, updates } })
  }, [dispatch])

  // Delete a tool
  const deleteTool = useCallback((toolId: string) => {
    dispatch({ type: 'DELETE_TOOL', payload: toolId })
  }, [dispatch])

  // Clear all tools
  const clearAllTools = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' })
  }, [dispatch])

  // Set default style for new tools
  const setDefaultStyle = useCallback((style: Partial<DrawingStyle>) => {
    dispatch({ type: 'SET_STYLE', payload: style })
  }, [dispatch])

  // Toggle price snapping
  const toggleSnap = useCallback(() => {
    dispatch({ type: 'TOGGLE_SNAP' })
  }, [dispatch])

  // Load tools from external source
  const loadTools = useCallback((tools: DrawingTool[]) => {
    dispatch({ type: 'LOAD_TOOLS', payload: tools })
  }, [dispatch])

  // Export tools as JSON
  const exportTools = useCallback(() => {
    return JSON.stringify(state.tools, null, 2)
  }, [state.tools])

  // Import tools from JSON
  const importTools = useCallback((jsonData: string) => {
    try {
      const tools = JSON.parse(jsonData) as DrawingTool[]
      dispatch({ type: 'LOAD_TOOLS', payload: tools })
      return true
    } catch (error) {
      console.error('Failed to import drawing tools:', error)
      return false
    }
  }, [dispatch])

  // Get tool by ID
  const getTool = useCallback(
    (toolId: string) => {
      return state.tools.find(tool => tool.id === toolId) || null
    },
    [state.tools]
  )

  // Get selected tool
  const selectedTool = state.selectedToolId ? getTool(state.selectedToolId) : null

  // Filter tools by criteria
  const filterTools = useCallback(
    (predicate: (tool: DrawingTool) => boolean) => {
      return state.tools.filter(predicate)
    },
    [state.tools]
  )

  // Get tools by type
  const getToolsByType = useCallback(
    (type: DrawingTool['type']) => {
      return filterTools(tool => tool.type === type)
    },
    [filterTools]
  )

  // Get visible tools
  const getVisibleTools = useCallback(() => {
    return filterTools(tool => tool.visible !== false)
  }, [filterTools])

  // Get locked tools
  const getLockedTools = useCallback(() => {
    return filterTools(tool => tool.locked === true)
  }, [filterTools])

  // Duplicate a tool
  const duplicateTool = useCallback((toolId: string) => {
    const tool = getTool(toolId)
    if (!tool) return null

    const duplicatedTool: DrawingTool = {
      ...tool,
      id: `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // Offset the duplicated tool slightly
      points: tool.points?.map(point => ({
        ...point,
        price: point.price * 1.001, // 0.1% offset
      })),
    }

    dispatch({ type: 'ADD_TOOL', payload: duplicatedTool })
    return duplicatedTool.id
  }, [getTool, dispatch])

  // Batch operations
  const batchUpdateTools = useCallback((updates: Array<{ id: string; updates: Partial<DrawingTool> }>) => {
    updates.forEach(({ id, updates }) => {
      dispatch({ type: 'UPDATE_TOOL', payload: { id, updates } })
    })
  }, [dispatch])

  const batchDeleteTools = useCallback((toolIds: string[]) => {
    toolIds.forEach(id => {
      dispatch({ type: 'DELETE_TOOL', payload: id })
    })
  }, [dispatch])

  // Tool statistics
  const getToolStatistics = useCallback(() => {
    const totalTools = state.tools.length
    const visibleTools = getVisibleTools().length
    const lockedTools = getLockedTools().length
    
    const typeDistribution = state.tools.reduce((acc, tool) => {
      acc[tool.type] = (acc[tool.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalTools,
      visibleTools,
      lockedTools,
      hiddenTools: totalTools - visibleTools,
      unlockedTools: totalTools - lockedTools,
      typeDistribution,
    }
  }, [state.tools, getVisibleTools, getLockedTools])

  return {
    // Tool management
    selectTool,
    updateTool,
    deleteTool,
    clearAllTools,
    duplicateTool,
    
    // Style management
    setDefaultStyle,
    toggleSnap,
    
    // Import/Export
    loadTools,
    exportTools,
    importTools,
    
    // Tool queries
    getTool,
    selectedTool,
    filterTools,
    getToolsByType,
    getVisibleTools,
    getLockedTools,
    
    // Batch operations
    batchUpdateTools,
    batchDeleteTools,
    
    // Statistics
    getToolStatistics,
  }
}