/**
 * 外部市場データプロバイダーの抽象インターフェース
 * Repository パターンの外部データソース用
 */

export interface QuoteResponse {
  symbol: string
  currentPrice: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
  timestamp: number
  marketCap?: number
  currency?: string
  exchangeTimezoneName?: string
  exchangeName?: string
}

export interface HistoricalDataResponse {
  symbol: string
  candles: {
    open: number[]
    high: number[]
    low: number[]
    close: number[]
    volume: number[]
    timestamps: number[]
  }
  status: 'ok' | 'error'
}

export interface SymbolSearchResult {
  symbol: string
  shortName?: string
  longName?: string
  exchange?: string
  quoteType?: string
  typeDisp?: string
}

export interface NewsItemResponse {
  id: string
  title: string
  publisher: string
  link: string
  publishedAt: number
  type: string
  thumbnail?: {
    url: string
    width: number
    height: number
  }
  relatedTickers?: string[]
}

/**
 * 外部市場データプロバイダーインターフェース
 * 具体的な実装（Yahoo Finance, Alpha Vantage 等）に依存しない抽象化
 */
export interface IMarketDataProvider {
  /**
   * リアルタイム相場データを取得
   */
  getQuote(symbol: string): Promise<QuoteResponse>

  /**
   * 複数シンボルの相場データを一括取得
   */
  getMultipleQuotes(symbols: string[]): Promise<QuoteResponse[]>

  /**
   * 履歴データ（ローソク足）を取得
   */
  getHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
    interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo'
  ): Promise<HistoricalDataResponse>

  /**
   * シンボル検索
   */
  searchSymbols(query: string, limit?: number): Promise<SymbolSearchResult[]>

  /**
   * ニュース取得
   */
  getNews(query?: string, count?: number): Promise<NewsItemResponse[]>

  /**
   * プロバイダーのヘルスチェック
   */
  isHealthy(): Promise<boolean>

  /**
   * レート制限の状態確認
   */
  getRateLimitStatus(): Promise<{
    requestsRemaining: number
    resetTime: number
  }>
}

/**
 * プロバイダー設定インターフェース
 */
export interface MarketDataProviderConfig {
  apiKey?: string
  rateLimit?: {
    requestsPerMinute: number
    burstSize: number
  }
  cache?: {
    ttlSeconds: number
    maxEntries: number
  }
  timeout?: {
    connectTimeoutMs: number
    readTimeoutMs: number
  }
}

/**
 * プロバイダーエラー
 */
export class MarketDataProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'MarketDataProviderError'
  }
}

export class RateLimitExceededError extends MarketDataProviderError {
  constructor(provider: string, resetTime: number) {
    super(
      `Rate limit exceeded for ${provider}. Reset at ${new Date(resetTime)}`,
      'RATE_LIMIT_EXCEEDED',
      provider,
      true
    )
  }
}

export class SymbolNotFoundError extends MarketDataProviderError {
  constructor(symbol: string, provider: string) {
    super(
      `Symbol ${symbol} not found on ${provider}`,
      'SYMBOL_NOT_FOUND',
      provider,
      false
    )
  }
}

export class DataUnavailableError extends MarketDataProviderError {
  constructor(symbol: string, provider: string, reason: string) {
    super(
      `Data unavailable for ${symbol} on ${provider}: ${reason}`,
      'DATA_UNAVAILABLE',
      provider,
      true
    )
  }
}