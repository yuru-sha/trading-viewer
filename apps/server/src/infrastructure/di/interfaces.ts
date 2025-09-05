/**
 * Service Interfaces for Dependency Injection
 *
 * Evidence-First Design:
 * - Interface segregation principle applied
 * - Clear contract definitions for testing
 * - Type-safe service dependencies
 */

import type { Candle } from '@prisma/client'

// Temporary types until we fix @shared imports
type Quote = {
  symbol: string
  currentPrice: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
  marketCap?: number
  currency?: string
  exchangeTimezoneName?: string
  exchangeName?: string
  timestamp: number
}

type SearchResult = {
  symbol: string
  shortname?: string
  longname?: string
  exchange?: string
  quoteType?: string
  typeDisp?: string
}

type NewsItem = {
  uuid: string
  title: string
  publisher: string
  link: string
  providerPublishTime: number
  type: string
  thumbnail?: {
    resolutions?: Array<{
      url: string
      width?: number
      height?: number
      tag?: string
    }>
  }
  relatedTickers?: string[]
}

type IndicatorValue = {
  timestamp: number
  value: number
}

type IndicatorResult = {
  type: string
  name: string
  parameters: Record<string, any>
  values: IndicatorValue[]
}
type YahooCandleData = {
  c: number[] // 終値
  h: number[] // 高値
  l: number[] // 安値
  o: number[] // 始値
  s: string // ステータス
  t: number[] // タイムスタンプ
  v: number[] // 出来高
}

import type { WebSocket } from 'ws'

// Yahoo Finance Service Interface
export interface IYahooFinanceService {
  getQuote(symbol: string): Promise<Quote | null>
  getMultipleQuotes(symbols: string[]): Promise<Quote[]>
  getCandles(
    symbol: string,
    period1: Date,
    period2: Date,
    interval?: '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo'
  ): Promise<YahooCandleData>
  getCandlesWithResolution(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<YahooCandleData>
  searchSymbols(query: string, limit?: number): Promise<SearchResult[]>
  getNews(symbol?: string): Promise<NewsItem[]>
  getCategoryNews(category: string): Promise<NewsItem[]>
}

// Indicator Calculation Service Interface
export interface IIndicatorCalculationService {
  calculateSMA(candles: Candle[], period: number): IndicatorValue[]
  calculateEMA(candles: Candle[], period: number): IndicatorValue[]
  calculateRSI(candles: Candle[], period?: number): IndicatorValue[]
  calculateMACD(
    candles: Candle[],
    fastPeriod?: number,
    slowPeriod?: number,
    signalPeriod?: number
  ): {
    macd: IndicatorValue[]
    signal: IndicatorValue[]
    histogram: IndicatorValue[]
  }
  calculateBollingerBands(
    candles: Candle[],
    period?: number,
    standardDeviations?: number
  ): {
    upper2: IndicatorValue[]
    upper1: IndicatorValue[]
    middle: IndicatorValue[]
    lower1: IndicatorValue[]
    lower2: IndicatorValue[]
  }
  calculateIndicator(
    type: string,
    candles: Candle[],
    parameters: Record<string, any>,
    name: string
  ): IndicatorResult
}

// WebSocket Service Interface
export interface IWebSocketService {
  broadcast(message: any, excludeClient?: string): void
  broadcastToUser(userId: string, message: any): void
  sendToClient(clientId: string, message: any): void
  getConnectedClientsCount(): number
  getConnectedUserIds(): string[]
  isUserConnected(userId: string): boolean
}

// Logger Service Interface
export interface ILoggerService {
  info(message: string, context?: any): void
  warn(message: string, context?: any): void
  error(message: string, error?: Error, context?: any): void
  debug(message: string, context?: any): void
  fatal(message: string, error?: Error, context?: any): void
  // Category-specific logging
  auth: Pick<ILoggerService, 'info' | 'warn' | 'error' | 'debug'>
  api: Pick<ILoggerService, 'info' | 'warn' | 'error' | 'debug'>
  database: Pick<ILoggerService, 'info' | 'warn' | 'error' | 'debug'>
  websocket: Pick<ILoggerService, 'info' | 'warn' | 'error' | 'debug'>
  security: Pick<ILoggerService, 'info' | 'warn' | 'error' | 'debug'>
  performance: Pick<ILoggerService, 'info' | 'warn' | 'error' | 'debug'>
  business: Pick<ILoggerService, 'info' | 'warn' | 'error' | 'debug'>
  system: Pick<ILoggerService, 'info' | 'warn' | 'error' | 'debug'>
  audit: Pick<ILoggerService, 'info' | 'warn' | 'error' | 'debug'>
}

// Cache Service Interface
export interface ICacheService {
  get<T = any>(key: string): Promise<T | null>
  set(key: string, value: any, ttl?: number): Promise<void>
  has(key: string): Promise<boolean>
  delete(key: string): Promise<boolean>
  clear(): Promise<void>
  getStats(): {
    hits: number
    misses: number
    keys: number
    hitRate: number
  }
}

// Database Service Interface
export interface IDatabaseService {
  isHealthy(): Promise<boolean>
  ping(): Promise<boolean>
}

// Authorization Service Interface
export interface IAuthorizationService {
  hasPermission(userId: string, permission: string): Promise<boolean>
  hasRole(userId: string, role: string): Promise<boolean>
  getUserPermissions(userId: string): Promise<string[]>
  getUserRoles(userId: string): Promise<string[]>
}

// Drawing Cleanup Service Interface
export interface IDrawingCleanupService {
  cleanupOrphanedDrawings(): Promise<void>
  cleanupExpiredDrawings(): Promise<void>
  getCleanupStats(): Promise<{
    orphanedCount: number
    expiredCount: number
    lastCleanup: Date
  }>
}
