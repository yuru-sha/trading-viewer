import request from 'supertest'
import express from 'express'
import cors from 'cors'

// Create a simple test app without complex dependencies
const createTestApp = () => {
  const app = express()

  app.use(cors())
  app.use(express.json())

  // Simple health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.1.0',
    })
  })

  // Simple API info endpoint
  app.get('/api', (req, res) => {
    res.json({
      name: 'TradingViewer API',
      version: '0.1.0',
      description: 'Trading data and market information API',
    })
  })

  // Mock market search endpoint
  app.get('/api/market/search', (req, res) => {
    const { q } = req.query

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Query parameter "q" is required and must be non-empty',
      })
    }

    // Mock response
    res.json({
      symbols: [
        {
          symbol: q.toUpperCase(),
          description: `${q.toUpperCase()} Test Company`,
          displaySymbol: q.toUpperCase(),
          type: 'Common Stock',
        },
      ],
    })
  })

  // Mock quote endpoint
  app.get('/api/market/quote/:symbol', (req, res) => {
    const { symbol } = req.params

    res.json({
      symbol: symbol.toUpperCase(),
      price: 150.0 + Math.random() * 10,
      change: Math.random() * 5 - 2.5,
      changePercent: Math.random() * 2 - 1,
      timestamp: Date.now(),
    })
  })

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.originalUrl,
    })
  })

  return app
}

describe('Supertest API Tests', () => {
  let app: express.Application

  beforeAll(() => {
    app = createTestApp()
  })

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200).expect('Content-Type', /json/)

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
      })
    })
  })

  describe('API Information', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/api').expect(200).expect('Content-Type', /json/)

      expect(response.body).toMatchObject({
        name: expect.any(String),
        version: expect.any(String),
        description: expect.any(String),
      })
    })
  })

  describe('Market Search', () => {
    it('should search symbols successfully', async () => {
      const response = await request(app)
        .get('/api/market/search')
        .query({ q: 'AAPL' })
        .expect(200)
        .expect('Content-Type', /json/)

      expect(response.body).toHaveProperty('symbols')
      expect(Array.isArray(response.body.symbols)).toBe(true)
      expect(response.body.symbols[0]).toMatchObject({
        symbol: 'AAPL',
        description: expect.any(String),
        displaySymbol: 'AAPL',
        type: expect.any(String),
      })
    })

    it('should require query parameter', async () => {
      const response = await request(app)
        .get('/api/market/search')
        .expect(400)
        .expect('Content-Type', /json/)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Query parameter')
    })

    it('should reject empty query', async () => {
      const response = await request(app)
        .get('/api/market/search')
        .query({ q: '' })
        .expect(400)
        .expect('Content-Type', /json/)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('Market Quotes', () => {
    it('should return quote for symbol', async () => {
      const response = await request(app)
        .get('/api/market/quote/AAPL')
        .expect(200)
        .expect('Content-Type', /json/)

      expect(response.body).toMatchObject({
        symbol: 'AAPL',
        price: expect.any(Number),
        change: expect.any(Number),
        changePercent: expect.any(Number),
        timestamp: expect.any(Number),
      })
    })

    it('should handle different symbols', async () => {
      const symbols = ['GOOGL', 'MSFT', 'TSLA']

      for (const symbol of symbols) {
        const response = await request(app).get(`/api/market/quote/${symbol}`).expect(200)

        expect(response.body.symbol).toBe(symbol)
      }
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown/route')
        .expect(404)
        .expect('Content-Type', /json/)

      expect(response.body).toMatchObject({
        error: 'Not Found',
        path: '/unknown/route',
      })
    })

    it('should handle POST requests properly', async () => {
      const response = await request(app).post('/api/market/search').send({ q: 'AAPL' }).expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app).get('/health').expect(200)

      expect(response.headers).toHaveProperty('access-control-allow-origin')
    })

    it('should handle OPTIONS requests', async () => {
      const response = await request(app).options('/api').expect(204) // CORS preflight typically returns 204

      expect(response.headers).toHaveProperty('access-control-allow-origin')
    })
  })

  describe('Request/Response Timing', () => {
    it('should respond within reasonable time', async () => {
      const start = Date.now()

      await request(app).get('/health').expect(200)

      const duration = Date.now() - start
      expect(duration).toBeLessThan(1000) // Should respond within 1 second
    })

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10)
        .fill(0)
        .map((_, i) => request(app).get(`/api/market/quote/TEST${i}`))

      const responses = await Promise.all(requests)

      responses.forEach((response, i) => {
        expect(response.status).toBe(200)
        expect(response.body.symbol).toBe(`TEST${i}`)
      })
    })
  })
})
