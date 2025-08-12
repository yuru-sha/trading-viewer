import request from 'supertest'
import express from 'express'
import marketRoutes from '../../routes/market'
import { getFinnhubService, resetFinnhubService } from '../../services/finnhubService'
import { NormalizedSymbol, NormalizedQuote, NormalizedCandleResponse } from '@trading-viewer/shared'

// Mock the finnhub service
jest.mock('../../services/finnhubService', () => ({
  getFinnhubService: jest.fn(),
  resetFinnhubService: jest.fn(),
  FinnhubService: jest.fn(),
}))

const mockFinnhubService = {
  searchSymbols: jest.fn(),
  getQuote: jest.fn(),
  getCandleData: jest.fn(),
  getRateLimitInfo: jest.fn(),
  canMakeRequest: jest.fn(),
  getTimeUntilReset: jest.fn(),
}

describe('Market API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    // Set up test environment variables
    process.env.FINNHUB_API_KEY = 'test-api-key'

    // Mock getFinnhubService to return our mock service
    ;(getFinnhubService as jest.Mock).mockReturnValue(mockFinnhubService)

    // Create test app
    app = express()
    app.use(express.json())
    app.use('/api/market', marketRoutes)

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    delete process.env.FINNHUB_API_KEY
  })

  describe('GET /api/market/search', () => {
    it('should search symbols successfully', async () => {
      const mockSymbols: NormalizedSymbol[] = [
        {
          symbol: 'AAPL',
          description: 'Apple Inc',
          displaySymbol: 'AAPL',
          type: 'Common Stock',
          currency: 'USD',
        },
      ]

      mockFinnhubService.searchSymbols.mockResolvedValue(mockSymbols)

      const response = await request(app).get('/api/market/search').query({ q: 'AAPL' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        symbols: mockSymbols,
        query: 'AAPL',
        count: 1,
      })
      expect(mockFinnhubService.searchSymbols).toHaveBeenCalledWith({
        q: 'AAPL',
        limit: undefined,
      })
    })

    it('should return error for missing query parameter', async () => {
      const response = await request(app).get('/api/market/search')

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('VALIDATION_ERROR')
      expect(response.body.message).toBe('Request validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'q',
            message: 'Required',
          }),
        ])
      )
    })

    it('should return error for invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/market/search')
        .query({ q: 'AAPL', limit: '100' })

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('VALIDATION_ERROR')
      expect(response.body.message).toBe('Request validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'limit',
            message: expect.stringContaining('50'),
          }),
        ])
      )
    })

    it('should handle service errors', async () => {
      mockFinnhubService.searchSymbols.mockRejectedValue({
        code: 'FINNHUB_API_ERROR_429',
        message: 'Rate limit exceeded',
        statusCode: 429,
      })

      const response = await request(app).get('/api/market/search').query({ q: 'AAPL' })

      expect(response.status).toBe(429)
      expect(response.body).toEqual({
        code: 'FINNHUB_API_ERROR_429',
        message: 'Rate limit exceeded',
        statusCode: 429,
      })
    })
  })

  describe('GET /api/market/quote/:symbol', () => {
    it('should get quote successfully', async () => {
      const mockQuote: NormalizedQuote = {
        symbol: 'AAPL',
        price: 150.0,
        change: 2.5,
        changePercent: 1.69,
        high: 152.0,
        low: 148.0,
        open: 149.0,
        previousClose: 147.5,
        timestamp: 1640995200,
      }

      mockFinnhubService.getQuote.mockResolvedValue(mockQuote)

      const response = await request(app).get('/api/market/quote/AAPL')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockQuote)
      expect(mockFinnhubService.getQuote).toHaveBeenCalledWith({
        symbol: 'AAPL',
      })
    })

    it('should handle missing symbol parameter', async () => {
      const response = await request(app).get('/api/market/quote/')

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/market/candles/:symbol', () => {
    it('should get candle data successfully', async () => {
      const mockCandleData: NormalizedCandleResponse = {
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

      mockFinnhubService.getCandleData.mockResolvedValue(mockCandleData)

      const response = await request(app).get('/api/market/candles/AAPL').query({
        resolution: 'D',
        from: '1640995200',
        to: '1641081600',
      })

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockCandleData)
      expect(mockFinnhubService.getCandleData).toHaveBeenCalledWith({
        symbol: 'AAPL',
        resolution: 'D',
        from: 1640995200,
        to: 1641081600,
      })
    })

    it('should return error for missing parameters', async () => {
      const response = await request(app).get('/api/market/candles/AAPL')

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('QUERY_VALIDATION_ERROR')
      expect(response.body.message).toBe('Query parameters validation failed')
    })

    it('should return error for invalid resolution', async () => {
      const response = await request(app).get('/api/market/candles/AAPL').query({
        resolution: 'INVALID',
        from: '1640995200',
        to: '1641081600',
      })

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('QUERY_VALIDATION_ERROR')
      expect(response.body.message).toBe('Query parameters validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'query.resolution',
            message: expect.stringContaining('Invalid enum value'),
          }),
        ])
      )
    })

    it('should return error for invalid time range', async () => {
      const response = await request(app).get('/api/market/candles/AAPL').query({
        resolution: 'D',
        from: '1641081600',
        to: '1640995200',
      })

      expect(response.status).toBe(400)
      expect(response.body.code).toBe('QUERY_VALIDATION_ERROR')
      expect(response.body.message).toBe('Query parameters validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'From timestamp must be less than to timestamp',
          }),
        ])
      )
    })
  })

  describe('GET /api/market/rate-limit', () => {
    it('should return rate limit info', async () => {
      const mockRateLimitInfo = {
        limit: 60,
        remaining: 45,
        resetTime: Date.now() + 60000,
      }

      mockFinnhubService.getRateLimitInfo.mockReturnValue(mockRateLimitInfo)
      mockFinnhubService.canMakeRequest.mockReturnValue(true)
      mockFinnhubService.getTimeUntilReset.mockReturnValue(60000)

      const response = await request(app).get('/api/market/rate-limit')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        ...mockRateLimitInfo,
        canMakeRequest: true,
        timeUntilReset: 60000,
      })
    })
  })
})
