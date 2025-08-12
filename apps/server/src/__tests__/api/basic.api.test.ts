import request from 'supertest'
import { app } from '../../index'

describe('Basic API Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200)

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
      })
    })
  })

  describe('API Root', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/api').expect(200)

      expect(response.body).toHaveProperty('name')
      expect(response.body).toHaveProperty('version')
      expect(response.body).toHaveProperty('description')
    })
  })

  describe('Not Found Routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route').expect(404)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toBe('Not Found')
    })
  })

  describe('API Rate Limiting', () => {
    it('should have rate limiting configured', async () => {
      const response = await request(app).get('/api/market/rate-limit').expect(200)

      // Check for rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit')
      expect(response.headers).toHaveProperty('x-ratelimit-remaining')
    })
  })

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app).options('/api').expect(204)

      expect(response.headers).toHaveProperty('access-control-allow-origin')
      expect(response.headers).toHaveProperty('access-control-allow-methods')
    })
  })

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // This endpoint should trigger an error for testing
      const response = await request(app).get('/api/trigger-error')

      // Should not crash the server
      expect([404, 500]).toContain(response.status)
    })
  })
})
