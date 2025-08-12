import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import {
  FinnhubSymbolSearchResponse,
  FinnhubQuote,
  FinnhubCandle,
  FinnhubErrorResponse,
  NormalizedSymbol,
  NormalizedQuote,
  NormalizedCandle,
  NormalizedCandleResponse,
  SymbolSearchParams,
  CandleDataParams,
  QuoteParams,
  ApiError,
  RateLimitInfo,
} from '@trading-viewer/shared'
import { ExternalServiceError, RateLimitError, ValidationError } from '../middleware/errorHandling'

export class FinnhubService {
  private client: AxiosInstance
  private apiKey: string
  private baseURL: string
  private rateLimitInfo: RateLimitInfo

  constructor() {
    this.apiKey = process.env.FINNHUB_API_KEY!
    this.baseURL = process.env.FINNHUB_BASE_URL || 'https://finnhub.io/api/v1'

    if (!this.apiKey) {
      throw new Error('FINNHUB_API_KEY environment variable is required')
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'X-Finnhub-Token': this.apiKey,
      },
    })

    this.rateLimitInfo = {
      limit: parseInt(process.env.FINNHUB_RATE_LIMIT || '60'),
      remaining: parseInt(process.env.FINNHUB_RATE_LIMIT || '60'),
      resetTime: Date.now() + 60000, // Reset in 1 minute
    }

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(
      config => {
        if (this.rateLimitInfo.remaining <= 0 && Date.now() < this.rateLimitInfo.resetTime) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.')
        }
        return config
      },
      error => Promise.reject(error)
    )

    // Response interceptor for error handling and rate limit tracking
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Update rate limit info from headers if available
        const remaining = response.headers['x-ratelimit-remaining']
        const reset = response.headers['x-ratelimit-reset']

        if (remaining) {
          this.rateLimitInfo.remaining = parseInt(remaining)
        }
        if (reset) {
          this.rateLimitInfo.resetTime = parseInt(reset) * 1000
        }

        return response
      },
      error => {
        if (error.response?.status === 429) {
          this.rateLimitInfo.remaining = 0
          this.rateLimitInfo.resetTime = Date.now() + 60000
        }
        return Promise.reject(this.handleApiError(error))
      }
    )
  }

  private handleApiError(error: any): ApiError {
    if (error.response) {
      const status = error.response.status
      const data = error.response.data as FinnhubErrorResponse

      return {
        code: `FINNHUB_API_ERROR_${status}`,
        message: data.error || error.message || 'Unknown API error',
        statusCode: status,
      }
    } else if (error.request) {
      return {
        code: 'FINNHUB_NETWORK_ERROR',
        message: 'Network error: Unable to reach Finnhub API',
        statusCode: 503,
      }
    } else {
      return {
        code: 'FINNHUB_UNKNOWN_ERROR',
        message: error.message || 'Unknown error occurred',
        statusCode: 500,
      }
    }
  }

  async searchSymbols(params: SymbolSearchParams): Promise<NormalizedSymbol[]> {
    try {
      const response = await this.client.get<FinnhubSymbolSearchResponse>('/search', {
        params: {
          q: params.q,
          limit: params.limit || 10,
        },
      })

      return response.data.result.map(
        (symbol: any): NormalizedSymbol => ({
          symbol: symbol.symbol,
          description: symbol.description,
          displaySymbol: symbol.displaySymbol,
          type: symbol.type,
          currency: symbol.currency,
        })
      )
    } catch (error) {
      throw error
    }
  }

  async getQuote(params: QuoteParams): Promise<NormalizedQuote> {
    try {
      const response = await this.client.get<FinnhubQuote>('/quote', {
        params: {
          symbol: params.symbol,
        },
      })

      const quote = response.data

      return {
        symbol: params.symbol,
        price: quote.c,
        change: quote.d,
        changePercent: quote.dp,
        high: quote.h,
        low: quote.l,
        open: quote.o,
        previousClose: quote.pc,
        timestamp: quote.t,
      }
    } catch (error) {
      throw error
    }
  }

  async getCandleData(params: CandleDataParams): Promise<NormalizedCandleResponse> {
    try {
      const response = await this.client.get<FinnhubCandle>('/stock/candle', {
        params: {
          symbol: params.symbol,
          resolution: params.resolution,
          from: params.from,
          to: params.to,
        },
      })

      const candle = response.data

      if (candle.s === 'no_data') {
        return {
          symbol: params.symbol,
          resolution: params.resolution,
          data: [],
          status: 'error',
        }
      }

      // Convert arrays to normalized candle objects
      const data: NormalizedCandle[] = []
      for (let i = 0; i < candle.t.length; i++) {
        data.push({
          timestamp: candle.t[i],
          open: candle.o[i],
          high: candle.h[i],
          low: candle.l[i],
          close: candle.c[i],
          volume: candle.v[i],
        })
      }

      return {
        symbol: params.symbol,
        resolution: params.resolution,
        data,
        status: 'ok',
      }
    } catch (error) {
      throw error
    }
  }

  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo }
  }

  // Helper method to check if we can make requests
  canMakeRequest(): boolean {
    return this.rateLimitInfo.remaining > 0 || Date.now() >= this.rateLimitInfo.resetTime
  }

  // Helper method to get time until rate limit reset
  getTimeUntilReset(): number {
    return Math.max(0, this.rateLimitInfo.resetTime - Date.now())
  }
}

// Export singleton instance - create only when needed to avoid issues with tests
let _finnhubService: FinnhubService | null = null

export const getFinnhubService = (): FinnhubService => {
  if (!_finnhubService) {
    _finnhubService = new FinnhubService()
  }
  return _finnhubService
}

// For testing purposes
export const resetFinnhubService = (): void => {
  _finnhubService = null
}
