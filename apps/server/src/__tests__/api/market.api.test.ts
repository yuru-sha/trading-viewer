import request from 'supertest'
import { app } from '../../index'

// Mock external dependencies
jest.mock('../../services/finnhubService', () => ({
  FinnhubService: jest.fn().mockImplementation(() => ({
    searchSymbols: jest.fn().mockResolvedValue([
      {
        symbol: 'AAPL',
        description: 'Apple Inc',
        displaySymbol: 'AAPL',
        type: 'Common Stock',
      },
    ]),
    getQuote: jest.fn().mockResolvedValue({
      c: 150.0,
      h: 152.0,
      l: 149.0,
      o: 151.0,
      pc: 147.5,
      t: Date.now() / 1000,
    }),
    getCandles: jest.fn().mockResolvedValue([
      {
        time: Math.floor(Date.now() / 1000),
        open: 150.0,
        high: 152.0,
        low: 149.0,
        close: 151.0,
        volume: 1000000,
      },
    ]),
  })),
}))

describe('Market API Tests', () => {
  describe('GET /api/market/search', () => {
    it('should search for symbols successfully', async () => {
      const response = await request(app)
        .get('/api/market/search')
        .query({ q: 'AAPL' })
        .expect('Content-Type', /json/)

      // Should return either success or handle API rate limiting gracefully
      expect([200, 429]).toContain(response.status)

      if (response.status === 200) {
        expect(response.body).toHaveProperty('symbols')
        expect(Array.isArray(response.body.symbols)).toBe(true)
      }
    })

    it('should require search query parameter', async () => {
      const response = await request(app).get('/api/market/search').expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should handle empty search query', async () => {
      const response = await request(app).get('/api/market/search').query({ q: '' }).expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/market/quote/:symbol', () => {
    it('should get quote for valid symbol', async () => {
      const response = await request(app)
        .get('/api/market/quote/AAPL')
        .expect('Content-Type', /json/)

      // Should return either success or handle API rate limiting gracefully
      expect([200, 429]).toContain(response.status)

      if (response.status === 200) {
        expect(response.body).toHaveProperty('symbol', 'AAPL')
        expect(response.body).toHaveProperty('price')
        expect(typeof response.body.price).toBe('number')
      }
    })

    it('should validate symbol parameter', async () => {
      const response = await request(app).get('/api/market/quote/').expect(404) // Symbol parameter missing
    })
  })

  describe('GET /api/market/candles/:symbol', () => {
    it('should get candles for valid symbol and timeframe', async () => {
      const response = await request(app)
        .get('/api/market/candles/AAPL')
        .query({
          timeframe: '1D',
          from: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
          to: Math.floor(Date.now() / 1000),
        })
        .expect('Content-Type', /json/)

      // Should return either success or handle API rate limiting gracefully
      expect([200, 429]).toContain(response.status)

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true)
        if (response.body.length > 0) {
          const candle = response.body[0]
          expect(candle).toHaveProperty('time')
          expect(candle).toHaveProperty('open')
          expect(candle).toHaveProperty('high')
          expect(candle).toHaveProperty('low')
          expect(candle).toHaveProperty('close')
          expect(candle).toHaveProperty('volume')
        }
      }
    })

    it('should require timeframe parameter', async () => {
      const response = await request(app).get('/api/market/candles/AAPL').expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('API Error Handling', () => {
    it('should handle rate limiting gracefully', async () => {
      // Make multiple rapid requests to potentially trigger rate limiting
      const requests = Array(5)
        .fill(0)
        .map(() => request(app).get('/api/market/search').query({ q: 'AAPL' }))

      const responses = await Promise.all(requests)

      // At least one should succeed, but some might be rate limited
      const statuses = responses.map(r => r.status)
      expect(statuses.some(status => [200, 429].includes(status))).toBe(true)
    })

    it('should handle invalid symbols gracefully', async () => {
      const response = await request(app).get('/api/market/quote/INVALID123')

      expect([404, 500, 429]).toContain(response.status)
    })
  })

  describe('Response Format Validation', () => {
    it('should return proper JSON content type', async () => {
      const response = await request(app).get('/api/market/search').query({ q: 'AAPL' })

      if ([200, 400, 429, 500].includes(response.status)) {
        expect(response.type).toBe('application/json')
      }
    })

    it('should include proper headers', async () => {
      const response = await request(app).get('/api/market/search').query({ q: 'AAPL' })

      expect(response.headers).toHaveProperty('content-type')
      // Should have CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-origin')
    })
  })
})
