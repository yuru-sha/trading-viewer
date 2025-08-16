/**
 * インフラストラクチャ層: Prisma を使用した市場データリポジトリ
 * ドメインインターフェースの実装
 */

import { PrismaClient, Candle } from '@prisma/client'
import { IMarketDataRepository } from '../../domain/interfaces/IMarketDataService'
import { MarketDataEntity } from '../../domain/entities/MarketData'

export class PrismaMarketDataRepository implements IMarketDataRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveMarketData(data: MarketDataEntity): Promise<void> {
    try {
      await this.prisma.candle.upsert({
        where: {
          symbol_timestamp: {
            symbol: data.symbol,
            timestamp: data.priceData.timestamp
          }
        },
        update: {
          open: data.priceData.open,
          high: data.priceData.high,
          low: data.priceData.low,
          close: data.priceData.close,
          volume: data.priceData.volume
        },
        create: {
          symbol: data.symbol,
          timestamp: data.priceData.timestamp,
          open: data.priceData.open,
          high: data.priceData.high,
          low: data.priceData.low,
          close: data.priceData.close,
          volume: data.priceData.volume
        }
      })
    } catch (error) {
      throw new Error(`Failed to save market data for ${data.symbol}: ${error}`)
    }
  }

  async getMarketData(symbol: string, from: Date, to: Date): Promise<MarketDataEntity[]> {
    try {
      const fromTimestamp = Math.floor(from.getTime() / 1000)
      const toTimestamp = Math.floor(to.getTime() / 1000)

      const candles = await this.prisma.candle.findMany({
        where: {
          symbol,
          timestamp: {
            gte: fromTimestamp,
            lte: toTimestamp
          }
        },
        orderBy: {
          timestamp: 'asc'
        }
      })

      return candles.map(candle => this.convertToMarketDataEntity(candle))
    } catch (error) {
      throw new Error(`Failed to get market data for ${symbol}: ${error}`)
    }
  }

  async getLatestQuote(symbol: string): Promise<MarketDataEntity | null> {
    try {
      const latestCandle = await this.prisma.candle.findFirst({
        where: { symbol },
        orderBy: { timestamp: 'desc' }
      })

      if (!latestCandle) {
        return null
      }

      return this.convertToMarketDataEntity(latestCandle)
    } catch (error) {
      throw new Error(`Failed to get latest quote for ${symbol}: ${error}`)
    }
  }

  async bulkSaveMarketData(data: MarketDataEntity[]): Promise<number> {
    if (data.length === 0) {
      return 0
    }

    try {
      // Prisma の createMany を使用してバルクインサート
      const candleData = data.map(entity => ({
        symbol: entity.symbol,
        timestamp: entity.priceData.timestamp,
        open: entity.priceData.open,
        high: entity.priceData.high,
        low: entity.priceData.low,
        close: entity.priceData.close,
        volume: entity.priceData.volume
      }))

      const result = await this.prisma.candle.createMany({
        data: candleData,
        skipDuplicates: true // 重複は無視
      })

      return result.count
    } catch (error) {
      throw new Error(`Failed to bulk save market data: ${error}`)
    }
  }

  // ヘルスチェック用メソッド
  async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      return false
    }
  }

  // データベース統計情報
  async getStats(): Promise<{
    totalCandles: number
    uniqueSymbols: number
    oldestTimestamp: number | null
    newestTimestamp: number | null
  }> {
    try {
      const [totalCandles, uniqueSymbols, timeRange] = await Promise.all([
        this.prisma.candle.count(),
        this.prisma.candle.findMany({
          select: { symbol: true },
          distinct: ['symbol']
        }),
        this.prisma.candle.aggregate({
          _min: { timestamp: true },
          _max: { timestamp: true }
        })
      ])

      return {
        totalCandles,
        uniqueSymbols: uniqueSymbols.length,
        oldestTimestamp: timeRange._min.timestamp,
        newestTimestamp: timeRange._max.timestamp
      }
    } catch (error) {
      throw new Error(`Failed to get repository stats: ${error}`)
    }
  }

  // データクリーンアップ
  async cleanupOldData(symbol: string, beforeTimestamp: number): Promise<number> {
    try {
      const result = await this.prisma.candle.deleteMany({
        where: {
          symbol,
          timestamp: {
            lt: beforeTimestamp
          }
        }
      })

      return result.count
    } catch (error) {
      throw new Error(`Failed to cleanup old data for ${symbol}: ${error}`)
    }
  }

  private convertToMarketDataEntity(candle: Candle): MarketDataEntity {
    return new MarketDataEntity(
      candle.symbol,
      {
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        timestamp: candle.timestamp
      },
      {
        source: 'database',
        reliability: 1.0, // データベースのデータは信頼性が高い
        updatedAt: candle.updatedAt
      }
    )
  }
}

export const createPrismaMarketDataRepository = (prisma: PrismaClient): PrismaMarketDataRepository => {
  return new PrismaMarketDataRepository(prisma)
}