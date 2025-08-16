/**
 * Client 側ドメインインターフェース
 * API 通信の抽象化、外部依存を排除
 */

export interface MarketQuote {
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
}

export interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface SymbolSearchResult {
  symbol: string
  description: string
  displaySymbol: string
  type: string
}

export interface NewsItem {
  id: string
  title: string
  content: string
  source: string
  publishedAt: Date
  symbols: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export interface WatchlistItem {
  id: string
  symbol: string
  name: string
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface DrawingTool {
  id: string
  symbol: string
  timeframe: string
  type: string
  data: any
  createdAt: Date
  updatedAt: Date
}

/**
 * 市場データクライアントの抽象インターフェース
 */
export interface IMarketDataClient {
  // Quote data
  getQuote(symbol: string): Promise<MarketQuote>
  getMultipleQuotes(symbols: string[]): Promise<MarketQuote[]>

  // Historical data
  getCandleData(params: {
    symbol: string
    resolution: string
    from: Date
    to: Date
  }): Promise<CandleData[]>

  // Symbol search
  searchSymbols(query: string, limit?: number): Promise<SymbolSearchResult[]>

  // Market news
  getMarketNews(symbols?: string[]): Promise<NewsItem[]>

  // Rate limiting info
  getRateLimitInfo(): Promise<{
    limit: number
    remaining: number
    resetTime: Date
    canMakeRequest: boolean
  }>
}

/**
 * ウォッチリストクライアントの抽象インターフェース
 */
export interface IWatchlistClient {
  getWatchlist(): Promise<WatchlistItem[]>
  addToWatchlist(symbol: string, name: string): Promise<WatchlistItem>
  removeFromWatchlist(symbol: string): Promise<void>
  updateWatchlistPositions(items: Array<{ symbol: string; position: number }>): Promise<void>
}

/**
 * 描画ツールクライアントの抽象インターフェース
 */
export interface IDrawingToolsClient {
  getDrawingTools(symbol: string, timeframe?: string): Promise<DrawingTool[]>
  createDrawingTool(data: {
    symbol: string
    timeframe: string
    type: string
    data: any
  }): Promise<DrawingTool>
  updateDrawingTool(id: string, updates: any): Promise<DrawingTool>
  deleteDrawingTool(id: string): Promise<void>
}

/**
 * 認証クライアントの抽象インターフェース
 */
export interface IAuthClient {
  login(
    email: string,
    password: string
  ): Promise<{
    user: any
    token: string
  }>
  logout(): Promise<void>
  register(userData: {
    email: string
    password: string
    firstName: string
    lastName: string
  }): Promise<{
    user: any
    token: string
  }>
  getCurrentUser(): Promise<any>
  refreshToken(): Promise<string>
}

/**
 * アプリケーション情報クライアントの抽象インターフェース
 */
export interface IAppInfoClient {
  getHealthStatus(): Promise<{
    status: string
    database: string
    timestamp: Date
  }>
  getAppInfo(): Promise<{
    name: string
    version: string
    timestamp: Date
    endpoints: Record<string, any>
  }>
  getDataSourceInfo(): Promise<{
    isMockData: boolean
    provider: string
    status: string
    description: string
  }>
}

/**
 * API エラーの抽象化
 */
export interface ApiError {
  message: string
  statusCode: number
  code?: string
  timestamp: Date
}

/**
 * API レスポンスの統一フォーマット
 */
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  error?: ApiError
}

/**
 * キャッシュストラテジー
 */
export interface CacheStrategy {
  key: string
  ttl: number // seconds
  staleWhileRevalidate?: boolean
}

/**
 * リクエスト設定
 */
export interface RequestConfig {
  timeout?: number
  retries?: number
  cache?: CacheStrategy
  priority?: 'high' | 'normal' | 'low'
}

/**
 * 統合 API クライアントインターフェース
 */
export interface ITradingViewerApiClient {
  market: IMarketDataClient
  watchlist: IWatchlistClient
  drawingTools: IDrawingToolsClient
  auth: IAuthClient
  appInfo: IAppInfoClient

  // Global methods
  configure(config: { baseUrl?: string; timeout?: number; retries?: number }): void

  isHealthy(): Promise<boolean>
  destroy(): void
}
