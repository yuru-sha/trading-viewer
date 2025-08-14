import { useState, useCallback } from 'react'

export interface ContextMenuState {
  isVisible: boolean
  x: number
  y: number
  targetToolId: string | null
}

export const useDrawingContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isVisible: false,
    x: 0,
    y: 0,
    targetToolId: null,
  })

  const showContextMenu = useCallback((toolId: string, x: number, y: number) => {
    console.log('🎯 Showing context menu for tool:', toolId, 'at position:', { x, y })
    setContextMenu({
      isVisible: true,
      x,
      y,
      targetToolId: toolId,
    })
  }, [])

  const hideContextMenu = useCallback(() => {
    console.log('🎯 Hiding context menu')
    setContextMenu({
      isVisible: false,
      x: 0,
      y: 0,
      targetToolId: null,
    })
  }, [])

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  }
}

export default useDrawingContextMenu
