import { api } from '../apiClient'
import { vi } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

const mockFetch = global.fetch as any

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Market API', () => {
    describe('searchSymbols', () => {
      it('should search symbols successfully', async () => {
        const mockResponse = {
          data: [
            { symbol: 'AAPL', description: 'Apple Inc.' },
            { symbol: 'GOOGL', description: 'Alphabet Inc.' },
          ],
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response)

        const result = await api.market.searchSymbols('apple')

        expect(mockFetch).toHaveBeenCalledWith('/api/market/symbols/search?q=apple')
        expect(result).toEqual(mockResponse.data)
      })

      it('should handle search errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response)

        await expect(api.market.searchSymbols('invalid')).rejects.toThrow('HTTP error! status: 500')
      })
    })

    describe('getQuote', () => {
      it('should get quote successfully', async () => {
        const mockQuote = {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.5,
          changePercent: 1.67,
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockQuote }),
        } as Response)

        const result = await api.market.getQuote('AAPL')

        expect(mockFetch).toHaveBeenCalledWith('/api/market/quote/AAPL')
        expect(result).toEqual(mockQuote)
      })

      it('should handle quote errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)

        await expect(api.market.getQuote('INVALID')).rejects.toThrow('HTTP error! status: 404')
      })
    })

    describe('getCandleData', () => {
      it('should get candle data successfully', async () => {
        const mockCandleData = {
          c: [150, 151, 152],
          h: [151, 152, 153],
          l: [149, 150, 151],
          o: [149.5, 150.5, 151.5],
          t: [1640995200, 1641081600, 1641168000],
          v: [1000000, 1100000, 1200000],
          s: 'ok',
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockCandleData }),
        } as Response)

        const params = {
          symbol: 'AAPL',
          resolution: 'D',
          from: 1640995200,
          to: 1641168000,
        }

        const result = await api.market.getCandleData(params)

        expect(mockFetch).toHaveBeenCalledWith(
          `/api/market/candles?symbol=AAPL&resolution=D&from=1640995200&to=1641168000`
        )
        expect(result).toEqual(mockCandleData)
      })

      it('should handle candle data errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        } as Response)

        const params = {
          symbol: 'INVALID',
          resolution: 'D',
          from: 1640995200,
          to: 1641168000,
        }

        await expect(api.market.getCandleData(params)).rejects.toThrow('HTTP error! status: 400')
      })
    })

    describe('getCompanyProfile', () => {
      it('should get company profile successfully', async () => {
        const mockProfile = {
          name: 'Apple Inc.',
          ticker: 'AAPL',
          country: 'US',
          currency: 'USD',
          exchange: 'NASDAQ',
          ipo: '1980-12-12',
          marketCapitalization: 3000000,
          shareOutstanding: 16000000,
          weburl: 'https://www.apple.com',
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockProfile }),
        } as Response)

        const result = await api.market.getCompanyProfile('AAPL')

        expect(mockFetch).toHaveBeenCalledWith('/api/market/company-profile/AAPL')
        expect(result).toEqual(mockProfile)
      })
    })

    describe('getMarketNews', () => {
      it('should get market news successfully', async () => {
        const mockNews = [
          {
            id: 1,
            headline: 'Apple reports strong quarterly results',
            summary: 'Apple Inc. reported better than expected...',
            url: 'https://example.com/news/1',
            datetime: 1640995200,
            source: 'Reuters',
          },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockNews }),
        } as Response)

        const result = await api.market.getMarketNews('AAPL')

        expect(mockFetch).toHaveBeenCalledWith('/api/market/news/AAPL')
        expect(result).toEqual(mockNews)
      })

      it('should get general market news when no symbol provided', async () => {
        const mockNews = [
          {
            id: 1,
            headline: 'Market closes higher',
            summary: 'Stock market closed higher today...',
            url: 'https://example.com/news/1',
            datetime: 1640995200,
            source: 'Bloomberg',
          },
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockNews }),
        } as Response)

        const result = await api.market.getMarketNews()

        expect(mockFetch).toHaveBeenCalledWith('/api/market/news')
        expect(result).toEqual(mockNews)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(api.market.getQuote('AAPL')).rejects.toThrow('Network error')
    })

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as Response)

      await expect(api.market.getQuote('AAPL')).rejects.toThrow('Invalid JSON')
    })
  })
})
