/**
 * ドメインサービスインターフェース
 * ビジネスロジックの抽象化、インフラストラクチャに依存しない
 */

import { MarketDataEntity, QuoteData, TradingSymbolEntity } from '../entities/MarketData'

export interface IMarketDataProvider {
  getQuote(symbol: string): Promise<QuoteData>
  getHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
    interval: string
  ): Promise<MarketDataEntity[]>
  searchSymbols(query: string): Promise<TradingSymbolEntity[]>
  getNews(symbols?: string[]): Promise<NewsItem[]>
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

export interface IMarketDataCache {
  get(key: string): Promise<MarketDataEntity | null>
  set(key: string, data: MarketDataEntity, ttlInSeconds?: number): Promise<void>
  invalidate(pattern: string): Promise<void>
  isHealthy(): Promise<boolean>
}

export interface IMarketDataRepository {
  saveMarketData(data: MarketDataEntity): Promise<void>
  getMarketData(symbol: string, from: Date, to: Date): Promise<MarketDataEntity[]>
  getLatestQuote(symbol: string): Promise<MarketDataEntity | null>
  bulkSaveMarketData(data: MarketDataEntity[]): Promise<number>
}

/**
 * 市場データ管理のコアビジネスロジック
 */
export interface IMarketDataService {
  getRealtimeQuote(symbol: string): Promise<QuoteData>
  getHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
    interval: string
  ): Promise<MarketDataEntity[]>
  searchSymbols(query: string): Promise<TradingSymbolEntity[]>
  getMarketNews(symbols?: string[]): Promise<NewsItem[]>
  validateSymbol(symbol: string): Promise<boolean>
  refreshMarketData(symbols: string[]): Promise<void>
}

/**
 * データ品質管理サービス
 */
export interface IDataQualityService {
  validateMarketData(data: MarketDataEntity): Promise<boolean>
  detectAnomalies(data: MarketDataEntity[]): Promise<MarketDataEntity[]>
  enrichMarketData(data: MarketDataEntity): Promise<MarketDataEntity>
  calculateReliabilityScore(data: MarketDataEntity): Promise<number>
}

/**
 * 市場分析サービス
 */
export interface IMarketAnalysisService {
  calculateTechnicalIndicators(symbol: string, indicators: string[]): Promise<IndicatorResult[]>
  detectPatterns(symbol: string, patterns: string[]): Promise<PatternResult[]>
  generateMarketInsights(symbols: string[]): Promise<MarketInsight[]>
}

export interface IndicatorResult {
  indicator: string
  symbol: string
  value: number
  timestamp: Date
  parameters: Record<string, any>
}

export interface PatternResult {
  pattern: string
  symbol: string
  confidence: number
  timeframe: string
  detected_at: Date
}

export interface MarketInsight {
  symbol: string
  insight_type: string
  confidence: number
  description: string
  supporting_data: Record<string, any>
  generated_at: Date
}
