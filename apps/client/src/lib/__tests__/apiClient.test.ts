import { api } from '../apiClient'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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

        const result = await api.market.searchSymbols({ q: 'apple' })

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/market/search?q=apple',
          expect.objectContaining({
            credentials: 'include',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        )
        expect(result).toEqual(mockResponse)
      })

      it('should handle search errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response)

        await expect(api.market.searchSymbols({ q: 'invalid' })).rejects.toThrow('HTTP 500: Internal Server Error')
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

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/market/quote/AAPL',
          expect.objectContaining({
            credentials: 'include',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        )
        expect(result).toEqual({ data: mockQuote })
      })

      it('should handle quote errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)

        await expect(api.market.getQuote('INVALID')).rejects.toThrow('HTTP 404: Not Found')
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
          'http://localhost:8000/api/market/candles/AAPL?resolution=D&from=1640995200&to=1641168000',
          expect.objectContaining({
            credentials: 'include',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        )
        expect(result).toEqual({ data: mockCandleData })
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

        await expect(api.market.getCandleData(params)).rejects.toThrow('HTTP 400: Bad Request')
      })
    })

    describe('getRateLimit', () => {
      it('should get rate limit info successfully', async () => {
        const mockRateLimit = {
          limit: 1000,
          remaining: 950,
          resetTime: 1640999800,
          canMakeRequest: true,
          timeUntilReset: 3600
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockRateLimit,
        } as Response)

        const result = await api.market.getRateLimit()

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/market/rate-limit',
          expect.objectContaining({
            credentials: 'include',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        )
        expect(result).toEqual(mockRateLimit)
      })
    })

    describe('getDataSource', () => {
      it('should get data source info successfully', async () => {
        const mockDataSource = {
          isMockData: false,
          provider: 'Yahoo Finance',
          status: 'active',
          description: 'Real-time market data'
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockDataSource,
        } as Response)

        const result = await api.market.getDataSource()

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/market/data-source',
          expect.objectContaining({
            credentials: 'include',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        )
        expect(result).toEqual(mockDataSource)
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
