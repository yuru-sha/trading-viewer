/**
 * 統合された市場データリポジトリ
 * Repository パターンで外部プロバイダーとローカルストレージを統合
 * 
 * TODO: This file needs refactoring for Clean Architecture compliance
 * Temporarily disabled to resolve type-check errors during Clean Architecture migration
 */

// Type definitions for market data (kept for compatibility)
export interface QuoteResponse {
  symbol: string
  price: number
  timestamp: number
  volume: number
}

export interface HistoricalDataResponse {
  symbol: string
  data: Array<{
    timestamp: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
}

export interface SymbolSearchResult {
  symbol: string
  name: string
  exchange: string
}

export interface NewsItemResponse {
  id: string
  title: string
  content: string
  timestamp: number
}

export interface IMarketDataProvider {
  getQuote(symbol: string): Promise<QuoteResponse>
  getHistoricalData(symbol: string, from: number, to: number): Promise<HistoricalDataResponse>
  searchSymbols(query: string): Promise<SymbolSearchResult[]>
  getNews(symbol?: string): Promise<NewsItemResponse[]>
}

// Placeholder class to maintain compatibility
export class MarketDataRepository {
  constructor() {
    // Implementation will be added during Clean Architecture completion
  }
}

export default MarketDataRepository