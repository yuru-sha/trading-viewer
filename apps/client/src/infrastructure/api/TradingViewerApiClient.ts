/**
 * インフラストラクチャ層: 統合 API クライアント実装
 * ドメインインターフェースを実装し、既存の apiClient を活用
 */

import {
  ITradingViewerApiClient,
  IMarketDataClient,
  IWatchlistClient,
  IDrawingToolsClient,
  IAuthClient,
  IAppInfoClient,
  MarketQuote,
  CandleData,
  SymbolSearchResult,
  NewsItem,
  WatchlistItem,
  DrawingTool,
  RequestConfig,
  ApiResponse,
} from '../../domain/interfaces/IMarketDataClient'
import { api } from '../../lib/apiClient'

/**
 * 市場データクライアント実装
 */
class MarketDataClient implements IMarketDataClient {
  async getQuote(symbol: string): Promise<MarketQuote> {
    const response = await api.market.getQuote(symbol)
    return {
      symbol: symbol,
      currentPrice: response.c,
      change: response.d,
      changePercent: response.dp,
      high: response.h,
      low: response.l,
      open: response.o,
      previousClose: response.pc,
      volume: 0, // Yahoo Finance API から取得されない場合があるため 0 を設定
      timestamp: response.t,
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const promises = symbols.map(symbol => this.getQuote(symbol))
    const results = await Promise.allSettled(promises)

    return results
      .filter(
        (result): result is PromiseFulfilledResult<MarketQuote> => result.status === 'fulfilled'
      )
      .map(result => result.value)
  }

  async getCandleData(params: {
    symbol: string
    resolution: string
    from: Date
    to: Date
  }): Promise<CandleData[]> {
    const response = await api.market.getCandleData({
      symbol: params.symbol,
      resolution: params.resolution,
      from: Math.floor(params.from.getTime() / 1000),
      to: Math.floor(params.to.getTime() / 1000),
    })

    if (response.s !== 'ok' || !response.t) {
      return []
    }

    return response.t.map((timestamp, index) => ({
      timestamp: timestamp * 1000, // Convert to milliseconds
      open: response.o[index],
      high: response.h[index],
      low: response.l[index],
      close: response.c[index],
      volume: response.v[index] || 0,
    }))
  }

  async searchSymbols(query: string, limit = 20): Promise<SymbolSearchResult[]> {
    const response = await api.market.searchSymbols({ q: query, limit })
    return response.symbols.map(symbol => ({
      symbol: symbol.symbol,
      description: symbol.description,
      displaySymbol: symbol.displaySymbol,
      type: symbol.type,
    }))
  }

  async getMarketNews(symbols?: string[]): Promise<NewsItem[]> {
    // 現在の API にはニュース機能がないため、モックデータを返す
    return []
  }

  async getRateLimitInfo(): Promise<{
    limit: number
    remaining: number
    resetTime: Date
    canMakeRequest: boolean
  }> {
    const response = await api.market.getRateLimit()
    return {
      limit: response.limit,
      remaining: response.remaining,
      resetTime: new Date(response.resetTime * 1000),
      canMakeRequest: response.canMakeRequest,
    }
  }
}

/**
 * ウォッチリストクライアント実装
 */
class WatchlistClient implements IWatchlistClient {
  async getWatchlist(): Promise<WatchlistItem[]> {
    const response = await api.watchlist.get()
    return response.data.watchlist.map(item => ({
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      position: item.position,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }))
  }

  async addToWatchlist(symbol: string, name: string): Promise<WatchlistItem> {
    const response = await api.watchlist.add(symbol, name)
    const item = response.data
    return {
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      position: item.position,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }
  }

  async removeFromWatchlist(symbol: string): Promise<void> {
    await api.watchlist.remove(symbol)
  }

  async updateWatchlistPositions(
    items: Array<{ symbol: string; position: number }>
  ): Promise<void> {
    await api.watchlist.updatePositions(items)
  }
}

/**
 * 描画ツールクライアント実装
 */
class DrawingToolsClient implements IDrawingToolsClient {
  async getDrawingTools(symbol: string, timeframe?: string): Promise<DrawingTool[]> {
    const response = await api.drawing.getDrawingTools(symbol, timeframe)
    return response.data.map(item => ({
      id: item.id,
      symbol: item.symbol,
      timeframe: item.timeframe,
      type: item.type,
      data: item.data,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }))
  }

  async createDrawingTool(data: {
    symbol: string
    timeframe: string
    type: string
    data: any
  }): Promise<DrawingTool> {
    const response = await api.drawing.createDrawingTool({
      symbol: data.symbol,
      timeframe: data.timeframe,
      tool: {
        type: data.type,
        data: data.data,
      },
    })

    const item = response.data
    return {
      id: item.id,
      symbol: item.symbol,
      timeframe: item.timeframe,
      type: item.type,
      data: item.data,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }
  }

  async updateDrawingTool(id: string, updates: any): Promise<DrawingTool> {
    const response = await api.drawing.updateDrawingTool(id, updates)
    const item = response.data
    return {
      id: item.id,
      symbol: item.symbol,
      timeframe: item.timeframe,
      type: item.type,
      data: item.data,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }
  }

  async deleteDrawingTool(id: string): Promise<void> {
    await api.drawing.deleteDrawingTool(id)
  }
}

/**
 * 認証クライアント実装
 */
class AuthClient implements IAuthClient {
  async login(
    email: string,
    password: string
  ): Promise<{
    user: any
    token: string
  }> {
    // 既存の認証ロジックを統合する必要がある
    throw new Error('Not implemented - integrate with existing auth system')
  }

  async logout(): Promise<void> {
    // 既存の認証ロジックを統合する必要がある
    throw new Error('Not implemented - integrate with existing auth system')
  }

  async register(userData: { email: string; password: string }): Promise<{
    user: any
    token: string
  }> {
    // 既存の認証ロジックを統合する必要がある
    throw new Error('Not implemented - integrate with existing auth system')
  }

  async getCurrentUser(): Promise<any> {
    // 既存の認証ロジックを統合する必要がある
    throw new Error('Not implemented - integrate with existing auth system')
  }

  async refreshToken(): Promise<string> {
    // 既存の認証ロジックを統合する必要がある
    throw new Error('Not implemented - integrate with existing auth system')
  }
}

/**
 * アプリケーション情報クライアント実装
 */
class AppInfoClient implements IAppInfoClient {
  async getHealthStatus(): Promise<{
    status: string
    database: string
    timestamp: Date
  }> {
    const response = await api.health.check()
    return {
      status: response.status,
      database: response.database,
      timestamp: new Date(response.timestamp),
    }
  }

  async getAppInfo(): Promise<{
    name: string
    version: string
    timestamp: Date
    endpoints: Record<string, any>
  }> {
    const response = await api.info.getInfo()
    return {
      name: response.name,
      version: response.version,
      timestamp: new Date(response.timestamp),
      endpoints: response.endpoints,
    }
  }

  async getDataSourceInfo(): Promise<{
    isMockData: boolean
    provider: string
    status: string
    description: string
  }> {
    const response = await api.market.getDataSource()
    return {
      isMockData: response.isMockData,
      provider: response.provider,
      status: response.status,
      description: response.description,
    }
  }
}

/**
 * 統合 API クライアント実装
 */
export class TradingViewerApiClient implements ITradingViewerApiClient {
  public readonly market: IMarketDataClient
  public readonly watchlist: IWatchlistClient
  public readonly drawingTools: IDrawingToolsClient
  public readonly auth: IAuthClient
  public readonly appInfo: IAppInfoClient

  private config = {
    baseUrl: 'http://localhost:8000/api',
    timeout: 10000,
    retries: 3,
  }

  constructor() {
    this.market = new MarketDataClient()
    this.watchlist = new WatchlistClient()
    this.drawingTools = new DrawingToolsClient()
    this.auth = new AuthClient()
    this.appInfo = new AppInfoClient()
  }

  configure(config: { baseUrl?: string; timeout?: number; retries?: number }): void {
    this.config = { ...this.config, ...config }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.appInfo.getHealthStatus()
      return true
    } catch {
      return false
    }
  }

  destroy(): void {
    // クリーンアップロジック（必要に応じて）
  }
}

// シングルトンインスタンス
export const tradingViewerApiClient = new TradingViewerApiClient()

// 便利なエクスポート
export const {
  market: marketClient,
  watchlist: watchlistClient,
  drawingTools: drawingToolsClient,
  auth: authClient,
  appInfo: appInfoClient,
} = tradingViewerApiClient
