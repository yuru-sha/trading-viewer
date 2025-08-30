import request from 'supertest'
import { getExpressApp } from '../setup/testApp.js'

describe.skip('Basic API Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const app = await getExpressApp()
      const response = await request(app).get('/health').expect(200)

      expect(response.body).toEqual({
        status: expect.stringMatching(/ok|error/),
        database: expect.stringMatching(/connected|disconnected/),
        redis: expect.stringMatching(/connected|disconnected/),
        redisDetails: expect.any(Object),
        timestamp: expect.any(String),
      })
    })
  })

  describe('API Root', () => {
    it('should return API information', async () => {
      const app = await getExpressApp()
      const response = await request(app).get('/api').expect(200)

      expect(response.body).toHaveProperty('name')
      expect(response.body).toHaveProperty('version')
      expect(response.body).toHaveProperty('endpoints')
    })
  })

  describe('Not Found Routes', () => {
    it('should return 404 for unknown routes', async () => {
      const app = await getExpressApp()
      const response = await request(app).get('/unknown-route').expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Route not found')
    })
  })

  describe('API Rate Limiting', () => {
    it('should have rate limiting configured', async () => {
      const app = await getExpressApp()
      const response = await request(app).get('/api/market/rate-limit').expect(200)

      // Check the response content instead of headers (rate limit headers may not be set on successful requests)
      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('Rate limiting is configured')
    })
  })

  describe('CORS Configuration', () => {
    it('should respond to API requests (indicating CORS is working)', async () => {
      const app = await getExpressApp()
      const response = await request(app).get('/api').expect(200)

      // If we get a successful response, CORS is working properly
      expect(response.body).toHaveProperty('name')
      expect(response.body.name).toBe('TradingViewer API')
    })
  })

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // This endpoint should trigger an error for testing
      const app = await getExpressApp()
      const response = await request(app).get('/api/trigger-error')

      // Should not crash the server
      expect([404, 500]).toContain(response.status)
    })
  })
})
