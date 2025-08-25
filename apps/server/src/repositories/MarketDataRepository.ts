/**
 * 統合された市場データリポジトリ
 * Repository パターンで外部プロバイダーとローカルストレージを統合
 */

import { PrismaClient, Candle } from '@prisma/client'
import { BaseRepository, NotFoundError, FindManyOptions } from './BaseRepository'
import {
  IMarketDataProvider,
  QuoteResponse,
  HistoricalDataResponse,
  SymbolSearchResult,
  NewsItemResponse,
} from '../domain/interfaces/IMarketDataProvider'

export interface MarketDataItem {
  id: string
  symbol: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  createdAt: Date
  updatedAt: Date
}

export interface MarketDataCreateInput {
  symbol: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface MarketDataFilter {
  symbol?: string
  fromTimestamp?: number
  toTimestamp?: number
}

export interface IMarketDataRepository {
  // ローカルデータ操作
  create(data: MarketDataCreateInput): Promise<MarketDataItem>
  findById(id: string): Promise<MarketDataItem | null>
  findMany(filter?: MarketDataFilter, options?: FindManyOptions): Promise<MarketDataItem[]>
  update(id: string, data: Partial<MarketDataCreateInput>): Promise<MarketDataItem>
  delete(id: string): Promise<void>
  count(filter?: MarketDataFilter): Promise<number>

  // 外部プロバイダー経由のデータ取得
  getRealtimeQuote(symbol: string): Promise<QuoteResponse>
  getMultipleQuotes(symbols: string[]): Promise<QuoteResponse[]>
  getHistoricalDataFromProvider(
    symbol: string,
    from: Date,
    to: Date,
    interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo'
  ): Promise<HistoricalDataResponse>
  searchSymbols(query: string, limit?: number): Promise<SymbolSearchResult[]>
  getNews(query?: string, count?: number): Promise<NewsItemResponse[]>

  // 統合機能
  syncHistoricalData(symbol: string, from: Date, to: Date): Promise<number>
  getOrFetchQuote(symbol: string, maxAgeSeconds?: number): Promise<QuoteResponse>
  bulkSyncData(symbols: string[], from: Date, to: Date): Promise<number>

  // キャッシュ・メンテナンス
  clearOldData(symbol: string, beforeTimestamp: number): Promise<number>
  getProviderStatus(): Promise<{ healthy: boolean; rateLimitStatus: any }>
}

export class MarketDataRepository
  extends BaseRepository<
    MarketDataItem,
    MarketDataCreateInput,
    Partial<MarketDataCreateInput>,
    MarketDataFilter
  >
  implements IMarketDataRepository
{
  constructor(
    prisma: PrismaClient,
    private readonly provider: IMarketDataProvider
  ) {
    super(prisma)
  }

  // ローカルデータ操作の実装
  async create(data: MarketDataCreateInput): Promise<MarketDataItem> {
    try {
      const candle = await this.prisma.candle.create({
        data: {
          symbol: data.symbol,
          timestamp: data.timestamp,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.volume || 0,
        },
      })
      return this.convertToMarketDataItem(candle)
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error(
          `Market data for ${data.symbol} at timestamp ${data.timestamp} already exists`
        )
      }
      throw error
    }
  }

  async findById(id: string): Promise<MarketDataItem | null> {
    const candle = await this.prisma.candle.findUnique({
      where: { id },
    })
    return candle ? this.convertToMarketDataItem(candle) : null
  }

  async findMany(filter?: MarketDataFilter, options?: FindManyOptions): Promise<MarketDataItem[]> {
    const where: any = {}

    if (filter) {
      if (filter.symbol) where.symbol = filter.symbol
      if (filter.fromTimestamp || filter.toTimestamp) {
        where.timestamp = {}
        if (filter.fromTimestamp) where.timestamp.gte = filter.fromTimestamp
        if (filter.toTimestamp) where.timestamp.lte = filter.toTimestamp
      }
    }

    const candles = await this.prisma.candle.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ timestamp: 'asc' }],
    })

    return candles.map(candle => this.convertToMarketDataItem(candle))
  }

  async update(id: string, data: Partial<MarketDataCreateInput>): Promise<MarketDataItem> {
    try {
      const candle = await this.prisma.candle.update({
        where: { id },
        data,
      })
      return this.convertToMarketDataItem(candle)
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('MarketData', id)
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.candle.delete({
        where: { id },
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('MarketData', id)
      }
      throw error
    }
  }

  async count(filter?: MarketDataFilter): Promise<number> {
    const where: any = {}

    if (filter) {
      if (filter.symbol) where.symbol = filter.symbol
      if (filter.fromTimestamp || filter.toTimestamp) {
        where.timestamp = {}
        if (filter.fromTimestamp) where.timestamp.gte = filter.fromTimestamp
        if (filter.toTimestamp) where.timestamp.lte = filter.toTimestamp
      }
    }

    return await this.prisma.candle.count({ where })
  }

  // 外部プロバイダー経由のデータ取得
  async getRealtimeQuote(symbol: string): Promise<QuoteResponse> {
    return await this.provider.getQuote(symbol)
  }

  async getMultipleQuotes(symbols: string[]): Promise<QuoteResponse[]> {
    return await this.provider.getMultipleQuotes(symbols)
  }

  async getHistoricalDataFromProvider(
    symbol: string,
    from: Date,
    to: Date,
    interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo'
  ): Promise<HistoricalDataResponse> {
    return await this.provider.getHistoricalData(symbol, from, to, interval)
  }

  async searchSymbols(query: string, limit: number = 10): Promise<SymbolSearchResult[]> {
    return await this.provider.searchSymbols(query, limit)
  }

  async getNews(query?: string, count: number = 6): Promise<NewsItemResponse[]> {
    return await this.provider.getNews(query, count)
  }

  // 統合機能
  async syncHistoricalData(symbol: string, from: Date, to: Date): Promise<number> {
    try {
      const historicalData = await this.provider.getHistoricalData(symbol, from, to, '1d')

      if (historicalData.status !== 'ok' || !historicalData.candles) {
        return 0
      }

      const { candles } = historicalData
      const candleData = []

      for (let i = 0; i < candles.timestamps.length; i++) {
        candleData.push({
          symbol,
          timestamp: candles.timestamps[i],
          open: candles.open[i],
          high: candles.high[i],
          low: candles.low[i],
          close: candles.close[i],
          volume: candles.volume[i],
        })
      }

      // バルクインサート（重複は無視）
      const result = await this.prisma.candle.createMany({
        data: candleData,
      })

      return result.count
    } catch (error) {
      console.error(`Failed to sync historical data for ${symbol}:`, error)
      return 0
    }
  }

  async getOrFetchQuote(symbol: string, maxAgeSeconds: number = 60): Promise<QuoteResponse> {
    try {
      // 最新のローカルデータを確認
      const cutoffTimestamp = Math.floor(Date.now() / 1000) - maxAgeSeconds
      const latestLocal = await this.prisma.candle.findFirst({
        where: {
          symbol,
          timestamp: { gte: cutoffTimestamp },
        },
        orderBy: { timestamp: 'desc' },
      })

      if (latestLocal) {
        // ローカルデータが新しい場合は変換して返す
        return {
          symbol: latestLocal.symbol,
          currentPrice: latestLocal.close,
          change: 0, // 計算が必要な場合は前日比を計算
          changePercent: 0,
          high: latestLocal.high,
          low: latestLocal.low,
          open: latestLocal.open,
          previousClose: latestLocal.close,
          volume: latestLocal.volume,
          timestamp: latestLocal.timestamp,
        }
      }

      // ローカルデータが古い場合は外部プロバイダーから取得
      return await this.provider.getQuote(symbol)
    } catch (error) {
      // プロバイダーエラーの場合はローカルの最新データで代用
      const fallbackData = await this.prisma.candle.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' },
      })

      if (fallbackData) {
        return {
          symbol: fallbackData.symbol,
          currentPrice: fallbackData.close,
          change: 0,
          changePercent: 0,
          high: fallbackData.high,
          low: fallbackData.low,
          open: fallbackData.open,
          previousClose: fallbackData.close,
          volume: fallbackData.volume,
          timestamp: fallbackData.timestamp,
        }
      }

      throw error
    }
  }

  async bulkSyncData(symbols: string[], from: Date, to: Date): Promise<number> {
    let totalSynced = 0

    for (const symbol of symbols) {
      const synced = await this.syncHistoricalData(symbol, from, to)
      totalSynced += synced

      // レート制限対応で少し待機
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return totalSynced
  }

  // キャッシュ・メンテナンス
  async clearOldData(symbol: string, beforeTimestamp: number): Promise<number> {
    const result = await this.prisma.candle.deleteMany({
      where: {
        symbol,
        timestamp: { lt: beforeTimestamp },
      },
    })
    return result.count
  }

  async getProviderStatus(): Promise<{ healthy: boolean; rateLimitStatus: any }> {
    const healthy = await this.provider.isHealthy()
    const rateLimitStatus = await this.provider.getRateLimitStatus()
    return { healthy, rateLimitStatus }
  }

  // ヘルパーメソッド
  private convertToMarketDataItem(candle: Candle): MarketDataItem {
    return {
      id: candle.id,
      symbol: candle.symbol,
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      createdAt: candle.createdAt,
      updatedAt: candle.createdAt,
    }
  }
}

export const createMarketDataRepository = (
  prisma: PrismaClient,
  provider: IMarketDataProvider
): MarketDataRepository => {
  return new MarketDataRepository(prisma, provider)
}
