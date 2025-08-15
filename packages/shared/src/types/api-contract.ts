// API Contract types for client-server communication

// Normalized API response types
export interface NormalizedSymbol {
  symbol: string
  description: string
  displaySymbol: string
  type: string
  currency?: string
  exchange?: string
}

export interface NormalizedQuote {
  symbol: string
  currentPrice: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  timestamp: number
}

export interface NormalizedCandleResponse {
  symbol: string
  resolution: string
  data: Array<{
    timestamp: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
  status: 'ok' | 'error'
}

export interface ApiError {
  error: string
  message?: string
  code?: string
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

// Request interfaces
export interface SearchSymbolsRequest {
  q: string
  limit?: number
}

export interface GetQuoteRequest {
  symbol: string
}

export interface GetCandleDataRequest {
  symbol: string
  resolution: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M'
  from: number
  to: number
}

// Response interfaces
export interface SearchSymbolsResponse {
  symbols: NormalizedSymbol[]
  query: string
  count: number
}

export interface GetQuoteResponse extends NormalizedQuote {}

export interface GetCandleDataResponse extends NormalizedCandleResponse {}

export interface GetRateLimitResponse extends RateLimitInfo {
  canMakeRequest: boolean
  timeUntilReset: number
}

// API endpoint definitions
export interface ApiEndpoints {
  '/api/market/search': {
    GET: {
      query: SearchSymbolsRequest
      response: SearchSymbolsResponse | ApiError
    }
  }
  '/api/market/quote/:symbol': {
    GET: {
      params: { symbol: string }
      response: GetQuoteResponse | ApiError
    }
  }
  '/api/market/candles/:symbol': {
    GET: {
      params: { symbol: string }
      query: Omit<GetCandleDataRequest, 'symbol'>
      response: GetCandleDataResponse | ApiError
    }
  }
  '/api/market/rate-limit': {
    GET: {
      response: GetRateLimitResponse | ApiError
    }
  }
  '/health': {
    GET: {
      response: {
        status: 'ok' | 'error'
        database: 'connected' | 'disconnected'
        timestamp: string
      }
    }
  }
  '/api': {
    GET: {
      response: {
        name: string
        version: string
        timestamp: string
        endpoints: Record<string, any>
      }
    }
  }
}

// Helper types for extracting request/response types
export type ApiRequest<
  TEndpoint extends keyof ApiEndpoints,
  TMethod extends keyof ApiEndpoints[TEndpoint],
> = ApiEndpoints[TEndpoint][TMethod] extends { query: infer Q }
  ? Q
  : ApiEndpoints[TEndpoint][TMethod] extends { params: infer P }
    ? P
    : never

export type ApiResponse<
  TEndpoint extends keyof ApiEndpoints,
  TMethod extends keyof ApiEndpoints[TEndpoint],
> = ApiEndpoints[TEndpoint][TMethod] extends { response: infer R } ? R : never

// HTTP Status codes for API responses
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS]

// Error response structure
export interface StandardErrorResponse extends ApiError {
  timestamp: string
  path: string
  method: string
}
