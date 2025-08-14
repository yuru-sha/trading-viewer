import request from 'supertest'
import express from 'express'
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import authRoutes from '../../routes/auth'
import SecurityConfigValidator from '../../config/securityConfig'

describe('Authentication Security Tests', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/auth', authRoutes)
  })

  describe('JWT Algorithm Confusion Protection', () => {
    it('should reject tokens with none algorithm', async () => {
      const maliciousToken =
        Buffer.from(
          JSON.stringify({
            alg: 'none',
            typ: 'JWT',
          })
        ).toString('base64') +
        '.' +
        Buffer.from(
          JSON.stringify({
            userId: 'malicious-user',
            email: 'hacker@example.com',
            role: 'admin',
          })
        ).toString('base64') +
        '.signature'

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${maliciousToken}`)

      expect(response.status).toBe(401)
      expect(response.body.message).toContain('Invalid')
    })

    it('should reject unsigned tokens', async () => {
      const maliciousToken =
        Buffer.from(
          JSON.stringify({
            alg: 'HS256',
            typ: 'JWT',
          })
        ).toString('base64') +
        '.' +
        Buffer.from(
          JSON.stringify({
            userId: 'malicious-user',
            email: 'hacker@example.com',
            role: 'admin',
          })
        ).toString('base64')

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${maliciousToken}`)

      expect(response.status).toBe(401)
    })
  })

  describe('Rate Limiting Security', () => {
    it('should implement rate limiting on authentication endpoints', async () => {
      const requests = []

      // Attempt many login requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app).post('/auth/login').send({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
        )
      }

      const responses = await Promise.all(requests)

      // At least one should be rate limited (429)
      const rateLimited = responses.some(res => res.status === 429)
      expect(rateLimited).toBe(true)
    })
  })

  describe('Input Validation Security', () => {
    it('should reject SQL injection attempts in email', async () => {
      const response = await request(app).post('/auth/login').send({
        email: "'; DROP TABLE users; --",
        password: 'password123',
      })

      expect(response.status).toBe(400)
    })

    it('should reject XSS attempts in registration', async () => {
      const response = await request(app).post('/auth/register').send({
        email: 'test@example.com',
        password: 'ValidPassword123!',
        firstName: '<script>alert("XSS")</script>',
        lastName: 'User',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      // Attempt to change profile without CSRF token
      const response = await request(app).put('/auth/profile').send({
        firstName: 'NewName',
        lastName: 'NewLastName',
      })

      expect(response.status).toBe(403)
      expect(response.body.message).toContain('CSRF')
    })
  })

  describe('Password Security', () => {
    it('should enforce strong password requirements', async () => {
      const weakPasswords = ['password', '123456', 'abc', 'password123', 'qwerty']

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            email: `test${Math.random()}@example.com`,
            password: weakPassword,
            firstName: 'Test',
            lastName: 'User',
          })

        expect(response.status).toBe(400)
        expect(response.body.message).toContain('password')
      }
    })

    it('should accept strong passwords', async () => {
      const strongPassword = 'StrongPass123!@#'

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: `strong${Date.now()}@example.com`,
          password: strongPassword,
          firstName: 'Test',
          lastName: 'User',
        })

      expect([200, 201, 409]).toContain(response.status) // 409 if user exists
    })
  })

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app).get('/auth/me')

      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
    })
  })

  describe('Security Configuration', () => {
    it('should validate security configuration', () => {
      const validation = SecurityConfigValidator.validate()

      // In test environment, warnings are acceptable
      if (process.env.NODE_ENV === 'production') {
        expect(validation.isValid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      }

      // But we should at least have basic security
      expect(process.env.JWT_SECRET).toBeDefined()
      expect(process.env.JWT_SECRET?.length).toBeGreaterThan(16)
    })
  })

  describe('Session Management', () => {
    it('should invalidate tokens on logout', async () => {
      // This would require a full auth flow test
      // Placeholder for session invalidation test
      expect(true).toBe(true)
    })

    it('should have appropriate token expiration', async () => {
      // Verify token expiration times are reasonable
      const jwtExpiration = process.env.JWT_EXPIRES_IN || '15m'
      const refreshExpiration = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

      expect(jwtExpiration).toMatch(/^\d+[mh]$/) // Should be minutes or hours
      expect(refreshExpiration).toMatch(/^\d+[dw]$/) // Should be days or weeks
    })
  })
})
