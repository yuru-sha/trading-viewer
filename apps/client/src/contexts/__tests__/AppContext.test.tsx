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
})
