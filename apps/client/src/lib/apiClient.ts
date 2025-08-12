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

// Generic API request function
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers: defaultHeaders,
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
    endpoints: Record<string, any>
  }> => {
    return apiRequest('')
  },
}

// Drawing Tools API endpoints
export const drawingApi = {
  // Get all drawing tools for a symbol
  getDrawingTools: async (symbol: string, userId?: string): Promise<{
    data: any[]
    status: 'success' | 'error'
    message?: string
  }> => {
    const queryParams = new URLSearchParams({ symbol })
    if (userId) queryParams.append('userId', userId)
    
    return apiRequest(`/drawings/${encodeURIComponent(symbol)}?${queryParams}`)
  },

  // Create a new drawing tool
  createDrawingTool: async (data: {
    symbol: string
    tool: any
  }): Promise<{
    data: any
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
    updates: any
  ): Promise<{
    data: any
    status: 'success' | 'error'
    message?: string
  }> => {
    return apiRequest(`/drawings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    })
  },

  // Delete a drawing tool
  deleteDrawingTool: async (id: string): Promise<{
    status: 'success' | 'error'
    message?: string
  }> => {
    return apiRequest(`/drawings/${id}`, {
      method: 'DELETE',
    })
  },
}

// Export all APIs
export const api = {
  market: marketApi,
  health: healthApi,
  info: infoApi,
  drawing: drawingApi,
}

export default api
