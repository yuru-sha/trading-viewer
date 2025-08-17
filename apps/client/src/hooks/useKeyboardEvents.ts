import { useCallback, useEffect, useRef } from 'react'
import type useDrawingTools from './useDrawingTools'
import type { useChartInstance } from './useChartInstance'

interface KeyboardEventsConfig {
  enableDrawingTools: boolean
  enableShortcuts: boolean
}

export const useKeyboardEvents = (
  chartInstance: ReturnType<typeof useChartInstance>,
  drawingTools: ReturnType<typeof useDrawingTools> | undefined,
  config: KeyboardEventsConfig
) => {
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const isCtrlPressed = useRef(false)
  const isShiftPressed = useRef(false)
  const isAltPressed = useRef(false)

  // Handle key combinations for drawing tools
  const handleDrawingShortcuts = useCallback(
    (event: KeyboardEvent) => {
      if (!config.enableDrawingTools || !drawingTools) return

      const key = event.key.toLowerCase()
      const ctrlKey = event.ctrlKey || event.metaKey

      // Drawing tool shortcuts
      switch (key) {
        case 'l':
          if (!ctrlKey) {
            event.preventDefault()
            drawingTools.setSelectedTool?.('line')
            console.log('⌨️ Line tool selected')
          }
          break

        case 't':
          if (!ctrlKey) {
            event.preventDefault()
            drawingTools.setSelectedTool?.('trendline')
            console.log('⌨️ Trendline tool selected')
          }
          break

        case 'h':
          if (!ctrlKey) {
            event.preventDefault()
            drawingTools.setSelectedTool?.('horizontal')
            console.log('⌨️ Horizontal line tool selected')
          }
          break

        case 'v':
          if (!ctrlKey) {
            event.preventDefault()
            drawingTools.setSelectedTool?.('vertical')
            console.log('⌨️ Vertical line tool selected')
          }
          break

        case 'f':
          if (!ctrlKey) {
            event.preventDefault()
            drawingTools.setSelectedTool?.('fibonacci')
            console.log('⌨️ Fibonacci tool selected')
          }
          break

        case 'r':
          if (!ctrlKey) {
            event.preventDefault()
            drawingTools.setSelectedTool?.('rectangle')
            console.log('⌨️ Rectangle tool selected')
          }
          break

        case 'c':
          if (!ctrlKey) {
            event.preventDefault()
            drawingTools.setSelectedTool?.('circle')
            console.log('⌨️ Circle tool selected')
          }
          break

        case 'escape':
          event.preventDefault()
          drawingTools.clearSelection?.()
          drawingTools.setDrawingMode?.(false)
          console.log('⌨️ Drawing mode disabled, selection cleared')
          break

        case 'delete':
        case 'backspace':
          event.preventDefault()
          if (drawingTools.selectedToolId) {
            drawingTools.deleteTool?.(drawingTools.selectedToolId)
            console.log('⌨️ Selected tool deleted')
          }
          break
      }
    },
    [drawingTools, config]
  )

  // Handle general chart shortcuts
  const handleGeneralShortcuts = useCallback(
    (event: KeyboardEvent) => {
      if (!config.enableShortcuts) return

      const key = event.key.toLowerCase()
      const ctrlKey = event.ctrlKey || event.metaKey

      switch (key) {
        case 'z':
          if (ctrlKey && !event.shiftKey) {
            event.preventDefault()
            drawingTools?.undo?.()
            console.log('⌨️ Undo')
          } else if (ctrlKey && event.shiftKey) {
            event.preventDefault()
            drawingTools?.redo?.()
            console.log('⌨️ Redo')
          }
          break

        case 'y':
          if (ctrlKey) {
            event.preventDefault()
            drawingTools?.redo?.()
            console.log('⌨️ Redo')
          }
          break

        case 'a':
          if (ctrlKey) {
            event.preventDefault()
            drawingTools?.selectAllTools?.()
            console.log('⌨️ Select all tools')
          }
          break

        case 'd':
          if (ctrlKey) {
            event.preventDefault()
            if (drawingTools?.selectedToolId) {
              drawingTools.duplicateTool?.(drawingTools.selectedToolId)
              console.log('⌨️ Tool duplicated')
            }
          }
          break

        case 's':
          if (ctrlKey) {
            event.preventDefault()
            // Save chart state or annotations
            console.log('⌨️ Save chart state (not implemented)')
          }
          break

        case 'o':
          if (ctrlKey) {
            event.preventDefault()
            // Open chart state or annotations
            console.log('⌨️ Open chart state (not implemented)')
          }
          break

        case '+':
        case '=':
          if (ctrlKey) {
            event.preventDefault()
            // Zoom in
            chartInstance?.zoomIn?.()
            console.log('⌨️ Zoom in')
          }
          break

        case '-':
          if (ctrlKey) {
            event.preventDefault()
            // Zoom out
            chartInstance?.zoomOut?.()
            console.log('⌨️ Zoom out')
          }
          break

        case '0':
          if (ctrlKey) {
            event.preventDefault()
            // Reset zoom
            chartInstance?.resetZoom?.()
            console.log('⌨️ Reset zoom')
          }
          break
      }
    },
    [chartInstance, drawingTools, config]
  )

  // Handle arrow keys for tool manipulation
  const handleArrowKeys = useCallback(
    (event: KeyboardEvent) => {
      if (!config.enableDrawingTools || !drawingTools?.selectedToolId) return

      const key = event.key.toLowerCase()
      const step = event.shiftKey ? 10 : 1 // Shift for larger steps

      switch (key) {
        case 'arrowup':
          event.preventDefault()
          drawingTools.moveToolByPixels?.(drawingTools.selectedToolId, 0, -step)
          console.log('⌨️ Move tool up')
          break

        case 'arrowdown':
          event.preventDefault()
          drawingTools.moveToolByPixels?.(drawingTools.selectedToolId, 0, step)
          console.log('⌨️ Move tool down')
          break

        case 'arrowleft':
          event.preventDefault()
          drawingTools.moveToolByPixels?.(drawingTools.selectedToolId, -step, 0)
          console.log('⌨️ Move tool left')
          break

        case 'arrowright':
          event.preventDefault()
          drawingTools.moveToolByPixels?.(drawingTools.selectedToolId, step, 0)
          console.log('⌨️ Move tool right')
          break
      }
    },
    [drawingTools, config]
  )

  // Handle number keys for quick actions
  const handleNumberKeys = useCallback(
    (event: KeyboardEvent) => {
      if (!config.enableDrawingTools || !drawingTools) return

      const key = event.key
      const ctrlKey = event.ctrlKey || event.metaKey

      if (ctrlKey && /^[1-9]$/.test(key)) {
        event.preventDefault()
        const layerIndex = parseInt(key) - 1
        drawingTools.moveToolToLayer?.(drawingTools.selectedToolId, layerIndex)
        console.log(`⌨️ Move tool to layer ${layerIndex + 1}`)
      }
    },
    [drawingTools, config]
  )

  // Main keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Update modifier key states
      isCtrlPressed.current = event.ctrlKey || event.metaKey
      isShiftPressed.current = event.shiftKey
      isAltPressed.current = event.altKey

      // Add key to pressed keys set
      pressedKeysRef.current.add(event.key.toLowerCase())

      // Handle different types of shortcuts
      handleDrawingShortcuts(event)
      handleGeneralShortcuts(event)
      handleArrowKeys(event)
      handleNumberKeys(event)

      // Log key combination for debugging
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        const modifiers = [
          event.ctrlKey || event.metaKey ? 'Ctrl' : '',
          event.shiftKey ? 'Shift' : '',
          event.altKey ? 'Alt' : '',
        ]
          .filter(Boolean)
          .join('+')

        console.log(`⌨️ Key combination: ${modifiers}+${event.key}`)
      }
    },
    [handleDrawingShortcuts, handleGeneralShortcuts, handleArrowKeys, handleNumberKeys]
  )

  // Handle key up events
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    // Update modifier key states
    isCtrlPressed.current = event.ctrlKey || event.metaKey
    isShiftPressed.current = event.shiftKey
    isAltPressed.current = event.altKey

    // Remove key from pressed keys set
    pressedKeysRef.current.delete(event.key.toLowerCase())
  }, [])

  // Set up event listeners
  useEffect(() => {
    if (!config.enableShortcuts && !config.enableDrawingTools) return

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp, config])

  // Utility functions
  const isKeyPressed = useCallback((key: string) => {
    return pressedKeysRef.current.has(key.toLowerCase())
  }, [])

  const getModifierStates = useCallback(() => {
    return {
      ctrl: isCtrlPressed.current,
      shift: isShiftPressed.current,
      alt: isAltPressed.current,
    }
  }, [])

  const getPressedKeys = useCallback(() => {
    return Array.from(pressedKeysRef.current)
  }, [])

  return {
    // Event handlers
    handleKeyDown,
    handleKeyUp,

    // Utility functions
    isKeyPressed,
    getModifierStates,
    getPressedKeys,

    // State getters
    get isCtrlPressed() {
      return isCtrlPressed.current
    },
    get isShiftPressed() {
      return isShiftPressed.current
    },
    get isAltPressed() {
      return isAltPressed.current
    },
  }
}
