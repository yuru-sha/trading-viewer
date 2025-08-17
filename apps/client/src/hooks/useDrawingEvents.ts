import { useCallback, useRef } from 'react'
import type useDrawingTools from './useDrawingTools'
import type { useChartInstance } from './useChartInstance'
import { PriceData } from '../utils/indicators'

interface DrawingEventsConfig {
  enableDrawingTools: boolean
  data: PriceData[]
}

interface DrawingState {
  isDrawing: boolean
  isMouseDown: boolean
  isDragging: boolean
  selectedToolId: string | null
  dragStart?: { x: number; y: number; price: number; time: number }
  currentTool?: any
}

export const useDrawingEvents = (
  chartInstance: ReturnType<typeof useChartInstance>,
  drawingTools: ReturnType<typeof useDrawingTools> | undefined,
  config: DrawingEventsConfig
) => {
  const drawingStateRef = useRef<DrawingState>({
    isDrawing: false,
    isMouseDown: false,
    isDragging: false,
    selectedToolId: null,
  })

  // Handle drawing tool selection
  const handleToolSelect = useCallback(
    (toolType: string) => {
      if (!drawingTools) return

      console.log('🎨 Tool selected:', toolType)
      drawingTools.setSelectedTool?.(toolType)
      drawingStateRef.current.isDrawing = true
    },
    [drawingTools]
  )

  // Handle drawing start
  const handleDrawingStart = useCallback(
    (dataPoint: { price: number; time: number }, event: MouseEvent) => {
      if (!config.enableDrawingTools || !drawingTools || !chartInstance) {
        return
      }

      console.log('🎨 Drawing start:', dataPoint)

      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top

      drawingStateRef.current = {
        ...drawingStateRef.current,
        isDrawing: true,
        isMouseDown: true,
        dragStart: {
          x: offsetX,
          y: offsetY,
          price: dataPoint.price,
          time: dataPoint.time,
        },
      }

      // Start drawing with the selected tool
      if (drawingTools.selectedTool) {
        drawingTools.startDrawing?.(dataPoint)
      }
    },
    [chartInstance, drawingTools, config]
  )

  // Handle drawing continue/update
  const handleDrawingMove = useCallback(
    (dataPoint: { price: number; time: number }, event: MouseEvent) => {
      if (!config.enableDrawingTools || !drawingTools || !drawingStateRef.current.isDrawing) {
        return
      }

      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top

      // Update drawing preview
      if (drawingTools.isDrawingMode && drawingStateRef.current.dragStart) {
        drawingTools.updateDrawing?.(dataPoint)
      }

      // Handle tool dragging
      if (drawingStateRef.current.isDragging && drawingStateRef.current.selectedToolId) {
        const selectedTool = drawingTools.getToolById?.(drawingStateRef.current.selectedToolId)
        if (selectedTool) {
          drawingTools.updateToolPosition?.(selectedTool.id, dataPoint)
        }
      }
    },
    [drawingTools, config]
  )

  // Handle drawing end
  const handleDrawingEnd = useCallback(
    (dataPoint: { price: number; time: number }, event: MouseEvent) => {
      if (!config.enableDrawingTools || !drawingTools) {
        return
      }

      console.log('🎨 Drawing end:', dataPoint)

      if (drawingStateRef.current.isDrawing && drawingTools.isDrawingMode) {
        // Complete the drawing
        drawingTools.finishDrawing?.(dataPoint)
      }

      // Reset drawing state
      drawingStateRef.current = {
        ...drawingStateRef.current,
        isDrawing: false,
        isMouseDown: false,
        isDragging: false,
        dragStart: undefined,
      }
    },
    [drawingTools, config]
  )

  // Handle tool deletion
  const handleToolDelete = useCallback(
    (toolId: string) => {
      if (!drawingTools) return

      console.log('🎨 Deleting tool:', toolId)
      drawingTools.deleteTool?.(toolId)

      if (drawingStateRef.current.selectedToolId === toolId) {
        drawingStateRef.current.selectedToolId = null
      }
    },
    [drawingTools]
  )

  // Handle tool duplication
  const handleToolDuplicate = useCallback(
    (toolId: string) => {
      if (!drawingTools) return

      console.log('🎨 Duplicating tool:', toolId)
      const tool = drawingTools.getToolById?.(toolId)
      if (tool) {
        drawingTools.duplicateTool?.(tool)
      }
    },
    [drawingTools]
  )

  // Handle tool style changes
  const handleStyleChange = useCallback(
    (toolId: string, style: any) => {
      if (!drawingTools) return

      console.log('🎨 Changing tool style:', { toolId, style })
      drawingTools.updateToolStyle?.(toolId, style)
    },
    [drawingTools]
  )

  // Handle fibonacci level changes
  const handleFibonacciLevels = useCallback(
    (toolId: string, levels: number[]) => {
      if (!drawingTools) return

      console.log('🎨 Updating fibonacci levels:', { toolId, levels })
      drawingTools.updateFibonacciLevels?.(toolId, levels)
    },
    [drawingTools]
  )

  // Handle tool grouping
  const handleToolGrouping = useCallback(
    (toolIds: string[], groupName?: string) => {
      if (!drawingTools) return

      console.log('🎨 Grouping tools:', { toolIds, groupName })
      drawingTools.groupTools?.(toolIds, groupName)
    },
    [drawingTools]
  )

  // Handle tool ungrouping
  const handleToolUngrouping = useCallback(
    (groupId: string) => {
      if (!drawingTools) return

      console.log('🎨 Ungrouping tools:', groupId)
      drawingTools.ungroupTools?.(groupId)
    },
    [drawingTools]
  )

  // Handle tool layer changes
  const handleLayerChange = useCallback(
    (toolId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
      if (!drawingTools) return

      console.log('🎨 Changing tool layer:', { toolId, direction })
      switch (direction) {
        case 'up':
          drawingTools.moveToolUp?.(toolId)
          break
        case 'down':
          drawingTools.moveToolDown?.(toolId)
          break
        case 'top':
          drawingTools.moveToolToTop?.(toolId)
          break
        case 'bottom':
          drawingTools.moveToolToBottom?.(toolId)
          break
      }
    },
    [drawingTools]
  )

  // Handle tool visibility toggle
  const handleVisibilityToggle = useCallback(
    (toolId: string) => {
      if (!drawingTools) return

      console.log('🎨 Toggling tool visibility:', toolId)
      drawingTools.toggleToolVisibility?.(toolId)
    },
    [drawingTools]
  )

  // Handle tool locking
  const handleToolLock = useCallback(
    (toolId: string, locked: boolean) => {
      if (!drawingTools) return

      console.log('🎨 Locking/unlocking tool:', { toolId, locked })
      drawingTools.setToolLocked?.(toolId, locked)
    },
    [drawingTools]
  )

  // Handle drawing mode toggle
  const handleDrawingModeToggle = useCallback(
    (enabled: boolean) => {
      if (!drawingTools) return

      console.log('🎨 Toggling drawing mode:', enabled)
      drawingTools.setDrawingMode?.(enabled)
      drawingStateRef.current.isDrawing = enabled
    },
    [drawingTools]
  )

  // Handle clearing all tools
  const handleClearAll = useCallback(() => {
    if (!drawingTools) return

    console.log('🎨 Clearing all tools')
    drawingTools.clearAllTools?.()
    drawingStateRef.current = {
      isDrawing: false,
      isMouseDown: false,
      isDragging: false,
      selectedToolId: null,
    }
  }, [drawingTools])

  // Get current drawing state
  const getDrawingState = useCallback(() => {
    return {
      ...drawingStateRef.current,
      hasTools: drawingTools?.getVisibleTools?.()?.length > 0,
      selectedTool: drawingTools?.selectedTool,
      isDrawingMode: drawingTools?.isDrawingMode,
    }
  }, [drawingTools])

  return {
    // Core drawing events
    handleToolSelect,
    handleDrawingStart,
    handleDrawingMove,
    handleDrawingEnd,

    // Tool management
    handleToolDelete,
    handleToolDuplicate,
    handleStyleChange,
    handleFibonacciLevels,

    // Organization
    handleToolGrouping,
    handleToolUngrouping,
    handleLayerChange,
    handleVisibilityToggle,
    handleToolLock,

    // Mode control
    handleDrawingModeToggle,
    handleClearAll,

    // State access
    getDrawingState,
  }
}
