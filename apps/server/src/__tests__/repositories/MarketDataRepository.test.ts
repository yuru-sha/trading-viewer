/**
 * MarketDataRepository のテストケース
 * Repository パターンの統合テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { MarketDataRepository } from '../../repositories/MarketDataRepository'
import {
  IMarketDataProvider,
  QuoteResponse,
  HistoricalDataResponse,
} from '../../domain/interfaces/IMarketDataProvider'

// モック Prisma Client
const mockPrisma = {
  candle: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    createMany: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  },
} as unknown as PrismaClient

// モック Market Data Provider
const mockProvider: IMarketDataProvider = {
  getQuote: vi.fn(),
  getMultipleQuotes: vi.fn(),
  getHistoricalData: vi.fn(),
  searchSymbols: vi.fn(),
  getNews: vi.fn(),
  isHealthy: vi.fn(),
  getRateLimitStatus: vi.fn(),
}

describe.skip('MarketDataRepository', () => {
  let repository: MarketDataRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new MarketDataRepository(mockPrisma, mockProvider)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ローカルデータ操作', () => {
    it('create: 新しい市場データを作成できる', async () => {
      const createInput = {
        symbol: 'AAPL',
        timestamp: 1640995200,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000000,
      }

      const mockCandle = {
        id: 'candle-1',
        ...createInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.candle.create = vi.fn().mockResolvedValue(mockCandle)

      const result = await repository.create(createInput)

      expect(mockPrisma.candle.create).toHaveBeenCalledWith({
        data: {
          symbol: 'AAPL',
          timestamp: 1640995200,
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000000,
        },
      })
      expect(result.symbol).toBe('AAPL')
      expect(result.id).toBe('candle-1')
    })

    it('findById: ID で市場データを取得できる', async () => {
      const mockCandle = {
        id: 'candle-1',
        symbol: 'AAPL',
        timestamp: 1640995200,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.candle.findUnique = vi.fn().mockResolvedValue(mockCandle)

      const result = await repository.findById('candle-1')

      expect(mockPrisma.candle.findUnique).toHaveBeenCalledWith({
        where: { id: 'candle-1' },
      })
      expect(result?.id).toBe('candle-1')
      expect(result?.symbol).toBe('AAPL')
    })

    it('findMany: フィルター条件で市場データを検索できる', async () => {
      const mockCandles = [
        {
          id: 'candle-1',
          symbol: 'AAPL',
          timestamp: 1640995200,
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.candle.findMany = vi.fn().mockResolvedValue(mockCandles)

      const filter = {
        symbol: 'AAPL',
        fromTimestamp: 1640995200,
        toTimestamp: 1641081600,
      }

      const result = await repository.findMany(filter)

      expect(mockPrisma.candle.findMany).toHaveBeenCalledWith({
        where: {
          symbol: 'AAPL',
          timestamp: {
            gte: 1640995200,
            lte: 1641081600,
          },
        },
        skip: undefined,
        take: undefined,
        orderBy: [{ timestamp: 'asc' }],
      })
      expect(result).toHaveLength(1)
      expect(result[0].symbol).toBe('AAPL')
    })
  })

  describe('外部プロバイダー統合', () => {
    it('getRealtimeQuote: プロバイダーからリアルタイム相場を取得', async () => {
      const mockQuote: QuoteResponse = {
        symbol: 'AAPL',
        currentPrice: 150.0,
        change: 2.5,
        changePercent: 1.7,
        high: 152.0,
        low: 148.0,
        open: 149.0,
        previousClose: 147.5,
        volume: 2000000,
        timestamp: 1640995200,
      }

      mockProvider.getQuote = vi.fn().mockResolvedValue(mockQuote)

      const result = await repository.getRealtimeQuote('AAPL')

      expect(mockProvider.getQuote).toHaveBeenCalledWith('AAPL')
      expect(result.symbol).toBe('AAPL')
      expect(result.currentPrice).toBe(150.0)
    })

    it('getHistoricalDataFromProvider: プロバイダーから履歴データを取得', async () => {
      const mockHistoricalData: HistoricalDataResponse = {
        symbol: 'AAPL',
        candles: {
          open: [100, 101, 102],
          high: [105, 106, 107],
          low: [95, 96, 97],
          close: [101, 102, 103],
          volume: [1000000, 1100000, 1200000],
          timestamps: [1640995200, 1641081600, 1641168000],
        },
        status: 'ok',
      }

      mockProvider.getHistoricalData = vi.fn().mockResolvedValue(mockHistoricalData)

      const from = new Date('2022-01-01')
      const to = new Date('2022-01-03')
      const result = await repository.getHistoricalDataFromProvider('AAPL', from, to, '1d')

      expect(mockProvider.getHistoricalData).toHaveBeenCalledWith('AAPL', from, to, '1d')
      expect(result.symbol).toBe('AAPL')
      expect(result.candles.timestamps).toHaveLength(3)
    })
  })

  describe('統合機能', () => {
    it('syncHistoricalData: 外部データをローカルに同期', async () => {
      const mockHistoricalData: HistoricalDataResponse = {
        symbol: 'AAPL',
        candles: {
          open: [100, 101],
          high: [105, 106],
          low: [95, 96],
          close: [101, 102],
          volume: [1000000, 1100000],
          timestamps: [1640995200, 1641081600],
        },
        status: 'ok',
      }

      mockProvider.getHistoricalData = vi.fn().mockResolvedValue(mockHistoricalData)
      mockPrisma.candle.createMany = vi.fn().mockResolvedValue({ count: 2 })

      const from = new Date('2022-01-01')
      const to = new Date('2022-01-02')
      const result = await repository.syncHistoricalData('AAPL', from, to)

      expect(mockProvider.getHistoricalData).toHaveBeenCalledWith('AAPL', from, to, '1d')
      expect(mockPrisma.candle.createMany).toHaveBeenCalledWith({
        data: [
          {
            symbol: 'AAPL',
            timestamp: 1640995200,
            open: 100,
            high: 105,
            low: 95,
            close: 101,
            volume: 1000000,
          },
          {
            symbol: 'AAPL',
            timestamp: 1641081600,
            open: 101,
            high: 106,
            low: 96,
            close: 102,
            volume: 1100000,
          },
        ],
        skipDuplicates: true,
      })
      expect(result).toBe(2)
    })

    it('getOrFetchQuote: ローカルキャッシュまたは外部取得', async () => {
      const currentTimestamp = Math.floor(Date.now() / 1000)
      const mockCandle = {
        id: 'candle-1',
        symbol: 'AAPL',
        timestamp: currentTimestamp - 30, // 30 秒前
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.candle.findFirst = vi.fn().mockResolvedValue(mockCandle)

      const result = await repository.getOrFetchQuote('AAPL', 60) // 60 秒以内のキャッシュを許可

      expect(mockPrisma.candle.findFirst).toHaveBeenCalledWith({
        where: {
          symbol: 'AAPL',
          timestamp: { gte: expect.any(Number) },
        },
        orderBy: { timestamp: 'desc' },
      })
      expect(result.symbol).toBe('AAPL')
      expect(result.currentPrice).toBe(102)
    })

    it('getOrFetchQuote: キャッシュが古い場合は外部取得', async () => {
      const mockQuote: QuoteResponse = {
        symbol: 'AAPL',
        currentPrice: 150.0,
        change: 2.5,
        changePercent: 1.7,
        high: 152.0,
        low: 148.0,
        open: 149.0,
        previousClose: 147.5,
        volume: 2000000,
        timestamp: Math.floor(Date.now() / 1000),
      }

      mockPrisma.candle.findFirst = vi.fn().mockResolvedValue(null) // キャッシュなし
      mockProvider.getQuote = vi.fn().mockResolvedValue(mockQuote)

      const result = await repository.getOrFetchQuote('AAPL', 60)

      expect(mockProvider.getQuote).toHaveBeenCalledWith('AAPL')
      expect(result.currentPrice).toBe(150.0)
    })
  })

  describe('メンテナンス機能', () => {
    it('clearOldData: 古いデータを削除', async () => {
      mockPrisma.candle.deleteMany = vi.fn().mockResolvedValue({ count: 100 })

      const result = await repository.clearOldData('AAPL', 1640995200)

      expect(mockPrisma.candle.deleteMany).toHaveBeenCalledWith({
        where: {
          symbol: 'AAPL',
          timestamp: { lt: 1640995200 },
        },
      })
      expect(result).toBe(100)
    })

    it('getProviderStatus: プロバイダーステータス取得', async () => {
      mockProvider.isHealthy = vi.fn().mockResolvedValue(true)
      mockProvider.getRateLimitStatus = vi.fn().mockResolvedValue({
        requestsRemaining: 50,
        resetTime: Date.now() + 60000,
      })

      const result = await repository.getProviderStatus()

      expect(mockProvider.isHealthy).toHaveBeenCalled()
      expect(mockProvider.getRateLimitStatus).toHaveBeenCalled()
      expect(result.healthy).toBe(true)
      expect(result.rateLimitStatus.requestsRemaining).toBe(50)
    })
  })

  describe('エラーハンドリング', () => {
    it('create: 重複データ作成時にエラー', async () => {
      const createInput = {
        symbol: 'AAPL',
        timestamp: 1640995200,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000000,
      }

      const prismaError = new Error('Unique constraint violation')
      ;(prismaError as any).code = 'P2002'
      mockPrisma.candle.create = vi.fn().mockRejectedValue(prismaError)

      await expect(repository.create(createInput)).rejects.toThrow(
        'Market data for AAPL at timestamp 1640995200 already exists'
      )
    })

    it('getOrFetchQuote: プロバイダーエラー時はローカルデータで代用', async () => {
      const mockCandle = {
        id: 'candle-1',
        symbol: 'AAPL',
        timestamp: 1640995200,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.candle.findFirst = vi
        .fn()
        .mockResolvedValueOnce(null) // 最初の呼び出し（キャッシュチェック）
        .mockResolvedValueOnce(mockCandle) // 2 回目の呼び出し（フォールバック）

      mockProvider.getQuote = vi.fn().mockRejectedValue(new Error('Provider error'))

      const result = await repository.getOrFetchQuote('AAPL', 60)

      expect(result.symbol).toBe('AAPL')
      expect(result.currentPrice).toBe(102)
    })
  })
})
