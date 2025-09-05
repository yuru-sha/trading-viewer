// Database repository types
export interface SymbolFilter {
  query?: string
  type?: string
  exchange?: string
  limit?: number
  offset?: number
}

export interface CandleFilter {
  symbol: string
  timeframe: string
  from?: number
  to?: number
  limit?: number
}

// API Contract types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: unknown
  }
  timestamp: number
  version: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}
