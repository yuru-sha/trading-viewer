import { useCallback } from 'react'
import type { DrawingTool, DrawingStyle } from '@trading-viewer/shared'
import type { DrawingAction, DrawingState } from './useDrawingState'
import { log } from '../../services/logger'

/**
 * Hook for drawing tool management operations
 * Handles CRUD operations, import/export, and tool utilities
 */
export const useDrawingToolManagement = (
  state: DrawingState,
  dispatch: React.Dispatch<DrawingAction>
) => {
  // Select a specific tool
  const selectTool = useCallback(
    (toolId: string | null) => {
      log.business.info('Drawing tool selected', {
        toolId,
        previousSelection: state.selectedToolId,
      })
      dispatch({ type: 'SELECT_TOOL', payload: toolId })
    },
    [dispatch, state.selectedToolId]
  )

  // Update an existing tool
  const updateTool = useCallback(
    (toolId: string, updates: Partial<DrawingTool>) => {
      dispatch({ type: 'UPDATE_TOOL', payload: { id: toolId, updates } })
    },
    [dispatch]
  )

  // Delete a tool
  const deleteTool = useCallback(
    (toolId: string) => {
      dispatch({ type: 'DELETE_TOOL', payload: toolId })
    },
    [dispatch]
  )

  // Clear all tools
  const clearAllTools = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' })
  }, [dispatch])

  // Set default style for new tools
  const setDefaultStyle = useCallback(
    (style: Partial<DrawingStyle>) => {
      dispatch({ type: 'SET_STYLE', payload: style })
    },
    [dispatch]
  )

  // Toggle price snapping
  const toggleSnap = useCallback(() => {
    dispatch({ type: 'TOGGLE_SNAP' })
  }, [dispatch])

  // Load tools from external source
  const loadTools = useCallback(
    (tools: DrawingTool[]) => {
      dispatch({ type: 'LOAD_TOOLS', payload: tools })
    },
    [dispatch]
  )

  // Export tools as JSON
  const exportTools = useCallback(() => {
    return JSON.stringify(state.tools, null, 2)
  }, [state.tools])

  // Import tools from JSON
  const importTools = useCallback(
    (jsonData: string) => {
      try {
        const tools = JSON.parse(jsonData) as DrawingTool[]
        dispatch({ type: 'LOAD_TOOLS', payload: tools })
        return true
      } catch {
        log.business.error('Failed to import drawing tools from JSON')
        return false
      }
    },
    [dispatch]
  )

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

  // Duplicate a tool with smart offset based on tool type
  const duplicateTool = useCallback(
    (toolId: string) => {
      log.business.info('🎯 duplicateTool called', { toolId })
      const tool = getTool(toolId)
      if (!tool) {
        log.business.error('🎯 Tool not found for duplication', { toolId })
        return null
      }
      log.business.info('🎯 Tool found for duplication', { 
        toolId, 
        type: tool.type, 
        pointsCount: tool.points?.length 
      })

      // Calculate appropriate offset based on tool type and current points
      const calculateOffset = (tool: DrawingTool) => {
        const baseTimestampOffset = 5 * 60 * 1000 // 5 minutes in milliseconds
        
        // Calculate absolute price offset based on current prices
        const getAbsolutePriceOffset = (points: DrawingTool['points']) => {
          if (!points || points.length === 0) return 5 // Default $5 offset
          
          const prices = points.map(p => p.price)
          const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
          
          // Use 1% of average price as base offset, minimum $1
          const baseAbsolutePriceOffset = Math.max(avgPrice * 0.01, 1)
          
          if (points.length >= 2) {
            const priceRange = Math.max(...prices) - Math.min(...prices)
            // For multi-point tools, use larger offset: 15% of range or 2% of average price
            return Math.max(priceRange * 0.15, avgPrice * 0.02, 2)
          }
          
          return baseAbsolutePriceOffset
        }
        
        const absolutePriceOffset = getAbsolutePriceOffset(tool.points)
        
        // For tools with time ranges, calculate dynamic time offset
        if (tool.points && tool.points.length >= 2) {
          const timestamps = tool.points.map(p => p.timestamp)
          const timeRange = Math.max(...timestamps) - Math.min(...timestamps)
          const dynamicTimeOffset = Math.max(timeRange * 0.15, baseTimestampOffset) // 15% of range or base offset
          
          return { priceOffset: absolutePriceOffset, timestampOffset: dynamicTimeOffset }
        }
        
        return { priceOffset: absolutePriceOffset, timestampOffset: baseTimestampOffset }
      }

      const { priceOffset, timestampOffset } = calculateOffset(tool)

      // Apply different offset strategies based on tool type
      const createOffsetPoints = (points: DrawingTool['points']) => {
        if (!points || points.length === 0) return points

        switch (tool.type) {
          case 'horizontal':
            // Horizontal lines: only offset price (Y-axis) with absolute value
            return points.map(point => ({
              ...point,
              price: point.price + priceOffset, // Use absolute offset
            }))
          
          case 'vertical':
            // Vertical lines: only offset timestamp (X-axis)  
            return points.map(point => ({
              ...point,
              timestamp: point.timestamp + timestampOffset,
            }))
          
          case 'trendline':
          case 'fibonacci':
          default:
            // Two-point tools: offset both axes to create diagonal displacement
            return points.map(point => ({
              ...point,
              price: point.price + priceOffset, // Use absolute offset
              timestamp: point.timestamp + timestampOffset,
            }))
        }
      }

      const duplicatedTool: DrawingTool = {
        ...tool,
        id: `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        points: createOffsetPoints(tool.points),
      }

      log.business.info('Drawing tool duplicated with smart offset', {
        originalId: toolId,
        duplicatedId: duplicatedTool.id,
        toolType: tool.type,
        offsetStrategy: {
          priceOffset,
          timestampOffset,
          pointCount: tool.points?.length || 0,
        }
      })

      dispatch({ type: 'ADD_TOOL', payload: duplicatedTool })
      return duplicatedTool.id
    },
    [getTool, dispatch]
  )

  // Batch operations
  const batchUpdateTools = useCallback(
    (updates: Array<{ id: string; updates: Partial<DrawingTool> }>) => {
      updates.forEach(({ id, updates }) => {
        dispatch({ type: 'UPDATE_TOOL', payload: { id, updates } })
      })
    },
    [dispatch]
  )

  const batchDeleteTools = useCallback(
    (toolIds: string[]) => {
      toolIds.forEach(id => {
        dispatch({ type: 'DELETE_TOOL', payload: id })
      })
    },
    [dispatch]
  )

  // Tool statistics
  const getToolStatistics = useCallback(() => {
    const totalTools = state.tools.length
    const visibleTools = getVisibleTools().length
    const lockedTools = getLockedTools().length

    const typeDistribution = state.tools.reduce(
      (acc, tool) => {
        acc[tool.type] = (acc[tool.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

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
