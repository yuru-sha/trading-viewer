import { renderHook, act } from '@testing-library/react'
import { useDrawingState } from '../useDrawingState'
import type { DrawingTool, DrawingToolType } from '@trading-viewer/shared'

describe('useDrawingState', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useDrawingState())

    expect(result.current.state.tools).toEqual([])
    expect(result.current.state.activeToolType).toBeNull()
    expect(result.current.state.drawingMode).toBe('drawing')
    expect(result.current.state.selectedToolId).toBeNull()
    expect(result.current.state.isDrawing).toBe(false)
    expect(result.current.state.snapToPrice).toBe(true)
    expect(result.current.state.isDragging).toBe(false)
    expect(result.current.state.isMouseDown).toBe(false)
    expect(result.current.state.dragState).toBeNull()
  })

  it('should have correct computed properties for initial state', () => {
    const { result } = renderHook(() => useDrawingState())

    expect(result.current.hasTools).toBe(false)
    expect(result.current.visibleTools).toEqual([])
    expect(result.current.isInDrawingMode).toBe(true)
    expect(result.current.isInEditingMode).toBe(false)
    expect(result.current.canDraw).toBe(false)
    expect(result.current.toolCount).toBe(0)
  })

  describe('SET_TOOL_TYPE action', () => {
    it('should set active tool type and switch to drawing mode', () => {
      const { result } = renderHook(() => useDrawingState())

      act(() => {
        result.current.dispatch({
          type: 'SET_TOOL_TYPE',
          payload: 'trendline' as DrawingToolType,
        })
      })

      expect(result.current.state.activeToolType).toBe('trendline')
      expect(result.current.state.drawingMode).toBe('drawing')
      expect(result.current.state.selectedToolId).toBeNull()
      expect(result.current.canDraw).toBe(true)
    })

    it('should clear active tool type and switch to editing mode when null', () => {
      const { result } = renderHook(() => useDrawingState())

      act(() => {
        result.current.dispatch({
          type: 'SET_TOOL_TYPE',
          payload: 'trendline' as DrawingToolType,
        })
      })

      act(() => {
        result.current.dispatch({
          type: 'SET_TOOL_TYPE',
          payload: null,
        })
      })

      expect(result.current.state.activeToolType).toBeNull()
      expect(result.current.state.drawingMode).toBe('editing')
      expect(result.current.canDraw).toBe(false)
    })
  })

  describe('SET_MODE action', () => {
    it('should set drawing mode and clear active tool type when not in drawing mode', () => {
      const { result } = renderHook(() => useDrawingState())

      act(() => {
        result.current.dispatch({
          type: 'SET_TOOL_TYPE',
          payload: 'trendline' as DrawingToolType,
        })
      })

      act(() => {
        result.current.dispatch({
          type: 'SET_MODE',
          payload: 'editing',
        })
      })

      expect(result.current.state.drawingMode).toBe('editing')
      expect(result.current.state.activeToolType).toBeNull()
      expect(result.current.isInEditingMode).toBe(true)
    })

    it('should preserve active tool type when switching to drawing mode', () => {
      const { result } = renderHook(() => useDrawingState())

      // Start with a tool selected
      act(() => {
        result.current.dispatch({
          type: 'SET_TOOL_TYPE',
          payload: 'trendline' as DrawingToolType,
        })
      })

      // Switch to editing mode (clears activeToolType)
      act(() => {
        result.current.dispatch({
          type: 'SET_MODE',
          payload: 'editing',
        })
      })

      // Set a new tool type and switch back to drawing mode
      act(() => {
        result.current.dispatch({
          type: 'SET_TOOL_TYPE',
          payload: 'horizontal' as DrawingToolType,
        })
      })

      act(() => {
        result.current.dispatch({
          type: 'SET_MODE',
          payload: 'drawing',
        })
      })

      expect(result.current.state.drawingMode).toBe('drawing')
      expect(result.current.state.activeToolType).toBe('horizontal')
    })
  })

  describe('Drawing workflow', () => {
    it('should handle complete drawing workflow', () => {
      const { result } = renderHook(() => useDrawingState())

      const mockTool: Partial<DrawingTool> = {
        id: 'test-tool-1',
        type: 'trendline',
        points: [
          { timestamp: 1000, price: 100 },
          { timestamp: 2000, price: 200 },
        ],
      }

      // Start drawing
      act(() => {
        result.current.dispatch({
          type: 'START_DRAWING',
          payload: mockTool,
        })
      })

      expect(result.current.state.isDrawing).toBe(true)
      expect(result.current.state.currentDrawing).toEqual(mockTool)

      // Update preview
      const updatedTool = {
        ...mockTool,
        points: [...mockTool.points!, { timestamp: 3000, price: 300 }],
      }
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_PREVIEW',
          payload: updatedTool,
        })
      })

      expect(result.current.state.currentDrawing).toEqual(updatedTool)
      expect(result.current.state.lastPreviewUpdate).toBeGreaterThan(0)

      // Stop drawing
      act(() => {
        result.current.dispatch({
          type: 'STOP_DRAWING',
        })
      })

      expect(result.current.state.isDrawing).toBe(false)
      expect(result.current.state.currentDrawing).toBeNull()
    })
  })

  describe('Tool management', () => {
    const createMockTool = (id: string, type: DrawingToolType = 'trendline'): DrawingTool => ({
      id,
      type,
      points: [
        { timestamp: 1000, price: 100 },
        { timestamp: 2000, price: 200 },
      ],
      style: {
        color: '#2563eb',
        thickness: 2,
        opacity: 1,
        dashPattern: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      visible: true,
    })

    it('should add tool to tools array', () => {
      const { result } = renderHook(() => useDrawingState())
      const tool = createMockTool('test-tool-1')

      act(() => {
        result.current.dispatch({
          type: 'ADD_TOOL',
          payload: tool,
        })
      })

      expect(result.current.state.tools).toHaveLength(1)
      expect(result.current.state.tools[0]).toEqual(tool)
      expect(result.current.hasTools).toBe(true)
      expect(result.current.toolCount).toBe(1)
      expect(result.current.state.currentDrawing).toBeNull()
      expect(result.current.state.isDrawing).toBe(false)
    })

    it('should select tool by id', () => {
      const { result } = renderHook(() => useDrawingState())
      const tool = createMockTool('test-tool-1')

      act(() => {
        result.current.dispatch({
          type: 'ADD_TOOL',
          payload: tool,
        })
      })

      act(() => {
        result.current.dispatch({
          type: 'SELECT_TOOL',
          payload: 'test-tool-1',
        })
      })

      expect(result.current.state.selectedToolId).toBe('test-tool-1')
      expect(result.current.state.drawingMode).toBe('editing')
      expect(result.current.state.activeToolType).toBeNull()
    })

    it('should update tool by id', async () => {
      const { result } = renderHook(() => useDrawingState())
      const tool = createMockTool('test-tool-1')
      const originalUpdatedAt = tool.updatedAt

      act(() => {
        result.current.dispatch({
          type: 'ADD_TOOL',
          payload: tool,
        })
      })

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1))

      act(() => {
        result.current.dispatch({
          type: 'UPDATE_TOOL',
          payload: {
            id: 'test-tool-1',
            updates: {
              style: { ...tool.style, color: '#ef4444' },
            },
          },
        })
      })

      const updatedTool = result.current.state.tools.find(t => t.id === 'test-tool-1')
      expect(updatedTool?.style.color).toBe('#ef4444')
      expect(updatedTool?.updatedAt).toBeGreaterThan(originalUpdatedAt)
    })

    it('should delete tool by id', () => {
      const { result } = renderHook(() => useDrawingState())
      const tool1 = createMockTool('test-tool-1')
      const tool2 = createMockTool('test-tool-2')

      act(() => {
        result.current.dispatch({
          type: 'ADD_TOOL',
          payload: tool1,
        })
      })

      act(() => {
        result.current.dispatch({
          type: 'ADD_TOOL',
          payload: tool2,
        })
      })

      act(() => {
        result.current.dispatch({
          type: 'SELECT_TOOL',
          payload: 'test-tool-1',
        })
      })

      act(() => {
        result.current.dispatch({
          type: 'DELETE_TOOL',
          payload: 'test-tool-1',
        })
      })

      expect(result.current.state.tools).toHaveLength(1)
      expect(result.current.state.tools[0].id).toBe('test-tool-2')
      expect(result.current.state.selectedToolId).toBeNull()
    })

    it('should clear all tools', () => {
      const { result } = renderHook(() => useDrawingState())
      const tool1 = createMockTool('test-tool-1')
      const tool2 = createMockTool('test-tool-2')

      act(() => {
        result.current.dispatch({
          type: 'ADD_TOOL',
          payload: tool1,
        })
      })

      act(() => {
        result.current.dispatch({
          type: 'ADD_TOOL',
          payload: tool2,
        })
      })

      act(() => {
        result.current.dispatch({
          type: 'SELECT_TOOL',
          payload: 'test-tool-1',
        })
      })

      act(() => {
        result.current.dispatch({
          type: 'CLEAR_ALL',
        })
      })

      expect(result.current.state.tools).toHaveLength(0)
      expect(result.current.state.selectedToolId).toBeNull()
      expect(result.current.state.currentDrawing).toBeNull()
      expect(result.current.state.isDrawing).toBe(false)
    })

    it('should load tools', () => {
      const { result } = renderHook(() => useDrawingState())
      const tools = [createMockTool('test-tool-1'), createMockTool('test-tool-2')]

      act(() => {
        result.current.dispatch({
          type: 'LOAD_TOOLS',
          payload: tools,
        })
      })

      expect(result.current.state.tools).toEqual(tools)
      expect(result.current.state.selectedToolId).toBeNull()
      expect(result.current.state.currentDrawing).toBeNull()
      expect(result.current.state.isDrawing).toBe(false)
    })
  })

  describe('Style management', () => {
    it('should update default style', () => {
      const { result } = renderHook(() => useDrawingState())

      act(() => {
        result.current.dispatch({
          type: 'SET_STYLE',
          payload: {
            color: '#ef4444',
            width: 3,
          },
        })
      })

      expect(result.current.state.defaultStyle.color).toBe('#ef4444')
      expect(result.current.state.defaultStyle.width).toBe(3)
      expect(result.current.state.defaultStyle.opacity).toBe(1) // unchanged
    })

    it('should toggle snap to price', () => {
      const { result } = renderHook(() => useDrawingState())

      expect(result.current.state.snapToPrice).toBe(true)

      act(() => {
        result.current.dispatch({
          type: 'TOGGLE_SNAP',
        })
      })

      expect(result.current.state.snapToPrice).toBe(false)

      act(() => {
        result.current.dispatch({
          type: 'TOGGLE_SNAP',
        })
      })

      expect(result.current.state.snapToPrice).toBe(true)
    })
  })

  describe('Drag state management', () => {
    it('should handle mouse down action', () => {
      const { result } = renderHook(() => useDrawingState())

      act(() => {
        result.current.dispatch({
          type: 'MOUSE_DOWN',
          payload: {
            toolId: 'test-tool-1',
            handleType: 'start',
            startPos: { x: 100, y: 200 },
            originalPoints: [{ timestamp: 1000, price: 100 }],
          },
        })
      })

      expect(result.current.state.isMouseDown).toBe(true)
      expect(result.current.state.dragState).toEqual({
        toolId: 'test-tool-1',
        handleType: 'start',
        startPos: { x: 100, y: 200 },
        originalPoints: [{ timestamp: 1000, price: 100 }],
      })
    })

    it('should handle drag workflow', () => {
      const { result } = renderHook(() => useDrawingState())

      // Start drag
      act(() => {
        result.current.dispatch({
          type: 'START_DRAG',
          payload: {
            toolId: 'test-tool-1',
            handleType: 'end',
            startPos: { x: 150, y: 250 },
          },
        })
      })

      expect(result.current.state.isDragging).toBe(true)
      expect(result.current.state.isMouseDown).toBe(false)
      expect(result.current.state.dragState?.toolId).toBe('test-tool-1')
      expect(result.current.state.dragState?.handleType).toBe('end')

      // Update drag
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_DRAG',
          payload: { x: 160, y: 260 },
        })
      })

      expect(result.current.state.lastPreviewUpdate).toBeGreaterThan(0)

      // End drag
      act(() => {
        result.current.dispatch({
          type: 'END_DRAG',
        })
      })

      expect(result.current.state.isDragging).toBe(false)
      expect(result.current.state.isMouseDown).toBe(false)
      expect(result.current.state.dragState).toBeNull()
    })
  })

  describe('Visibility filtering', () => {
    it('should filter visible tools', () => {
      const { result } = renderHook(() => useDrawingState())
      const visibleTool = {
        id: 'visible-tool',
        type: 'trendline' as DrawingToolType,
        points: [{ timestamp: 1000, price: 100 }],
        style: { color: '#000', width: 1, opacity: 1, dashPattern: [] },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        visible: true,
      }

      const hiddenTool = {
        id: 'hidden-tool',
        type: 'horizontal' as DrawingToolType,
        points: [{ timestamp: 2000, price: 200 }],
        style: { color: '#000', width: 1, opacity: 1, dashPattern: [] },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        visible: false,
      }

      act(() => {
        result.current.dispatch({
          type: 'LOAD_TOOLS',
          payload: [visibleTool, hiddenTool],
        })
      })

      expect(result.current.state.tools).toHaveLength(2)
      expect(result.current.visibleTools).toHaveLength(1)
      expect(result.current.visibleTools[0].id).toBe('visible-tool')
    })
  })
})
