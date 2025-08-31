import { useState, useCallback } from 'react'
import { log } from '../../services/logger'

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
    log.business.info('Showing context menu for drawing tool', {
      toolId,
      position: { x, y },
    })
    setContextMenu({
      isVisible: true,
      x,
      y,
      targetToolId: toolId,
    })
  }, [])

  const hideContextMenu = useCallback(() => {
    log.business.info('Hiding drawing context menu')
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
