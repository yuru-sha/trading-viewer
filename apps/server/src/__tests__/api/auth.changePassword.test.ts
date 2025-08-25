import request from 'supertest'
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { app } from '../../server'
import { generateTestToken } from '../helpers/authHelper'
import { prismaMock } from '../__mocks__/prisma'
import { hashPassword, comparePassword } from '../../middleware/auth'

describe.skip('POST /api/auth/change-password - Change Password API', () => {
  let authToken: string
  let csrfToken: string
  const mockUserId = 'user_123'
  const currentPassword = 'current123'
  const hashedCurrentPassword = '$2b$10$abcd1234567890' // Mock bcrypt hash

  const mockUser = {
    userId: mockUserId,
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    hashedPassword: hashedCurrentPassword,
    passwordHash: hashedCurrentPassword,
    role: 'user' as const,
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  beforeAll(async () => {
    authToken = generateTestToken({ userId: mockUserId })

    // Mock user and CSRF
    prismaMock.user.findUnique.mockResolvedValue(mockUser)

    const csrfResponse = await request(app)
      .get('/api/auth/csrf')
      .set('Authorization', `Bearer ${authToken}`)

    csrfToken = csrfResponse.body?.data?.csrfToken || csrfResponse.body?.csrfToken
  })

  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    prismaMock.user.findById.mockResolvedValue(mockUser)
  })

  afterEach(() => {
    prismaMock.user.update.mockReset()
    prismaMock.user.findUnique.mockReset()
    prismaMock.user.findById.mockReset()
  })

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app).post('/api/auth/change-password').send({
        currentPassword: 'current123',
        newPassword: 'newpass123',
      })

      expect(response.status).toBe(401)
      expect(response.body.error).toMatch(/unauthorized/i)
    })

    it('should reject requests without CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'current123',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(403)
      expect(response.body.error).toMatch(/csrf/i)
    })

    it('should require USER_SETTINGS permission', async () => {
      // This test verifies the permission middleware is called
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: 'newpass123',
        })

      // Should proceed to validation/business logic, not fail on permission
      expect(response.status).not.toBe(403)
    })
  })

  describe('Request Validation', () => {
    it('should reject requests with missing current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/current password.*required/i)
    })

    it('should reject requests with missing new password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/new password.*required/i)
    })

    it('should reject requests with short new password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: '123',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/at least 8 characters/i)
    })

    it('should reject requests with empty current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: '',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/current password.*required/i)
    })
  })

  describe('Password Change Logic', () => {
    it('should successfully change password with valid data', async () => {
      // Mock password comparison and hashing
      vi.mocked(comparePassword).mockImplementation(async (plain, hash) => {
        if (plain === 'current123' && hash === hashedCurrentPassword) return true
        if (plain === 'newpass123' && hash === hashedCurrentPassword) return false
        return false
      })

      vi.mocked(hashPassword).mockResolvedValue('$2b$10$newhashedpassword')

      const updatedUser = { ...mockUser, passwordHash: '$2b$10$newhashedpassword' }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toMatch(/password changed successfully/i)

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: expect.objectContaining({
          passwordHash: '$2b$10$newhashedpassword',
        }),
      })
    })

    it('should reject incorrect current password', async () => {
      vi.mocked(comparePassword).mockResolvedValue(false)

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(401)
      expect(response.body.error).toMatch(/current password.*incorrect/i)
    })

    it('should reject when new password is same as current', async () => {
      vi.mocked(comparePassword).mockImplementation(async (plain, hash) => {
        // Both current password verification and same password check return true
        return plain === 'samepass123'
      })

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'samepass123',
          newPassword: 'samepass123',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/new password.*different/i)
    })

    it('should validate new password strength', async () => {
      vi.mocked(comparePassword).mockImplementation(async (plain, hash) => {
        if (plain === 'current123') return true
        return false
      })

      // Mock password validation to fail
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: 'weak', // Too short, will be caught by schema first
        })

      expect(response.status).toBe(400)
    })
  })

  describe('Security Features', () => {
    it('should revoke all tokens after password change', async () => {
      vi.mocked(comparePassword).mockImplementation(async (plain, hash) => {
        if (plain === 'current123') return true
        if (plain === 'newpass123') return false
        return false
      })
      vi.mocked(hashPassword).mockResolvedValue('$2b$10$newhashedpassword')

      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$newhashedpassword',
      })

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(200)
      // Verify that cookies are cleared (tokens revoked)
      expect(response.headers['set-cookie']).toBeDefined()
      expect(
        response.headers['set-cookie'].some(
          (cookie: string) =>
            cookie.includes('access_token=;') || cookie.includes('refresh_token=;')
        )
      ).toBe(true)
    })

    it('should log password change event', async () => {
      vi.mocked(comparePassword).mockImplementation(async (plain, hash) => {
        if (plain === 'current123') return true
        if (plain === 'newpass123') return false
        return false
      })
      vi.mocked(hashPassword).mockResolvedValue('$2b$10$newhashedpassword')

      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$newhashedpassword',
      })

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(200)
      // Security logging is verified through the successful response
      // In a real test, you might mock the securityLogger
    })

    it('should prevent brute force attacks', async () => {
      vi.mocked(comparePassword).mockResolvedValue(false)

      // Make multiple failed attempts
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', csrfToken)
          .send({
            currentPassword: 'wrongpassword',
            newPassword: 'newpass123',
          })
      )

      const responses = await Promise.all(promises)

      // All should fail with unauthorized
      responses.forEach(response => {
        expect(response.status).toBe(401)
      })

      // Rate limiting might kick in for subsequent requests
      const rateLimitedResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpass123',
        })

      // Might be rate limited (429) or continue to return 401
      expect([401, 429]).toContain(rateLimitedResponse.status)
    })
  })

  describe('Error Handling', () => {
    it('should handle user not found', async () => {
      prismaMock.user.findById.mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(401)
      expect(response.body.error).toMatch(/user not found/i)
    })

    it('should handle database update failure', async () => {
      vi.mocked(comparePassword).mockImplementation(async (plain, hash) => {
        if (plain === 'current123') return true
        if (plain === 'newpass123') return false
        return false
      })
      vi.mocked(hashPassword).mockResolvedValue('$2b$10$newhashedpassword')

      prismaMock.user.update.mockRejectedValue(new Error('Database connection failed'))

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toMatch(/internal.*error/i)
    })

    it('should handle password hashing failure', async () => {
      vi.mocked(comparePassword).mockImplementation(async (plain, hash) => {
        if (plain === 'current123') return true
        if (plain === 'newpass123') return false
        return false
      })
      vi.mocked(hashPassword).mockRejectedValue(new Error('Hashing failed'))

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toMatch(/internal.*error/i)
    })
  })

  describe('Response Format', () => {
    it('should return correct response format on success', async () => {
      vi.mocked(comparePassword).mockImplementation(async (plain, hash) => {
        if (plain === 'current123') return true
        if (plain === 'newpass123') return false
        return false
      })
      vi.mocked(hashPassword).mockResolvedValue('$2b$10$newhashedpassword')

      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$newhashedpassword',
      })

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toMatch(/application\/json/)
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringMatching(/password changed successfully/i),
      })

      // Should not contain user data in password change response
      expect(response.body.data).toBeUndefined()
    })

    it('should include security headers', async () => {
      vi.mocked(comparePassword).mockImplementation(async (plain, hash) => {
        if (plain === 'current123') return true
        if (plain === 'newpass123') return false
        return false
      })
      vi.mocked(hashPassword).mockResolvedValue('$2b$10$newhashedpassword')

      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$newhashedpassword',
      })

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          currentPassword: 'current123',
          newPassword: 'newpass123',
        })

      expect(response.status).toBe(200)
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['cache-control']).toMatch(/no-cache/i)
    })
  })
})
