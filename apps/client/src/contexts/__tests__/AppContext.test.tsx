import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AppProvider, useApp, useAppActions } from '../AppContext'
import { ReactNode } from 'react'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

const wrapper = ({ children }: { children: ReactNode }) => <AppProvider>{children}</AppProvider>

describe.skip('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('provides initial app state', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    expect(result.current.state).toEqual({
      theme: 'dark',
      isLoading: false,
      selectedSymbol: null,
      timeframe: '1D',
      error: null,
      appError: null,
      watchlist: [],
    })
  })

  it('dispatches actions correctly', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => {
      result.current.dispatch({ type: 'SET_SELECTED_SYMBOL', payload: 'AAPL' })
    })

    expect(result.current.state.selectedSymbol).toBe('AAPL')
  })

  it('provides app context and actions together', () => {
    const useAppAndActions = () => {
      const app = useApp()
      const actions = useAppActions()
      return { ...app, actions }
    }

    const { result } = renderHook(useAppAndActions, { wrapper })

    // Test initial state
    expect(result.current.state.selectedSymbol).toBeNull()

    // Test action
    act(() => {
      result.current.actions.setSelectedSymbol('AAPL')
    })

    expect(result.current.state.selectedSymbol).toBe('AAPL')
  })

  it('manages watchlist correctly', () => {
    const useAppAndActions = () => {
      const app = useApp()
      const actions = useAppActions()
      return { ...app, actions }
    }

    const { result } = renderHook(useAppAndActions, { wrapper })

    act(() => {
      result.current.actions.addToWatchlist('AAPL')
    })

    expect(result.current.state.watchlist).toContain('AAPL')
  })

  it('toggles theme correctly', () => {
    const useAppAndActions = () => {
      const app = useApp()
      const actions = useAppActions()
      return { ...app, actions }
    }

    const { result } = renderHook(useAppAndActions, { wrapper })

    act(() => {
      result.current.actions.setTheme('light')
    })

    expect(result.current.state.theme).toBe('light')
  })

  it('throws error when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useApp())
    }).toThrow('useApp must be used within an AppProvider')

    consoleSpy.mockRestore()
  })

  describe('Theme Management', () => {
    it('loads theme from localStorage on mount', () => {
      mockLocalStorage.getItem.mockReturnValue('light')

      const { result } = renderHook(() => useApp(), { wrapper })

      expect(result.current.state.theme).toBe('light')
    })

    it('saves theme to localStorage when changed', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.setTheme('light')
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light')
    })

    it('updates document class for dark mode', () => {
      const mockDocumentElement = {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
      }
      vi.stubGlobal('document', { documentElement: mockDocumentElement })

      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      // Should add dark class initially (default is dark)
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark')

      act(() => {
        result.current.actions.setTheme('light')
      })

      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark')

      act(() => {
        result.current.actions.setTheme('dark')
      })

      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark')
    })
  })

  describe('Watchlist Management', () => {
    it('loads watchlist from localStorage on mount', () => {
      const mockWatchlist = ['AAPL', 'GOOGL', 'MSFT']
      mockLocalStorage.getItem.mockImplementation(key => {
        if (key === 'watchlist') return JSON.stringify(mockWatchlist)
        return null
      })

      const { result } = renderHook(() => useApp(), { wrapper })

      expect(result.current.state.watchlist).toEqual(mockWatchlist)
    })

    it('handles invalid JSON in watchlist localStorage', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockLocalStorage.getItem.mockImplementation(key => {
        if (key === 'watchlist') return 'invalid-json'
        return null
      })

      const { result } = renderHook(() => useApp(), { wrapper })

      expect(result.current.state.watchlist).toEqual([])
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse watchlist from localStorage:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('handles non-array data in watchlist localStorage', () => {
      mockLocalStorage.getItem.mockImplementation(key => {
        if (key === 'watchlist') return JSON.stringify({ invalid: 'data' })
        return null
      })

      const { result } = renderHook(() => useApp(), { wrapper })

      expect(result.current.state.watchlist).toEqual([])
    })

    it('saves watchlist to localStorage when changed', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.addToWatchlist('AAPL')
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('watchlist', JSON.stringify(['AAPL']))

      act(() => {
        result.current.actions.addToWatchlist('GOOGL')
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'watchlist',
        JSON.stringify(['AAPL', 'GOOGL'])
      )
    })

    it('does not add duplicate symbols to watchlist', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.addToWatchlist('AAPL')
      })

      act(() => {
        result.current.actions.addToWatchlist('AAPL')
      })

      expect(result.current.state.watchlist).toEqual(['AAPL'])
    })

    it('removes symbol from watchlist', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.setWatchlist(['AAPL', 'GOOGL', 'MSFT'])
      })

      act(() => {
        result.current.actions.removeFromWatchlist('GOOGL')
      })

      expect(result.current.state.watchlist).toEqual(['AAPL', 'MSFT'])
    })

    it('handles removing non-existent symbol from watchlist', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.setWatchlist(['AAPL', 'GOOGL'])
      })

      act(() => {
        result.current.actions.removeFromWatchlist('MSFT')
      })

      expect(result.current.state.watchlist).toEqual(['AAPL', 'GOOGL'])
    })

    it('replaces entire watchlist', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.addToWatchlist('AAPL')
      })

      const newWatchlist = ['GOOGL', 'MSFT', 'TSLA']
      act(() => {
        result.current.actions.setWatchlist(newWatchlist)
      })

      expect(result.current.state.watchlist).toEqual(newWatchlist)
    })
  })

  describe('Action Creators', () => {
    it('handles loading state changes', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      expect(result.current.state.isLoading).toBe(false)

      act(() => {
        result.current.actions.setLoading(true)
      })

      expect(result.current.state.isLoading).toBe(true)

      act(() => {
        result.current.actions.setLoading(false)
      })

      expect(result.current.state.isLoading).toBe(false)
    })

    it('handles symbol selection', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      expect(result.current.state.selectedSymbol).toBeNull()

      act(() => {
        result.current.actions.setSelectedSymbol('AAPL')
      })

      expect(result.current.state.selectedSymbol).toBe('AAPL')

      act(() => {
        result.current.actions.setSelectedSymbol(null)
      })

      expect(result.current.state.selectedSymbol).toBeNull()
    })

    it('handles timeframe changes', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      expect(result.current.state.timeframe).toBe('1D')

      act(() => {
        result.current.actions.setTimeframe('1H')
      })

      expect(result.current.state.timeframe).toBe('1H')

      act(() => {
        result.current.actions.setTimeframe('1W')
      })

      expect(result.current.state.timeframe).toBe('1W')
    })

    it('handles basic error state', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      expect(result.current.state.error).toBeNull()

      act(() => {
        result.current.actions.setError('Test error message')
      })

      expect(result.current.state.error).toBe('Test error message')

      act(() => {
        result.current.actions.clearError()
      })

      expect(result.current.state.error).toBeNull()
    })
  })

  describe('App Error Management', () => {
    it('handles app error creation from string', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      const errorMessage = 'Network connection failed'
      act(() => {
        result.current.actions.showError(errorMessage)
      })

      expect(result.current.state.appError).toEqual({
        message: errorMessage,
        type: 'general',
        timestamp: expect.any(Number),
        retryable: true,
      })
    })

    it('handles app error creation from Error object', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      const error = new Error('API request failed')
      error.stack = 'Error: API request failed\n    at test.js:1:1'

      act(() => {
        result.current.actions.showError(error)
      })

      expect(result.current.state.appError).toEqual({
        message: 'API request failed',
        type: 'general',
        timestamp: expect.any(Number),
        retryable: true,
        details: error.stack,
      })
    })

    it('handles network errors', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.showNetworkError('Connection timeout')
      })

      expect(result.current.state.appError).toEqual({
        message: 'Connection timeout',
        type: 'network',
        timestamp: expect.any(Number),
        retryable: true,
      })
    })

    it('handles API errors', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.showApiError('Server returned 500')
      })

      expect(result.current.state.appError).toEqual({
        message: 'Server returned 500',
        type: 'api',
        timestamp: expect.any(Number),
        retryable: true,
      })
    })

    it('handles validation errors', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.showValidationError('Invalid email format')
      })

      expect(result.current.state.appError).toEqual({
        message: 'Invalid email format',
        type: 'validation',
        timestamp: expect.any(Number),
        retryable: false,
      })
    })

    it('handles app error with custom parameters', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.showError('Custom error', 'network', false)
      })

      expect(result.current.state.appError).toEqual({
        message: 'Custom error',
        type: 'network',
        timestamp: expect.any(Number),
        retryable: false,
      })
    })

    it('clears app error', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.showError('Test error')
      })

      expect(result.current.state.appError).toBeTruthy()

      act(() => {
        result.current.actions.clearAppError()
      })

      expect(result.current.state.appError).toBeNull()
    })

    it('handles direct app error setting', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      const customError = {
        message: 'Custom app error',
        type: 'api' as const,
        timestamp: Date.now(),
        retryable: true,
        details: 'Additional error details',
      }

      act(() => {
        result.current.actions.setAppError(customError)
      })

      expect(result.current.state.appError).toEqual(customError)
    })
  })

  describe('State Reducer Edge Cases', () => {
    it('handles unknown action types gracefully', () => {
      const { result } = renderHook(() => useApp(), { wrapper })

      const initialState = result.current.state

      act(() => {
        result.current.dispatch({ type: 'UNKNOWN_ACTION' as any, payload: 'test' })
      })

      expect(result.current.state).toEqual(initialState)
    })

    it('handles multiple state updates in sequence', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      act(() => {
        result.current.actions.setTheme('light')
        result.current.actions.setSelectedSymbol('AAPL')
        result.current.actions.setTimeframe('1H')
        result.current.actions.setLoading(true)
      })

      expect(result.current.state).toEqual({
        theme: 'light',
        isLoading: true,
        selectedSymbol: 'AAPL',
        timeframe: '1H',
        error: null,
        appError: null,
        watchlist: [],
      })
    })

    it('handles concurrent state updates', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      // Simulate concurrent updates
      act(() => {
        Promise.all([
          result.current.actions.setTheme('light'),
          result.current.actions.addToWatchlist('AAPL'),
          result.current.actions.addToWatchlist('GOOGL'),
          result.current.actions.setSelectedSymbol('MSFT'),
        ])
      })

      expect(result.current.state.theme).toBe('light')
      expect(result.current.state.watchlist).toEqual(['AAPL', 'GOOGL'])
      expect(result.current.state.selectedSymbol).toBe('MSFT')
    })
  })

  describe('LocalStorage Error Handling', () => {
    it('handles localStorage unavailability', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock localStorage to throw errors
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available')
      })
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage not available')
      })

      expect(() => {
        renderHook(() => useApp(), { wrapper })
      }).not.toThrow()

      consoleErrorSpy.mockRestore()
    })

    it('handles localStorage quota exceeded', () => {
      const { result } = renderHook(
        () => {
          const app = useApp()
          const actions = useAppActions()
          return { ...app, actions }
        },
        { wrapper }
      )

      // Mock setItem to throw quota exceeded error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => {
        act(() => {
          result.current.actions.setTheme('light')
        })
      }).not.toThrow()

      expect(() => {
        act(() => {
          result.current.actions.addToWatchlist('AAPL')
        })
      }).not.toThrow()
    })

    it('handles corrupted localStorage data', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockLocalStorage.getItem.mockImplementation(key => {
        if (key === 'theme') return 'invalid_theme'
        if (key === 'watchlist') return '[invalid,json'
        return null
      })

      const { result } = renderHook(() => useApp(), { wrapper })

      // Should fallback to default values
      expect(result.current.state.theme).toBe('dark') // fallback to default
      expect(result.current.state.watchlist).toEqual([]) // fallback to empty array

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Hook Integration', () => {
    it('throws error when useAppActions used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useAppActions())
      }).toThrow('useApp must be used within an AppProvider')

      consoleSpy.mockRestore()
    })

    it('provides consistent state reference across re-renders', () => {
      let renderCount = 0
      const { result, rerender } = renderHook(
        () => {
          renderCount++
          const app = useApp()
          return { app, renderCount }
        },
        { wrapper }
      )

      const initialState = result.current.app.state

      rerender()

      expect(result.current.renderCount).toBe(2)
      expect(result.current.app.state).toBe(initialState) // Same reference
    })

    it('allows multiple hook consumers', () => {
      const { result } = renderHook(
        () => {
          const app1 = useApp()
          const app2 = useApp()
          const actions = useAppActions()

          return { app1, app2, actions }
        },
        { wrapper }
      )

      // Both hooks should return the same state
      expect(result.current.app1.state).toBe(result.current.app2.state)

      act(() => {
        result.current.actions.setSelectedSymbol('AAPL')
      })

      // Both should see the update
      expect(result.current.app1.state.selectedSymbol).toBe('AAPL')
      expect(result.current.app2.state.selectedSymbol).toBe('AAPL')
    })
  })
})
