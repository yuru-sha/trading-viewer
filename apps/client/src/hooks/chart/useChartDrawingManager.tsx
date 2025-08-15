import { useCallback } from 'react'
import useDrawingToolsWithServerPersistence from '../drawing/useDrawingToolsWithServerPersistence'

interface UseChartDrawingManagerProps {
  symbol: string
  timeframe?: string
  autoSave?: boolean
  autoSaveInterval?: number
}

export const useChartDrawingManager = ({
  symbol,
  timeframe,
  autoSave = true,
  autoSaveInterval = 1000,
}: UseChartDrawingManagerProps) => {
  const drawingTools = useDrawingToolsWithServerPersistence({
    symbol,
    timeframe,
    autoSave,
    autoSaveInterval,
  })

  // Handle drawing tool context menu actions
  const changeDrawingToolColor = useCallback(
    (toolId: string, color: string) => {
      console.log('🎯 Changing drawing tool color:', toolId, color)
      const tool = drawingTools.getTool(toolId)
      if (tool) {
        drawingTools.updateTool(toolId, {
          style: {
            ...tool.style,
            color,
          },
        })
      }
    },
    [drawingTools]
  )

  const toggleDrawingToolVisibility = useCallback(
    (toolId: string) => {
      console.log('🎯 Toggling drawing tool visibility:', toolId)
      const tool = drawingTools.getTool(toolId)
      if (tool) {
        drawingTools.updateTool(toolId, { visible: !(tool.visible ?? true) })
      }
    },
    [drawingTools]
  )

  const deleteDrawingTool = useCallback(
    (toolId: string) => {
      console.log('🎯 Deleting drawing tool:', toolId)
      drawingTools.deleteTool(toolId)
      drawingTools.hideContextMenu()
    },
    [drawingTools]
  )

  const duplicateDrawingTool = useCallback(
    (toolId: string) => {
      console.log('🎯 Duplicating drawing tool:', toolId)
      drawingTools.duplicateTool(toolId)
      drawingTools.hideContextMenu()
    },
    [drawingTools]
  )

  // Convert drawing tools to objects format for the toolbar
  const getDrawingObjects = useCallback(() => {
    return drawingTools.tools.map(tool => ({
      id: tool.id,
      name: `${tool.type.charAt(0).toUpperCase() + tool.type.slice(1)} ${tool.id.slice(-4)}`,
      type: tool.type,
      visible: tool.visible ?? true,
      color: tool.style?.color || '#3b82f6',
      createdAt: tool.createdAt || Date.now(),
    }))
  }, [drawingTools.tools])

  return {
    // Drawing tools state and actions
    drawingTools,

    // Helper functions
    getDrawingObjects,

    // Context menu actions
    changeDrawingToolColor,
    toggleDrawingToolVisibility,
    deleteDrawingTool,
    duplicateDrawingTool,
  }
}
