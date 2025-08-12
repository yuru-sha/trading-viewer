import { DataService, IDataService } from '../../services/dataService'
import {
  NormalizedSymbol,
  NormalizedQuote,
  NormalizedCandleResponse,
  UserIndicators,
} from '@trading-viewer/shared'

// Mock all dependencies
jest.mock('../../services/databaseService', () => ({
  getDatabaseService: jest.fn(() => ({
    symbols: {
      search: jest.fn(),
      count: jest.fn(),
    },
    candles: {
      deleteOldData: jest.fn(),
      count: jest.fn(),
    },
    userPreferences: {
      findByUserId: jest.fn(),
      upsertByUserId: jest.fn(),
      getIndicators: jest.fn(),
      updateIndicators: jest.fn(),
      addIndicator: jest.fn(),
      removeIndicator: jest.fn(),
      count: jest.fn(),
    },
  })),
}))

jest.mock('../../services/cacheService', () => ({
  getCacheService: jest.fn(() => ({
    getSymbol: jest.fn(),
    setSymbol: jest.fn(),
    getQuote: jest.fn(),
    setQuote: jest.fn(),
    getCandleData: jest.fn(),
    setCandleData: jest.fn(),
    invalidateSymbol: jest.fn(),
    invalidateAll: jest.fn(),
    getStats: jest.fn(),
  })),
}))

jest.mock('../../services/finnhubService', () => ({
  getFinnhubService: jest.fn(() => ({
    searchSymbols: jest.fn(),
    getQuote: jest.fn(),
    getCandleData: jest.fn(),
  })),
}))

describe('DataService', () => {
  let service: IDataService
  let mockDbService: any
  let mockCacheService: any
  let mockFinnhubService: any

  beforeEach(() => {
    service = new DataService()

    const { getDatabaseService } = require('../../services/databaseService')
    const { getCacheService } = require('../../services/cacheService')
    const { getFinnhubService } = require('../../services/finnhubService')

    mockDbService = getDatabaseService()
    mockCacheService = getCacheService()
    mockFinnhubService = getFinnhubService()

    jest.clearAllMocks()
  })

  describe('Symbol management', () => {
    const testSymbol: NormalizedSymbol = {
      symbol: 'AAPL',
      description: 'Apple Inc',
      displaySymbol: 'AAPL',
      type: 'Common Stock',
      currency: 'USD',
    }

    it('should search symbols from database cache first', async () => {
      const dbSymbols = [
        {
          symbol: 'AAPL',
          description: 'Apple Inc',
          displaySymbol: 'AAPL',
          type: 'Common Stock',
        },
      ]

      mockDbService.symbols.search.mockResolvedValue(dbSymbols)

      const result = await service.searchSymbols('Apple', 10)

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          description: 'Apple Inc',
          displaySymbol: 'AAPL',
          type: 'Common Stock',
          currency: 'USD',
        },
      ])
      expect(mockDbService.symbols.search).toHaveBeenCalledWith('Apple', 10)
      expect(mockFinnhubService.searchSymbols).not.toHaveBeenCalled()
    })

    it('should fetch from Finnhub when not in database cache', async () => {
      mockDbService.symbols.search.mockResolvedValue([])
      mockFinnhubService.searchSymbols.mockResolvedValue([testSymbol])

      const result = await service.searchSymbols('Apple', 10)

      expect(result).toEqual([testSymbol])
      expect(mockFinnhubService.searchSymbols).toHaveBeenCalledWith({ q: 'Apple', limit: 10 })
      expect(mockCacheService.setSymbol).toHaveBeenCalledWith('AAPL', testSymbol)
    })

    it('should get symbol from cache service', async () => {
      mockCacheService.getSymbol.mockResolvedValue(testSymbol)

      const result = await service.getSymbol('AAPL')

      expect(result).toEqual(testSymbol)
      expect(mockCacheService.getSymbol).toHaveBeenCalledWith('AAPL')
    })

    it('should sync symbol from API and update cache', async () => {
      mockFinnhubService.searchSymbols.mockResolvedValue([testSymbol])

      const result = await service.syncSymbol('AAPL')

      expect(result).toEqual(testSymbol)
      expect(mockFinnhubService.searchSymbols).toHaveBeenCalledWith({ q: 'AAPL', limit: 1 })
      expect(mockCacheService.setSymbol).toHaveBeenCalledWith('AAPL', testSymbol)
    })

    it('should throw error when symbol not found during sync', async () => {
      mockFinnhubService.searchSymbols.mockResolvedValue([])

      await expect(service.syncSymbol('INVALID')).rejects.toThrow('Symbol INVALID not found')
    })
  })

  describe('Quote management', () => {
    const testQuote: NormalizedQuote = {
      symbol: 'AAPL',
      price: 150.0,
      change: 2.5,
      changePercent: 1.67,
      high: 152.0,
      low: 148.0,
      open: 149.0,
      previousClose: 147.5,
      timestamp: 1640995200,
    }

    it('should get quote from cache when available and cache enabled', async () => {
      mockCacheService.getQuote.mockResolvedValue(testQuote)

      const result = await service.getQuote('AAPL', true)

      expect(result).toEqual(testQuote)
      expect(mockCacheService.getQuote).toHaveBeenCalledWith('AAPL')
      expect(mockFinnhubService.getQuote).not.toHaveBeenCalled()
    })

    it('should fetch fresh quote from API when cache disabled', async () => {
      mockFinnhubService.getQuote.mockResolvedValue(testQuote)

      const result = await service.getQuote('AAPL', false)

      expect(result).toEqual(testQuote)
      expect(mockFinnhubService.getQuote).toHaveBeenCalledWith({ symbol: 'AAPL' })
      expect(mockCacheService.setQuote).toHaveBeenCalledWith('AAPL', testQuote)
    })

    it('should fetch fresh quote when not in cache', async () => {
      mockCacheService.getQuote.mockResolvedValue(null)
      mockFinnhubService.getQuote.mockResolvedValue(testQuote)

      const result = await service.getQuote('AAPL', true)

      expect(result).toEqual(testQuote)
      expect(mockFinnhubService.getQuote).toHaveBeenCalledWith({ symbol: 'AAPL' })
      expect(mockCacheService.setQuote).toHaveBeenCalledWith('AAPL', testQuote)
    })

    it('should refresh quote by bypassing cache', async () => {
      mockFinnhubService.getQuote.mockResolvedValue(testQuote)

      const result = await service.refreshQuote('AAPL')

      expect(result).toEqual(testQuote)
      expect(mockCacheService.getQuote).not.toHaveBeenCalled()
      expect(mockFinnhubService.getQuote).toHaveBeenCalledWith({ symbol: 'AAPL' })
    })
  })

  describe('Candle data management', () => {
    const testCandleData: NormalizedCandleResponse = {
      symbol: 'AAPL',
      resolution: 'D',
      status: 'ok',
      data: [
        {
          timestamp: 1640995200,
          open: 149.0,
          high: 152.0,
          low: 148.0,
          close: 150.0,
          volume: 1000000,
        },
      ],
    }

    it('should get candle data from cache when available', async () => {
      mockCacheService.getCandleData.mockResolvedValue(testCandleData)

      const result = await service.getCandleData('AAPL', 'D', 1640995200, 1641081600, true)

      expect(result).toEqual(testCandleData)
      expect(mockCacheService.getCandleData).toHaveBeenCalledWith(
        'AAPL',
        'D',
        1640995200,
        1641081600
      )
      expect(mockFinnhubService.getCandleData).not.toHaveBeenCalled()
    })

    it('should fetch fresh candle data when not in cache', async () => {
      mockCacheService.getCandleData.mockResolvedValue(null)
      mockFinnhubService.getCandleData.mockResolvedValue(testCandleData)

      const result = await service.getCandleData('AAPL', 'D', 1640995200, 1641081600, true)

      expect(result).toEqual(testCandleData)
      expect(mockFinnhubService.getCandleData).toHaveBeenCalledWith({
        symbol: 'AAPL',
        resolution: 'D',
        from: 1640995200,
        to: 1641081600,
      })
      expect(mockCacheService.setCandleData).toHaveBeenCalledWith(
        'AAPL',
        'D',
        1640995200,
        1641081600,
        testCandleData
      )
    })

    it('should refresh candle data by bypassing cache', async () => {
      mockFinnhubService.getCandleData.mockResolvedValue(testCandleData)

      const result = await service.refreshCandleData('AAPL', 'D', 1640995200, 1641081600)

      expect(result).toEqual(testCandleData)
      expect(mockCacheService.getCandleData).not.toHaveBeenCalled()
      expect(mockFinnhubService.getCandleData).toHaveBeenCalledWith({
        symbol: 'AAPL',
        resolution: 'D',
        from: 1640995200,
        to: 1641081600,
      })
    })
  })

  describe('User preferences management', () => {
    const mockUserPrefs = {
      userId: 'user123',
      theme: 'dark',
      chartType: 'candlestick',
      timeframe: '1D',
      indicators: '[]',
    }

    const mockIndicators: UserIndicators = [
      {
        name: 'SMA',
        type: 'overlay',
        parameters: { period: 20 },
        visible: true,
      },
    ]

    it('should get user preferences with indicators', async () => {
      mockDbService.userPreferences.findByUserId.mockResolvedValue(mockUserPrefs)
      mockDbService.userPreferences.getIndicators.mockResolvedValue(mockIndicators)

      const result = await service.getUserPreferences('user123')

      expect(result).toEqual({
        userId: 'user123',
        theme: 'dark',
        chartType: 'candlestick',
        timeframe: '1D',
        indicators: mockIndicators,
      })
    })

    it('should return null when user preferences not found', async () => {
      mockDbService.userPreferences.findByUserId.mockResolvedValue(null)

      const result = await service.getUserPreferences('user123')

      expect(result).toBeNull()
    })

    it('should update user preferences', async () => {
      const updateData = {
        theme: 'light',
        indicators: mockIndicators,
      }

      mockDbService.userPreferences.upsertByUserId.mockResolvedValue(mockUserPrefs)
      mockDbService.userPreferences.findByUserId.mockResolvedValue({
        ...mockUserPrefs,
        theme: 'light',
      })
      mockDbService.userPreferences.getIndicators.mockResolvedValue(mockIndicators)

      const result = await service.updateUserPreferences('user123', updateData)

      expect(mockDbService.userPreferences.upsertByUserId).toHaveBeenCalledWith('user123', {
        theme: 'light',
        indicators: JSON.stringify(mockIndicators),
      })
      expect(result?.theme).toBe('light')
    })

    it('should get user indicators', async () => {
      mockDbService.userPreferences.getIndicators.mockResolvedValue(mockIndicators)

      const result = await service.getUserIndicators('user123')

      expect(result).toEqual(mockIndicators)
      expect(mockDbService.userPreferences.getIndicators).toHaveBeenCalledWith('user123')
    })

    it('should update user indicators', async () => {
      await service.updateUserIndicators('user123', mockIndicators)

      expect(mockDbService.userPreferences.updateIndicators).toHaveBeenCalledWith(
        'user123',
        mockIndicators
      )
    })

    it('should add user indicator', async () => {
      const newIndicator = mockIndicators[0]

      await service.addUserIndicator('user123', newIndicator)

      expect(mockDbService.userPreferences.addIndicator).toHaveBeenCalledWith(
        'user123',
        newIndicator
      )
    })

    it('should remove user indicator', async () => {
      await service.removeUserIndicator('user123', 'SMA')

      expect(mockDbService.userPreferences.removeIndicator).toHaveBeenCalledWith('user123', 'SMA')
    })
  })

  describe('Data management', () => {
    it('should cleanup old data and invalidate cache', async () => {
      mockDbService.candles.deleteOldData.mockResolvedValue(100)

      const result = await service.cleanupOldData('AAPL', 1640000000)

      expect(result).toBe(100)
      expect(mockDbService.candles.deleteOldData).toHaveBeenCalledWith('AAPL', 1640000000)
      expect(mockCacheService.invalidateSymbol).toHaveBeenCalledWith('AAPL')
    })

    it('should invalidate cache for specific symbol', async () => {
      await service.invalidateCache('AAPL')

      expect(mockCacheService.invalidateSymbol).toHaveBeenCalledWith('AAPL')
    })

    it('should invalidate all cache when no symbol provided', async () => {
      await service.invalidateCache()

      expect(mockCacheService.invalidateAll).toHaveBeenCalled()
    })

    it('should get data statistics', async () => {
      mockDbService.symbols.count.mockResolvedValue(100)
      mockDbService.candles.count.mockResolvedValue(50000)
      mockDbService.userPreferences.count.mockResolvedValue(25)
      mockCacheService.getStats.mockResolvedValue({
        symbolsCount: 50,
        quotesCount: 30,
        candleDataCount: 20,
        memoryUsage: 1000000,
      })

      const result = await service.getDataStats()

      expect(result).toEqual({
        symbolsInDatabase: 100,
        candlesInDatabase: 50000,
        userPreferencesCount: 25,
        cacheStats: {
          symbolsCount: 50,
          quotesCount: 30,
          candleDataCount: 20,
          memoryUsage: 1000000,
        },
      })
    })
  })
})
