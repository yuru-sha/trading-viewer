import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { YahooFinanceService } from '../../application/services/yahooFinanceService'

// Mock external dependencies
vi.mock('yahoofinance2', () => ({
  quote: vi.fn(),
  search: vi.fn(),
  historical: vi.fn(),
  news: vi.fn(),
}))

vi.mock('../../services/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('YahooFinanceService', () => {
  let service: YahooFinanceService
  let yahoofinance2: any

  beforeEach(() => {
    // Create service instance directly instead of using singleton
    service = new YahooFinanceService()
    yahoofinance2 = require('yahoofinance2')

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('constructor', () => {
    it('should create YahooFinanceService instance', () => {
      expect(service).toBeInstanceOf(YahooFinanceService)
    })
  })

  describe('getQuote', () => {
    it('should fetch and return quote data successfully', async () => {
      const mockQuoteData = {
        price: 150.25,
        regularMarketPrice: 150.25,
        regularMarketChange: 2.5,
        regularMarketChangePercent: 1.67,
        regularMarketVolume: 1000000,
        marketCap: 2500000000000,
        regularMarketOpen: 148.0,
        regularMarketDayHigh: 151.0,
        regularMarketDayLow: 147.5,
        regularMarketPreviousClose: 147.75,
        fiftyTwoWeekHigh: 200.0,
        fiftyTwoWeekLow: 120.0,
        symbol: 'AAPL',
        shortName: 'Apple Inc.',
      }

      yahoofinance2.quote.mockResolvedValue(mockQuoteData)

      const result = await service.getQuote('AAPL')

      expect(yahoofinance2.quote).toHaveBeenCalledWith('AAPL')
      expect(result).toEqual({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.5,
        changePercent: 1.67,
        volume: 1000000,
        marketCap: 2500000000000,
        open: 148.0,
        high: 151.0,
        low: 147.5,
        previousClose: 147.75,
        fiftyTwoWeekHigh: 200.0,
        fiftyTwoWeekLow: 120.0,
      })
    })

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Yahoo Finance API error')
      yahoofinance2.quote.mockRejectedValue(mockError)

      await expect(service.getQuote('INVALID')).rejects.toThrow('Yahoo Finance API error')
    })

    it('should use cached data when available', async () => {
      const mockQuoteData = {
        price: 150.25,
        regularMarketPrice: 150.25,
        regularMarketChange: 2.5,
        regularMarketChangePercent: 1.67,
        regularMarketVolume: 1000000,
        marketCap: 2500000000000,
        regularMarketOpen: 148.0,
        regularMarketDayHigh: 151.0,
        regularMarketDayLow: 147.5,
        regularMarketPreviousClose: 147.75,
        fiftyTwoWeekHigh: 200.0,
        fiftyTwoWeekLow: 120.0,
        symbol: 'AAPL',
        shortName: 'Apple Inc.',
      }

      yahoofinance2.quote.mockResolvedValue(mockQuoteData)

      // First call should fetch from API
      const result1 = await service.getQuote('AAPL')

      // Second call should use cache
      const result2 = await service.getQuote('AAPL')

      expect(yahoofinance2.quote).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(result2)
    })
  })

  describe('searchSymbols', () => {
    it('should search for symbols successfully', async () => {
      const mockSearchResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchDisp: 'NASDAQ',
          typeDisp: 'Equity',
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          exchDisp: 'NASDAQ',
          typeDisp: 'Equity',
        },
      ]

      yahoofinance2.search.mockResolvedValue({ quotes: mockSearchResults })

      const result = await service.searchSymbols('apple')

      expect(yahoofinance2.search).toHaveBeenCalledWith('apple')
      expect(result).toEqual([
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          type: 'Equity',
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          exchange: 'NASDAQ',
          type: 'Equity',
        },
      ])
    })

    it('should handle empty search results', async () => {
      yahoofinance2.search.mockResolvedValue({ quotes: [] })

      const result = await service.searchSymbols('nonexistent')

      expect(result).toEqual([])
    })

    it('should handle search API errors', async () => {
      yahoofinance2.search.mockRejectedValue(new Error('Search API error'))

      await expect(service.searchSymbols('test')).rejects.toThrow('Search API error')
    })
  })

  describe('getMultipleQuotes', () => {
    it('should fetch multiple quotes successfully', async () => {
      const mockQuotes = {
        AAPL: {
          price: 150.25,
          regularMarketPrice: 150.25,
          regularMarketChange: 2.5,
          regularMarketChangePercent: 1.67,
          symbol: 'AAPL',
          shortName: 'Apple Inc.',
        },
        MSFT: {
          price: 300.5,
          regularMarketPrice: 300.5,
          regularMarketChange: -1.5,
          regularMarketChangePercent: -0.5,
          symbol: 'MSFT',
          shortName: 'Microsoft Corporation',
        },
      }

      yahoofinance2.quote.mockResolvedValue(mockQuotes)

      const result = await service.getMultipleQuotes(['AAPL', 'MSFT'])

      expect(yahoofinance2.quote).toHaveBeenCalledWith(['AAPL', 'MSFT'])
      expect(result).toHaveLength(2)
      expect(result[0].symbol).toBe('AAPL')
      expect(result[1].symbol).toBe('MSFT')
    })

    it('should handle empty symbol array', async () => {
      const result = await service.getMultipleQuotes([])

      expect(yahoofinance2.quote).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should filter out invalid quotes', async () => {
      const mockQuotes = {
        AAPL: {
          price: 150.25,
          regularMarketPrice: 150.25,
          regularMarketChange: 2.5,
          regularMarketChangePercent: 1.67,
          symbol: 'AAPL',
          shortName: 'Apple Inc.',
        },
        INVALID: null, // Invalid quote
      }

      yahoofinance2.quote.mockResolvedValue(mockQuotes)

      const result = await service.getMultipleQuotes(['AAPL', 'INVALID'])

      expect(result).toHaveLength(1)
      expect(result[0].symbol).toBe('AAPL')
    })
  })

  describe('convertResolutionToInterval', () => {
    it('should convert resolution strings to intervals correctly', () => {
      expect(service.convertResolutionToInterval('1')).toBe('1m')
      expect(service.convertResolutionToInterval('5')).toBe('5m')
      expect(service.convertResolutionToInterval('15')).toBe('15m')
      expect(service.convertResolutionToInterval('30')).toBe('30m')
      expect(service.convertResolutionToInterval('60')).toBe('1h')
      expect(service.convertResolutionToInterval('240')).toBe('4h')
      expect(service.convertResolutionToInterval('D')).toBe('1d')
      expect(service.convertResolutionToInterval('W')).toBe('1wk')
      expect(service.convertResolutionToInterval('M')).toBe('1mo')
    })

    it('should return default interval for unknown resolution', () => {
      expect(service.convertResolutionToInterval('unknown')).toBe('1d')
    })
  })

  describe('getCandlesWithResolution', () => {
    it('should get candles with converted resolution', async () => {
      const mockCandles = [
        {
          date: new Date('2023-01-01'),
          open: 150,
          high: 155,
          low: 148,
          close: 152,
          volume: 1000000,
          adjClose: 152,
        },
      ]

      yahoofinance2.historical.mockResolvedValue(mockCandles)

      const result = await service.getCandlesWithResolution('AAPL', 'D')

      expect(yahoofinance2.historical).toHaveBeenCalledWith('AAPL', {
        interval: '1d',
        period1: expect.any(Date),
      })
      expect(result).toEqual(mockCandles)
    })
  })

  describe('getNews', () => {
    it('should fetch news successfully', async () => {
      const mockNews = [
        {
          title: 'Apple Reports Strong Quarterly Results',
          link: 'https://example.com/news1',
          pubDate: new Date('2023-01-01'),
          publisher: 'Reuters',
          summary: 'Apple reported strong quarterly results...',
        },
        {
          title: 'New iPhone Launch Expected',
          link: 'https://example.com/news2',
          pubDate: new Date('2023-01-02'),
          publisher: 'Bloomberg',
          summary: 'Apple is expected to launch new iPhone...',
        },
      ]

      yahoofinance2.news.mockResolvedValue(mockNews)

      const result = await service.getNews('AAPL')

      expect(yahoofinance2.news).toHaveBeenCalledWith('AAPL')
      expect(result).toEqual([
        {
          title: 'Apple Reports Strong Quarterly Results',
          url: 'https://example.com/news1',
          publishedAt: mockNews[0].pubDate,
          source: 'Reuters',
          summary: 'Apple reported strong quarterly results...',
        },
        {
          title: 'New iPhone Launch Expected',
          url: 'https://example.com/news2',
          publishedAt: mockNews[1].pubDate,
          source: 'Bloomberg',
          summary: 'Apple is expected to launch new iPhone...',
        },
      ])
    })

    it('should handle news API errors', async () => {
      yahoofinance2.news.mockRejectedValue(new Error('News API error'))

      await expect(service.getNews('AAPL')).rejects.toThrow('News API error')
    })

    it('should return empty array for no news', async () => {
      yahoofinance2.news.mockResolvedValue([])

      const result = await service.getNews('UNKNOWN')

      expect(result).toEqual([])
    })
  })

  describe('getCategoryNews', () => {
    it('should fetch category news successfully', async () => {
      const mockNews = [
        {
          title: 'Market Update',
          link: 'https://example.com/market1',
          pubDate: new Date('2023-01-01'),
          publisher: 'MarketWatch',
          summary: 'Stock market update...',
        },
      ]

      yahoofinance2.news.mockResolvedValue(mockNews)

      const result = await service.getCategoryNews('finance')

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Market Update')
      expect(result[0].source).toBe('MarketWatch')
    })
  })

  describe('rate limiting', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should implement rate limiting for API calls', async () => {
      const mockQuoteData = {
        price: 150.25,
        regularMarketPrice: 150.25,
        symbol: 'AAPL',
        shortName: 'Apple Inc.',
      }

      yahoofinance2.quote.mockResolvedValue(mockQuoteData)

      // Make first call
      const promise1 = service.getQuote('AAPL')

      // Make second call immediately
      const promise2 = service.getQuote('MSFT')

      // Advance time to simulate rate limit delay
      vi.advanceTimersByTime(1000)

      await Promise.all([promise1, promise2])

      // Should have been called twice but with rate limiting
      expect(yahoofinance2.quote).toHaveBeenCalledTimes(2)
    })
  })

  describe('caching', () => {
    it('should cache quote data and retrieve from cache', () => {
      const mockQuote = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
      }

      // Set cache
      service.setCachedQuote('AAPL', mockQuote)

      // Get from cache
      const cached = service.getCachedQuote('AAPL')

      expect(cached).toEqual(mockQuote)
    })

    it('should return null for non-existent cache entry', () => {
      const cached = service.getCachedQuote('NONEXISTENT')

      expect(cached).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'

      yahoofinance2.quote.mockRejectedValue(timeoutError)

      await expect(service.getQuote('AAPL')).rejects.toThrow('Request timeout')
    })

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      rateLimitError.name = 'RateLimitError'

      yahoofinance2.quote.mockRejectedValue(rateLimitError)

      await expect(service.getQuote('AAPL')).rejects.toThrow('Rate limit exceeded')
    })

    it('should handle malformed API responses', async () => {
      yahoofinance2.quote.mockResolvedValue(null)

      await expect(service.getQuote('AAPL')).rejects.toThrow()
    })
  })

  describe('data transformation', () => {
    it('should handle missing fields in quote data', async () => {
      const incompleteQuoteData = {
        symbol: 'AAPL',
        regularMarketPrice: 150.25,
        // Missing other fields
      }

      yahoofinance2.quote.mockResolvedValue(incompleteQuoteData)

      const result = await service.getQuote('AAPL')

      expect(result.symbol).toBe('AAPL')
      expect(result.price).toBe(150.25)
      expect(result.name).toBeUndefined() // Should handle missing shortName gracefully
    })
  })
})
