import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useDrawingPersistence } from '../useDrawingPersistence'
import type { DrawingTool } from '@trading-viewer/shared'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe.skip('useDrawingPersistence', () => {
  const createMockTool = (id: string): DrawingTool => ({
    id,
    type: 'trendline',
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

  let mockLoadTools: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorageMock.clear()
    mockLoadTools = vi.fn()
    vi.clearAllMocks()
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Storage key generation', () => {
    it('should generate correct storage key with symbol and timeframe', () => {
      const tools: DrawingTool[] = []
      const { result } = renderHook(() =>
        useDrawingPersistence(tools, mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      const key = result.current.getStorageKey()
      expect(key).toBe('trading-viewer-drawings-AAPL-1H')
    })

    it('should use default values when symbol/timeframe not provided', () => {
      const tools: DrawingTool[] = []
      const { result } = renderHook(() => useDrawingPersistence(tools, mockLoadTools))

      const key = result.current.getStorageKey()
      expect(key).toBe('trading-viewer-drawings-default-1D')
    })

    it('should allow override of symbol and timeframe in getStorageKey', () => {
      const tools: DrawingTool[] = []
      const { result } = renderHook(() =>
        useDrawingPersistence(tools, mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      const key = result.current.getStorageKey('MSFT', '4H')
      expect(key).toBe('trading-viewer-drawings-MSFT-4H')
    })
  })

  describe('Save functionality', () => {
    it('should save tools to localStorage', () => {
      const tools = [createMockTool('tool-1'), createMockTool('tool-2')]
      const { result } = renderHook(() =>
        useDrawingPersistence(tools, mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      act(() => {
        const success = result.current.saveToLocalStorage()
        expect(success).toBe(true)
      })

      const stored = localStorage.getItem('trading-viewer-drawings-AAPL-1H')
      expect(stored).toBeTruthy()

      const data = JSON.parse(stored!)
      expect(data.version).toBe('1.0')
      expect(data.symbol).toBe('AAPL')
      expect(data.timeframe).toBe('1H')
      expect(data.tools).toHaveLength(2)
      expect(data.tools[0].id).toBe('tool-1')
      expect(data.timestamp).toBeGreaterThan(0)
    })

    it('should save to custom symbol and timeframe', () => {
      const tools = [createMockTool('tool-1')]
      const { result } = renderHook(() =>
        useDrawingPersistence(tools, mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      act(() => {
        const success = result.current.saveToLocalStorage('MSFT', '4H')
        expect(success).toBe(true)
      })

      const stored = localStorage.getItem('trading-viewer-drawings-MSFT-4H')
      expect(stored).toBeTruthy()

      const data = JSON.parse(stored!)
      expect(data.symbol).toBe('MSFT')
      expect(data.timeframe).toBe('4H')
    })

    it('should handle localStorage errors gracefully', () => {
      const tools = [createMockTool('tool-1')]
      const { result } = renderHook(() =>
        useDrawingPersistence(tools, mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      // Mock localStorage.setItem to throw new Error("Operation failed")
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      act(() => {
        const success = result.current.saveToLocalStorage()
        expect(success).toBe(false)
      })

      expect(console.error).toHaveBeenCalledWith(
        'Failed to save drawing tools to localStorage:',
        expect.any(Error)
      )
    })
  })

  describe('Load functionality', () => {
    it('should load tools from localStorage', () => {
      const tools = [createMockTool('tool-1'), createMockTool('tool-2')]

      // Pre-populate localStorage
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        symbol: 'AAPL',
        timeframe: '1H',
        tools,
      }
      localStorage.setItem('trading-viewer-drawings-AAPL-1H', JSON.stringify(data))

      const { result } = renderHook(() =>
        useDrawingPersistence([], mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      act(() => {
        const loadedTools = result.current.loadFromLocalStorage()
        expect(loadedTools).toHaveLength(2)
        expect(loadedTools[0].id).toBe('tool-1')
        expect(loadedTools[1].id).toBe('tool-2')
      })
    })

    it('should return empty array when no data exists', () => {
      const { result } = renderHook(() =>
        useDrawingPersistence([], mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      act(() => {
        const loadedTools = result.current.loadFromLocalStorage()
        expect(loadedTools).toEqual([])
      })
    })

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('trading-viewer-drawings-AAPL-1H', 'invalid-json')

      const { result } = renderHook(() =>
        useDrawingPersistence([], mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      act(() => {
        const loadedTools = result.current.loadFromLocalStorage()
        expect(loadedTools).toEqual([])
      })

      expect(console.error).toHaveBeenCalledWith(
        'Failed to load drawing tools from localStorage:',
        expect.any(Error)
      )
    })

    it('should handle invalid data structure', () => {
      const invalidData = {
        version: '1.0',
        symbol: 'AAPL',
        timeframe: '1H',
        // Missing tools array
      }
      localStorage.setItem('trading-viewer-drawings-AAPL-1H', JSON.stringify(invalidData))

      const { result } = renderHook(() =>
        useDrawingPersistence([], mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      act(() => {
        const loadedTools = result.current.loadFromLocalStorage()
        expect(loadedTools).toEqual([])
      })

      expect(console.warn).toHaveBeenCalledWith('Invalid drawing data format in localStorage')
    })
  })

  describe('Auto-save functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should auto-save tools after interval', () => {
      const tools = [createMockTool('tool-1')]

      renderHook(() =>
        useDrawingPersistence(tools, mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
          autoSave: true,
          autoSaveInterval: 1000,
        })
      )

      expect(localStorage.getItem('trading-viewer-drawings-AAPL-1H')).toBeNull()

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(localStorage.getItem('trading-viewer-drawings-AAPL-1H')).toBeTruthy()
    })

    it('should not auto-save when autoSave is disabled', () => {
      const tools = [createMockTool('tool-1')]

      renderHook(() =>
        useDrawingPersistence(tools, mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
          autoSave: false,
        })
      )

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(localStorage.getItem('trading-viewer-drawings-AAPL-1H')).toBeNull()
    })

    it('should not auto-save when tools array is empty', () => {
      const tools: DrawingTool[] = []

      renderHook(() =>
        useDrawingPersistence(tools, mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
          autoSave: true,
        })
      )

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(localStorage.getItem('trading-viewer-drawings-AAPL-1H')).toBeNull()
    })
  })

  describe('Auto-restore functionality', () => {
    it('should auto-restore tools on mount when data exists', () => {
      const tools = [createMockTool('tool-1')]

      // Pre-populate localStorage
      const data = {
        version: '1.0',
        timestamp: Date.now(),
        symbol: 'AAPL',
        timeframe: '1H',
        tools,
      }
      localStorage.setItem('trading-viewer-drawings-AAPL-1H', JSON.stringify(data))

      renderHook(() =>
        useDrawingPersistence([], mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      expect(mockLoadTools).toHaveBeenCalledWith(tools)
    })

    it('should not auto-restore when no symbol provided', () => {
      renderHook(() =>
        useDrawingPersistence([], mockLoadTools, {
          timeframe: '1H',
        })
      )

      expect(mockLoadTools).not.toHaveBeenCalled()
    })
  })

  describe('Symbol and timeframe switching', () => {
    it('should restore tools for new symbol and timeframe', () => {
      const toolsAAPL = [createMockTool('aapl-tool')]
      const toolsMSFT = [createMockTool('msft-tool')]

      // Pre-populate localStorage for both symbols
      localStorage.setItem(
        'trading-viewer-drawings-AAPL-1H',
        JSON.stringify({
          version: '1.0',
          timestamp: Date.now(),
          symbol: 'AAPL',
          timeframe: '1H',
          tools: toolsAAPL,
        })
      )

      localStorage.setItem(
        'trading-viewer-drawings-MSFT-1H',
        JSON.stringify({
          version: '1.0',
          timestamp: Date.now(),
          symbol: 'MSFT',
          timeframe: '1H',
          tools: toolsMSFT,
        })
      )

      const { result } = renderHook(() =>
        useDrawingPersistence([], mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      act(() => {
        result.current.restoreForSymbolAndTimeframe('MSFT', '1H')
      })

      expect(mockLoadTools).toHaveBeenLastCalledWith(toolsMSFT)
    })

    it('should clear tools when switching to symbol with no saved data', () => {
      const { result } = renderHook(() =>
        useDrawingPersistence([], mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      act(() => {
        result.current.restoreForSymbolAndTimeframe('EMPTY', '1H')
      })

      expect(mockLoadTools).toHaveBeenCalledWith([])
    })
  })

  describe('Management operations', () => {
    it('should get saved combinations', () => {
      // Pre-populate localStorage with multiple combinations
      localStorage.setItem(
        'trading-viewer-drawings-AAPL-1H',
        JSON.stringify({
          version: '1.0',
          timestamp: Date.now(),
          symbol: 'AAPL',
          timeframe: '1H',
          tools: [],
        })
      )

      localStorage.setItem(
        'trading-viewer-drawings-MSFT-4H',
        JSON.stringify({
          version: '1.0',
          timestamp: Date.now(),
          symbol: 'MSFT',
          timeframe: '4H',
          tools: [],
        })
      )

      localStorage.setItem(
        'trading-viewer-drawings-AAPL-1D',
        JSON.stringify({
          version: '1.0',
          timestamp: Date.now(),
          symbol: 'AAPL',
          timeframe: '1D',
          tools: [],
        })
      )

      // Add non-drawing-tools item to verify filtering
      localStorage.setItem('other-data', 'should-be-ignored')

      const { result } = renderHook(() =>
        useDrawingPersistence([], mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      act(() => {
        const combinations = result.current.getSavedCombinations()
        expect(combinations).toHaveLength(3)
        expect(combinations).toEqual([
          { symbol: 'AAPL', timeframe: '1D' },
          { symbol: 'AAPL', timeframe: '1H' },
          { symbol: 'MSFT', timeframe: '4H' },
        ])
      })
    })

    it('should delete saved data', () => {
      localStorage.setItem(
        'trading-viewer-drawings-AAPL-1H',
        JSON.stringify({
          version: '1.0',
          timestamp: Date.now(),
          symbol: 'AAPL',
          timeframe: '1H',
          tools: [],
        })
      )

      const { result } = renderHook(() =>
        useDrawingPersistence([], mockLoadTools, {
          symbol: 'AAPL',
          timeframe: '1H',
        })
      )

      expect(localStorage.getItem('trading-viewer-drawings-AAPL-1H')).toBeTruthy()

      act(() => {
        const success = result.current.deleteSavedData('AAPL', '1H')
        expect(success).toBe(true)
      })

      expect(localStorage.getItem('trading-viewer-drawings-AAPL-1H')).toBeNull()
    })

    it('should get storage statistics', () => {
      const toolsAAPL = [createMockTool('aapl-1'), createMockTool('aapl-2')]
      const toolsMSFT = [createMockTool('msft-1')]

      localStorage.setItem(
        'trading-viewer-drawings-AAPL-1H',
        JSON.stringify({
          version: '1.0',
          timestamp: Date.now(),
          symbol: 'AAPL',
          timeframe: '1H',
          tools: toolsAAPL,
        })
      )

      localStorage.setItem(
        'trading-viewer-drawings-MSFT-1H',
        JSON.stringify({
          version: '1.0',
          timestamp: Date.now(),
          symbol: 'MSFT',
          timeframe: '1H',
          tools: toolsMSFT,
        })
      )

      const { result } = renderHook(() => useDrawingPersistence([], mockLoadTools))

      act(() => {
        const stats = result.current.getStorageStatistics()
        expect(stats.combinationCount).toBe(2)
        expect(stats.totalTools).toBe(3)
        expect(stats.totalSizeBytes).toBeGreaterThan(0)
        expect(stats.combinations).toHaveLength(2)
      })
    })
  })
})
