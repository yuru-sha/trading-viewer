import {
  SaveChartRequest,
  GetChartsRequest,
  SavedChart,
  GetChartsResponse,
  SaveChartResponse,
  UpdateChartRequest,
  UpdateChartResponse,
} from '@shared'

// Type definitions
interface NormalizedSymbol {
  description: string
  displaySymbol: string
  symbol: string
  type: string
}

interface NormalizedQuote {
  c: number // Current price
  d: number // Change
  dp: number // Percent change
  h: number // High price
  l: number // Low price
  o: number // Open price
  pc: number // Previous close price
  t: number // Timestamp
}

interface NormalizedCandleResponse {
  c: number[] // Close prices
  h: number[] // High prices
  l: number[] // Low prices
  o: number[] // Open prices
  s: string // Status
  t: number[] // Timestamps
  v: number[] // Volume
}

// API Configuration
const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000/api'
    : 'http://localhost:8000/api'

// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// CSRF token management
let csrfToken: string | null = null

// Get CSRF token
async function getCSRFToken(): Promise<string> {
  if (!csrfToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        csrfToken = data.data?.csrfToken
      }
    } catch {
      console.warn('Operation failed')
    }
  }
  return csrfToken || ''
}

// Clear CSRF token (on logout or token expiry)
export function clearCSRFToken(): void {
  csrfToken = null
}

// Auth error callback - will be set by AuthContext
let onAuthError: (() => void) | null = null

// Function to set auth error callback
export function setAuthErrorCallback(callback: () => void): void {
  onAuthError = callback
}

// Generic API request function
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  // Note: Authentication is handled via httpOnly cookies (credentials: 'include')
  // No manual Authorization header needed

  // Add CSRF token for state-changing operations
  if (options.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method.toUpperCase())) {
    const token = await getCSRFToken()
    if (token) {
      defaultHeaders['X-CSRF-Token'] = token
    }
  }

  const response = await fetch(url, {
    ...options,
    headers: defaultHeaders,
    credentials: 'include', // Include cookies for authentication
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    let errorCode = `HTTP_${response.status}`

    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
      errorCode = errorData.code || errorCode
    } catch {
      // If response is not JSON, use default error message
    }

    // Clear CSRF token on authentication/authorization errors
    if (response.status === 401 || response.status === 403) {
      clearCSRFToken()
      // Trigger auth error callback if available
      if (onAuthError) {
        console.log('🔒 Authentication error detected, triggering auth callback')
        onAuthError()
      }
    }

    throw new ApiError(errorMessage, response.status, errorCode)
  }

  return response.json()
}

// Market API endpoints
export const marketApi = {
  // Search symbols
  searchSymbols: async (params: {
    q: string
    limit?: number
  }): Promise<{
    symbols: NormalizedSymbol[]
    query: string
    count: number
  }> => {
    const queryParams = new URLSearchParams({
      q: params.q,
      ...(params.limit && { limit: params.limit.toString() }),
    })

    return apiRequest(`/market/search?${queryParams}`)
  },

  // Get quote for symbol
  getQuote: async (symbol: string): Promise<NormalizedQuote> => {
    return apiRequest(`/market/quote/${encodeURIComponent(symbol)}`)
  },

  // Get candle data
  getCandleData: async (params: {
    symbol: string
    resolution: string
    from: number
    to: number
  }): Promise<NormalizedCandleResponse> => {
    const queryParams = new URLSearchParams({
      resolution: params.resolution,
      from: params.from.toString(),
      to: params.to.toString(),
    })

    return apiRequest(`/market/candles/${encodeURIComponent(params.symbol)}?${queryParams}`)
  },

  // Get rate limit info
  getRateLimit: async (): Promise<{
    limit: number
    remaining: number
    resetTime: number
    canMakeRequest: boolean
    timeUntilReset: number
  }> => {
    return apiRequest('/market/rate-limit')
  },

  // Get data source info
  getDataSource: async (): Promise<{
    isMockData: boolean
    provider: string
    status: string
    description: string
  }> => {
    return apiRequest('/market/data-source')
  },
}

// Health check endpoint
export const healthApi = {
  check: async (): Promise<{
    status: string
    database: string
    timestamp: string
  }> => {
    // Use relative path to leverage Vite proxy
    const response = await fetch('/health')
    if (!response.ok) {
      throw new ApiError('Health check failed', response.status)
    }
    return response.json()
  },
}

// API info endpoint
export const infoApi = {
  getInfo: async (): Promise<{
    name: string
    version: string
    timestamp: string
    endpoints: Record<string, unknown>
  }> => {
    return apiRequest('')
  },
}

// Watchlist API endpoints
export const watchlistApi = {
  // Get user's watchlist
  get: async (): Promise<{
    success: boolean
    data: {
      watchlist: Array<{
        id: string
        symbol: string
        name: string
        position: number
        createdAt: string
        updatedAt: string
      }>
    }
  }> => {
    return apiRequest('/watchlist')
  },

  // Add symbol to watchlist
  add: async (
    symbol: string,
    name: string
  ): Promise<{
    success: boolean
    data: unknown
  }> => {
    return apiRequest('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ symbol, name }),
    })
  },

  // Remove symbol from watchlist
  remove: async (symbol: string): Promise<void> => {
    return apiRequest(`/watchlist/${encodeURIComponent(symbol)}`, {
      method: 'DELETE',
    })
  },

  // Update watchlist positions
  updatePositions: async (
    items: Array<{ symbol: string; position: number }>
  ): Promise<{
    success: boolean
    message: string
  }> => {
    return apiRequest('/watchlist/positions', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    })
  },
}

// Drawing Tools API endpoints
export const drawingApi = {
  // Get all drawing tools for a symbol and timeframe
  getDrawingTools: async (
    symbol: string,
    timeframe?: string
  ): Promise<{
    data: unknown[]
    status: 'success' | 'error'
    message?: string
  }> => {
    const queryParams = new URLSearchParams({ symbol })
    if (timeframe) queryParams.append('timeframe', timeframe)

    return apiRequest(`/drawings/${encodeURIComponent(symbol)}?${queryParams}`)
  },

  // Create a new drawing tool
  createDrawingTool: async (data: {
    symbol: string
    timeframe?: string
    tool: unknown
  }): Promise<{
    data: unknown
    status: 'success' | 'error'
    message?: string
  }> => {
    return apiRequest('/drawings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update a drawing tool
  updateDrawingTool: async (
    id: string,
    updates: unknown
  ): Promise<{
    data: unknown
    status: 'success' | 'error'
    message?: string
  }> => {
    return apiRequest(`/drawings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    })
  },

  // Delete a drawing tool
  deleteDrawingTool: async (
    id: string
  ): Promise<{
    status: 'success' | 'error'
    message?: string
  }> => {
    return apiRequest(`/drawings/${id}`, {
      method: 'DELETE',
    })
  },
}

// Chart Saving API endpoints
export const chartApi = {
  // Get saved charts
  getCharts: async (params?: GetChartsRequest): Promise<GetChartsResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.symbol) queryParams.append('symbol', params.symbol)
    if (params?.timeframe) queryParams.append('timeframe', params.timeframe)
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())

    return apiRequest(`/charts?${queryParams}`)
  },

  // Get specific chart by ID
  getChart: async (id: string): Promise<{ success: boolean; data: SavedChart }> => {
    return apiRequest(`/charts/${id}`)
  },

  // Save new chart
  saveChart: async (data: SaveChartRequest): Promise<SaveChartResponse> => {
    return apiRequest('/charts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update existing chart
  updateChart: async (data: UpdateChartRequest): Promise<UpdateChartResponse> => {
    const { id, ...updateData } = data
    return apiRequest(`/charts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })
  },

  // Delete chart
  deleteChart: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`/charts/${id}`, {
      method: 'DELETE',
    })
  },

  // Set chart as default
  setAsDefault: async (
    id: string
  ): Promise<{ success: boolean; data: SavedChart; message: string }> => {
    return apiRequest(`/charts/${id}/default`, {
      method: 'PUT',
    })
  },

  // Get default chart for symbol/timeframe
  getDefaultChart: async (
    symbol: string,
    timeframe: string
  ): Promise<{ success: boolean; data: SavedChart }> => {
    return apiRequest(
      `/charts/default/${encodeURIComponent(symbol)}/${encodeURIComponent(timeframe)}`
    )
  },
}

// Generic API client for simple REST operations
export const apiClient = {
  get: async (url: string) => {
    // Remove /api prefix if it exists since apiRequest already adds it
    const cleanUrl = url.startsWith('/api') ? url.slice(4) : url
    const response = await apiRequest(cleanUrl)
    return { data: response }
  },

  post: async (url: string, data?: unknown) => {
    const cleanUrl = url.startsWith('/api') ? url.slice(4) : url
    const response = await apiRequest(cleanUrl, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    })
    return { data: response }
  },

  put: async (url: string, data?: unknown) => {
    const cleanUrl = url.startsWith('/api') ? url.slice(4) : url
    const response = await apiRequest(cleanUrl, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    })
    return { data: response }
  },

  delete: async (url: string) => {
    const cleanUrl = url.startsWith('/api') ? url.slice(4) : url
    const response = await apiRequest(cleanUrl, {
      method: 'DELETE',
    })
    return { data: response }
  },
}

// Export all APIs
export const api = {
  market: marketApi,
  health: healthApi,
  info: infoApi,
  watchlist: watchlistApi,
  drawing: drawingApi,
  drawings: drawingApi, // Alias for backward compatibility
  charts: chartApi,
}

export default api
