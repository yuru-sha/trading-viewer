import React, { createContext, useContext, useReducer, ReactNode } from 'react'

// Error Types
export interface AppError {
  message: string
  type: 'network' | 'api' | 'validation' | 'general'
  timestamp: number
  details?: string
  retryable: boolean
}

// Application State Types
export interface AppState {
  theme: 'light' | 'dark'
  isLoading: boolean
  selectedSymbol: string | null
  timeframe: string
  error: string | null
  appError: AppError | null
  watchlist: string[]
  favorites: string[]
}

// Action Types
export type AppAction =
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SELECTED_SYMBOL'; payload: string | null }
  | { type: 'SET_TIMEFRAME'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_APP_ERROR'; payload: AppError | null }
  | { type: 'CLEAR_APP_ERROR' }
  | { type: 'ADD_TO_WATCHLIST'; payload: string }
  | { type: 'REMOVE_FROM_WATCHLIST'; payload: string }
  | { type: 'ADD_TO_FAVORITES'; payload: string }
  | { type: 'REMOVE_FROM_FAVORITES'; payload: string }
  | { type: 'SET_WATCHLIST'; payload: string[] }
  | { type: 'SET_FAVORITES'; payload: string[] }

// Initial State
const initialState: AppState = {
  theme: 'dark',
  isLoading: false,
  selectedSymbol: null,
  timeframe: '1D',
  error: null,
  appError: null,
  watchlist: [],
  favorites: [],
}

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_SELECTED_SYMBOL':
      return { ...state, selectedSymbol: action.payload }
    case 'SET_TIMEFRAME':
      return { ...state, timeframe: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'SET_APP_ERROR':
      return { ...state, appError: action.payload }
    case 'CLEAR_APP_ERROR':
      return { ...state, appError: null }
    case 'ADD_TO_WATCHLIST':
      return {
        ...state,
        watchlist: state.watchlist.includes(action.payload)
          ? state.watchlist
          : [...state.watchlist, action.payload],
      }
    case 'REMOVE_FROM_WATCHLIST':
      return {
        ...state,
        watchlist: state.watchlist.filter(symbol => symbol !== action.payload),
      }
    case 'ADD_TO_FAVORITES':
      return {
        ...state,
        favorites: state.favorites.includes(action.payload)
          ? state.favorites
          : [...state.favorites, action.payload],
      }
    case 'REMOVE_FROM_FAVORITES':
      return {
        ...state,
        favorites: state.favorites.filter(symbol => symbol !== action.payload),
      }
    case 'SET_WATCHLIST':
      return { ...state, watchlist: action.payload }
    case 'SET_FAVORITES':
      return { ...state, favorites: action.payload }
    default:
      return state
  }
}

// Context Types
interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

// Context
const AppContext = createContext<AppContextType | undefined>(undefined)

// Provider Component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Load theme from localStorage on mount
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      dispatch({ type: 'SET_THEME', payload: savedTheme })
    }
  }, [])

  // Save theme to localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem('theme', state.theme)

    // Update document class for Tailwind dark mode
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [state.theme])

  // Load watchlist and favorites from localStorage
  React.useEffect(() => {
    const savedWatchlist = localStorage.getItem('watchlist')
    const savedFavorites = localStorage.getItem('favorites')

    if (savedWatchlist) {
      try {
        const watchlist = JSON.parse(savedWatchlist)
        if (Array.isArray(watchlist)) {
          dispatch({ type: 'SET_WATCHLIST', payload: watchlist })
        }
      } catch (e) {
        console.error('Failed to parse watchlist from localStorage:', e)
      }
    }

    if (savedFavorites) {
      try {
        const favorites = JSON.parse(savedFavorites)
        if (Array.isArray(favorites)) {
          dispatch({ type: 'SET_FAVORITES', payload: favorites })
        }
      } catch (e) {
        console.error('Failed to parse favorites from localStorage:', e)
      }
    }
  }, [])

  // Save watchlist to localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(state.watchlist))
  }, [state.watchlist])

  // Save favorites to localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(state.favorites))
  }, [state.favorites])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

// Hook
export const useApp = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// Action Creators (helpers)
export const useAppActions = () => {
  const { dispatch } = useApp()

  const createAppError = (
    error: string | Error,
    type: AppError['type'] = 'general',
    retryable: boolean = true
  ): AppError => {
    const message = typeof error === 'string' ? error : error.message
    return {
      message,
      type,
      timestamp: Date.now(),
      details: typeof error === 'string' ? undefined : error.stack,
      retryable,
    }
  }

  return {
    setTheme: (theme: 'light' | 'dark') => dispatch({ type: 'SET_THEME', payload: theme }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setSelectedSymbol: (symbol: string | null) =>
      dispatch({ type: 'SET_SELECTED_SYMBOL', payload: symbol }),
    setTimeframe: (timeframe: string) => dispatch({ type: 'SET_TIMEFRAME', payload: timeframe }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
    setAppError: (error: AppError | null) => dispatch({ type: 'SET_APP_ERROR', payload: error }),
    clearAppError: () => dispatch({ type: 'CLEAR_APP_ERROR' }),
    showError: (
      error: string | Error,
      type: AppError['type'] = 'general',
      retryable: boolean = true
    ) => {
      dispatch({ type: 'SET_APP_ERROR', payload: createAppError(error, type, retryable) })
    },
    showNetworkError: (error: string | Error) => {
      dispatch({ type: 'SET_APP_ERROR', payload: createAppError(error, 'network', true) })
    },
    showApiError: (error: string | Error) => {
      dispatch({ type: 'SET_APP_ERROR', payload: createAppError(error, 'api', true) })
    },
    showValidationError: (error: string | Error) => {
      dispatch({ type: 'SET_APP_ERROR', payload: createAppError(error, 'validation', false) })
    },
    addToWatchlist: (symbol: string) => dispatch({ type: 'ADD_TO_WATCHLIST', payload: symbol }),
    removeFromWatchlist: (symbol: string) =>
      dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: symbol }),
    addToFavorites: (symbol: string) => dispatch({ type: 'ADD_TO_FAVORITES', payload: symbol }),
    removeFromFavorites: (symbol: string) =>
      dispatch({ type: 'REMOVE_FROM_FAVORITES', payload: symbol }),
    setWatchlist: (watchlist: string[]) => dispatch({ type: 'SET_WATCHLIST', payload: watchlist }),
    setFavorites: (favorites: string[]) => dispatch({ type: 'SET_FAVORITES', payload: favorites }),
  }
}
