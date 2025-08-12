import { TIMEFRAMES, API_TIMEOUTS } from '@trading-viewer/shared'

/**
 * API Request configuration interfaces
 */
export interface BaseApiRequest {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers: Record<string, string>
  timeout: number
  retryConfig?: RetryConfig
}

export interface RetryConfig {
  maxRetries: number
  retryDelay: number
  exponentialBackoff: boolean
  retryCondition?: (error: any) => boolean
}

export interface MarketDataRequest extends BaseApiRequest {
  symbol: string
  resolution?: string
  from?: number
  to?: number
  useCache?: boolean
}

export interface SearchRequest extends BaseApiRequest {
  query: string
  limit?: number
  filters?: string[]
}

export interface AuthenticatedRequest extends BaseApiRequest {
  token: string
  userId?: string
}

/**
 * Abstract Request Builder
 */
export abstract class BaseRequestBuilder<T extends BaseApiRequest> {
  protected request: Partial<T>

  constructor() {
    this.request = {
      headers: {},
      timeout: API_TIMEOUTS.DEFAULT_REQUEST,
    } as Partial<T>
  }

  // Fluent interface methods
  method(method: T['method']): this {
    this.request.method = method
    return this
  }

  url(url: string): this {
    this.request.url = url
    return this
  }

  header(key: string, value: string): this {
    if (!this.request.headers) this.request.headers = {}
    this.request.headers[key] = value
    return this
  }

  headers(headers: Record<string, string>): this {
    this.request.headers = { ...this.request.headers, ...headers }
    return this
  }

  timeout(ms: number): this {
    this.request.timeout = ms
    return this
  }

  retry(config: RetryConfig): this {
    this.request.retryConfig = config
    return this
  }

  // Template method - subclasses implement validation
  abstract validate(): void

  // Build the final request
  build(): T {
    this.validate()
    return this.request as T
  }

  // Reset builder to initial state
  reset(): this {
    this.request = {
      headers: {},
      timeout: API_TIMEOUTS.DEFAULT_REQUEST,
    } as Partial<T>
    return this
  }

  // Clone current builder state
  clone(): this {
    const cloned = Object.create(Object.getPrototypeOf(this))
    cloned.request = JSON.parse(JSON.stringify(this.request))
    return cloned
  }
}

/**
 * Market Data Request Builder
 */
export class MarketDataRequestBuilder extends BaseRequestBuilder<MarketDataRequest> {
  private static readonly BASE_URL = '/api/market'

  // Market data specific methods
  symbol(symbol: string): this {
    this.request.symbol = symbol.toUpperCase()
    return this
  }

  resolution(resolution: keyof typeof TIMEFRAMES): this {
    this.request.resolution = resolution
    return this
  }

  timeRange(from: number, to: number): this {
    this.request.from = from
    this.request.to = to
    return this
  }

  lastDays(days: number): this {
    const to = Math.floor(Date.now() / 1000)
    const from = to - (days * 24 * 60 * 60)
    return this.timeRange(from, to)
  }

  lastHours(hours: number): this {
    const to = Math.floor(Date.now() / 1000)
    const from = to - (hours * 60 * 60)
    return this.timeRange(from, to)
  }

  useCache(use: boolean = true): this {
    this.request.useCache = use
    return this
  }

  // Predefined request types
  quote(): this {
    return this
      .method('GET')
      .url(`${MarketDataRequestBuilder.BASE_URL}/quote/${this.request.symbol}`)
  }

  candles(): this {
    return this
      .method('GET')
      .url(`${MarketDataRequestBuilder.BASE_URL}/candles/${this.request.symbol}`)
  }

  realTime(): this {
    return this
      .timeout(API_TIMEOUTS.LONG_POLLING)
      .header('Accept', 'application/json')
      .header('Cache-Control', 'no-cache')
  }

  validate(): void {
    if (!this.request.symbol) {
      throw new Error('Symbol is required for market data requests')
    }
    if (!this.request.url) {
      throw new Error('URL is required')
    }
    if (!this.request.method) {
      throw new Error('HTTP method is required')
    }
    if (this.request.from && this.request.to && this.request.from >= this.request.to) {
      throw new Error('Invalid time range: from must be less than to')
    }
  }
}

/**
 * Search Request Builder
 */
export class SearchRequestBuilder extends BaseRequestBuilder<SearchRequest> {
  private static readonly BASE_URL = '/api/symbols'

  query(query: string): this {
    this.request.query = query.trim()
    return this
  }

  limit(limit: number): this {
    this.request.limit = Math.min(Math.max(1, limit), 100) // Clamp between 1-100
    return this
  }

  filters(filters: string[]): this {
    this.request.filters = [...filters]
    return this
  }

  addFilter(filter: string): this {
    if (!this.request.filters) this.request.filters = []
    this.request.filters.push(filter)
    return this
  }

  // Predefined search types
  symbols(): this {
    return this
      .method('GET')
      .url(`${SearchRequestBuilder.BASE_URL}/search`)
      .header('Content-Type', 'application/json')
  }

  validate(): void {
    if (!this.request.query || this.request.query.length === 0) {
      throw new Error('Search query is required')
    }
    if (this.request.query.length < 2) {
      throw new Error('Search query must be at least 2 characters long')
    }
  }
}

/**
 * Authenticated Request Builder
 */
export class AuthenticatedRequestBuilder extends BaseRequestBuilder<AuthenticatedRequest> {
  token(token: string): this {
    this.request.token = token
    return this.header('Authorization', `Bearer ${token}`)
  }

  userId(userId: string): this {
    this.request.userId = userId
    return this
  }

  // Predefined authenticated request types
  userPreferences(): this {
    return this
      .method('GET')
      .url('/api/user/preferences')
      .header('Content-Type', 'application/json')
  }

  updatePreferences(): this {
    return this
      .method('PUT')
      .url('/api/user/preferences')
      .header('Content-Type', 'application/json')
  }

  validate(): void {
    if (!this.request.token) {
      throw new Error('Authentication token is required')
    }
    if (!this.request.url) {
      throw new Error('URL is required')
    }
    if (!this.request.method) {
      throw new Error('HTTP method is required')
    }
  }
}

/**
 * Request Builder Director - orchestrates complex request building
 */
export class RequestDirector {
  // Common request configurations
  static createStandardRequest(): BaseRequestBuilder<BaseApiRequest> {
    return new (class extends BaseRequestBuilder<BaseApiRequest> {
      validate(): void {
        if (!this.request.url) throw new Error('URL is required')
        if (!this.request.method) throw new Error('Method is required')
      }
    })()
      .header('Accept', 'application/json')
      .header('Content-Type', 'application/json')
      .timeout(API_TIMEOUTS.DEFAULT_REQUEST)
      .retry({
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
      })
  }

  // Market data with retry policy
  static createMarketDataRequest(symbol: string): MarketDataRequestBuilder {
    return new MarketDataRequestBuilder()
      .symbol(symbol)
      .header('Accept', 'application/json')
      .retry({
        maxRetries: 2,
        retryDelay: 500,
        exponentialBackoff: true,
        retryCondition: (error) => error?.status >= 500,
      })
  }

  // Search request with debouncing consideration
  static createSearchRequest(query: string): SearchRequestBuilder {
    return new SearchRequestBuilder()
      .symbols()
      .query(query)
      .limit(50)
      .timeout(API_TIMEOUTS.SEARCH_DEBOUNCE)
  }

  // Authenticated request with standard security headers
  static createAuthenticatedRequest(token: string): AuthenticatedRequestBuilder {
    return new AuthenticatedRequestBuilder()
      .token(token)
      .header('X-Requested-With', 'XMLHttpRequest')
      .timeout(API_TIMEOUTS.DEFAULT_REQUEST)
  }

  // Batch request builder for multiple operations
  static createBatchRequest(requests: BaseApiRequest[]): {
    requests: BaseApiRequest[]
    timeout: number
    maxConcurrency: number
  } {
    return {
      requests,
      timeout: Math.max(...requests.map(r => r.timeout)),
      maxConcurrency: 5,
    }
  }
}

/**
 * Builder Factory - creates appropriate builder based on request type
 */
export class RequestBuilderFactory {
  static marketData(symbol?: string): MarketDataRequestBuilder {
    const builder = new MarketDataRequestBuilder()
    if (symbol) {
      builder.symbol(symbol)
    }
    return builder
  }

  static search(query?: string): SearchRequestBuilder {
    const builder = new SearchRequestBuilder()
    if (query) {
      builder.query(query)
    }
    return builder
  }

  static authenticated(token?: string): AuthenticatedRequestBuilder {
    const builder = new AuthenticatedRequestBuilder()
    if (token) {
      builder.token(token)
    }
    return builder
  }
}

// Export convenience functions
export const buildMarketDataRequest = RequestBuilderFactory.marketData
export const buildSearchRequest = RequestBuilderFactory.search
export const buildAuthenticatedRequest = RequestBuilderFactory.authenticated

export default RequestDirector