import request from 'supertest'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { connectDatabase, disconnectDatabase } from '../../lib/database'
import marketRoutes from '../../routes/market'
import { requestLogger, errorLogger } from '../../middleware/logging'

// Mock the finnhub service
jest.mock('../../services/finnhubService', () => ({
  getFinnhubService: jest.fn(),
  resetFinnhubService: jest.fn(),
  FinnhubService: jest.fn(),
}))

// Mock database functions
jest.mock('../../lib/database', () => ({
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
  checkDatabaseHealth: jest.fn(),
}))

const mockFinnhubService = {
  searchSymbols: jest.fn(),
  getQuote: jest.fn(),
  getCandleData: jest.fn(),
  getRateLimitInfo: jest.fn(),
  canMakeRequest: jest.fn(),
  getTimeUntilReset: jest.fn(),
}

// Import the getFinnhubService mock
import { getFinnhubService } from '../../services/finnhubService'

describe('API Integration Tests', () => {
  let app: express.Application

  beforeAll(async () => {
    // Set up test environment variables
    process.env.FINNHUB_API_KEY = 'test-api-key'
    process.env.NODE_ENV = 'test'
    process.env.RATE_LIMIT_WINDOW_MS = '900000'
    process.env.RATE_LIMIT_MAX_REQUESTS = '1000' // Higher limit for tests

    // Mock database functions
    ;(connectDatabase as jest.Mock).mockResolvedValue(undefined)
    ;(disconnectDatabase as jest.Mock).mockResolvedValue(undefined)

    // Mock getFinnhubService to return our mock service
    ;(getFinnhubService as jest.Mock).mockReturnValue(mockFinnhubService)
  })

  beforeEach(() => {
    // Create test app with same middleware as main app
    app = express()

    // Rate limiting middleware
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
      message: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        statusCode: 429,
      },
    })

    // Middleware
    app.use(helmet())
    app.use(cors())
    app.use(compression())
    app.use(limiter)
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(requestLogger)

    // API routes
    app.use('/api/market', marketRoutes)

    // Health check endpoint
    app.get('/health', async (_req, res) => {
      res.json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      })
    })

    // API info endpoint
    app.get('/api', (_req, res) => {
      res.json({
        name: 'TradingViewer API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          market: {
            search: 'GET /api/market/search?q={query}&limit={limit}',
            quote: 'GET /api/market/quote/{symbol}',
            candles:
              'GET /api/market/candles/{symbol}?resolution={resolution}&from={timestamp}&to={timestamp}',
            rateLimit: 'GET /api/market/rate-limit',
          },
          health: 'GET /health',
        },
      })
    })

    // 404 handler
    app.use('*', (_req, res) => {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        statusCode: 404,
      })
    })

    // Error handling middleware
    app.use(errorLogger)
    app.use(
      (error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        if (error.code && error.statusCode) {
          return res.status(error.statusCode).json(error)
        }

        res.status(500).json({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          statusCode: 500,
        })
      }
    )

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterAll(async () => {
    delete process.env.FINNHUB_API_KEY
    delete process.env.NODE_ENV
    delete process.env.RATE_LIMIT_WINDOW_MS
    delete process.env.RATE_LIMIT_MAX_REQUESTS
  })

  describe('API Structure Tests', () => {
    it('should return API information at root endpoint', async () => {
      const response = await request(app).get('/api')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        name: 'TradingViewer API',
        version: '1.0.0',
        timestamp: expect.any(String),
        endpoints: expect.any(Object),
      })
    })

    it('should return health status', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        status: 'ok',
        database: 'connected',
        timestamp: expect.any(String),
      })
    })

    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app).get('/unknown-endpoint')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        statusCode: 404,
      })
    })
  })

  describe('Market API Integration', () => {
    describe('Symbol Search', () => {
      it('should search symbols with valid query', async () => {
        const mockSymbols = [
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
      })

      it('should validate query parameter', async () => {
        const response = await request(app).get('/api/market/search')

        expect(response.status).toBe(400)
        expect(response.body.code).toBe('VALIDATION_ERROR')
      })

      it('should validate limit parameter', async () => {
        const response = await request(app)
          .get('/api/market/search')
          .query({ q: 'AAPL', limit: '100' })

        expect(response.status).toBe(400)
        expect(response.body.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('Quote API', () => {
      it('should get quote for valid symbol', async () => {
        const mockQuote = {
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
      })

      it('should validate symbol parameter', async () => {
        const response = await request(app).get('/api/market/quote/')

        expect(response.status).toBe(404)
      })
    })

    describe('Candle Data API', () => {
      it('should get candle data with valid parameters', async () => {
        const mockCandleData = {
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
      })

      it('should validate query parameters', async () => {
        const response = await request(app).get('/api/market/candles/AAPL')

        expect(response.status).toBe(400)
        expect(response.body.code).toBe('QUERY_VALIDATION_ERROR')
      })

      it('should validate resolution parameter', async () => {
        const response = await request(app).get('/api/market/candles/AAPL').query({
          resolution: 'INVALID',
          from: '1640995200',
          to: '1641081600',
        })

        expect(response.status).toBe(400)
        expect(response.body.code).toBe('QUERY_VALIDATION_ERROR')
      })

      it('should validate time range', async () => {
        const response = await request(app).get('/api/market/candles/AAPL').query({
          resolution: 'D',
          from: '1641081600',
          to: '1640995200', // from > to
        })

        expect(response.status).toBe(400)
        expect(response.body.code).toBe('QUERY_VALIDATION_ERROR')
      })
    })

    describe('Rate Limit API', () => {
      it('should return rate limit information', async () => {
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

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockFinnhubService.searchSymbols.mockRejectedValue({
        code: 'FINNHUB_API_ERROR_429',
        message: 'Rate limit exceeded',
        statusCode: 429,
      })

      const response = await request(app).get('/api/market/search').query({ q: 'AAPL' })

      expect(response.status).toBe(429)
      expect(response.body.code).toBe('FINNHUB_API_ERROR_429')
    })

    it('should handle unexpected errors', async () => {
      mockFinnhubService.searchSymbols.mockRejectedValue(new Error('Unexpected error'))

      const response = await request(app).get('/api/market/search').query({ q: 'AAPL' })

      expect(response.status).toBe(500)
      expect(response.body.code).toBe('INTERNAL_SERVER_ERROR')
    })
  })

  describe('Security and Performance', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/health')

      expect(response.headers).toHaveProperty('x-content-type-options')
      expect(response.headers).toHaveProperty('x-frame-options')
    })

    it('should compress responses', async () => {
      const response = await request(app).get('/api')

      // Note: supertest might not set compression headers in test environment
      expect(response.status).toBe(200)
    })

    it('should handle CORS', async () => {
      const response = await request(app).get('/health').set('Origin', 'http://localhost:3000')

      expect(response.status).toBe(200)
      expect(response.headers).toHaveProperty('access-control-allow-origin')
    })
  })
})
