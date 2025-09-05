import { useCallback } from 'react'
import useDrawingToolsWithServerPersistence from '@/presentation/hooks/drawing/useDrawingToolsWithServerPersistence'
import { log } from '@/infrastructure/services/LoggerService'

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
    autoSave,
    autoSaveInterval,
    ...(timeframe && { timeframe }),
  })

  // Handle drawing tool context menu actions
  const changeDrawingToolColor = useCallback(
    (toolId: string, color: string) => {
      log.business.debug('🎯 Changing drawing tool color:', toolId, color)
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
      log.business.debug('🎯 Toggling drawing tool visibility:', toolId)
      const tool = drawingTools.getTool(toolId)
      if (tool) {
        drawingTools.updateTool(toolId, { visible: !(tool.visible ?? true) })
      }
    },
    [drawingTools]
  )

  const deleteDrawingTool = useCallback(
    (toolId: string) => {
      log.business.debug('🎯 Deleting drawing tool:', toolId)
      drawingTools.deleteTool(toolId)
      drawingTools.hideContextMenu()
    },
    [drawingTools]
  )

  const duplicateDrawingTool = useCallback(
    (toolId: string) => {
      log.business.info('🎯 duplicateDrawingTool called in manager', { toolId })
      try {
        const result = drawingTools.duplicateTool(toolId)
        log.business.info('🎯 duplicateTool result', { toolId, result })
        drawingTools.hideContextMenu()
      } catch (error) {
        log.business.error('🎯 Error duplicating drawing tool', error, { toolId })
      }
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
