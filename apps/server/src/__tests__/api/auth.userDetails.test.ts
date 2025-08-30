import request from 'supertest'
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { app } from '../../server'
import { generateTestToken } from '../helpers/authHelper'
import { prismaMock } from '../__mocks__/prisma'

describe.skip('PUT /api/auth/users/:userId - User Details Update API', () => {
  let adminAuthToken: string
  let userAuthToken: string
  let csrfToken: string
  const adminUserId = 'admin_123'
  const targetUserId = 'user_456'
  const regularUserId = 'user_789'

  const mockAdmin = {
    userId: adminUserId,
    id: adminUserId,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  const mockTargetUser = {
    userId: targetUserId,
    id: targetUserId,
    email: 'target@example.com',
    name: 'Target User',
    role: 'user' as const,
    isActive: true,
    isEmailVerified: true,
    timezone: 'UTC',
    language: 'en',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  }

  const mockRegularUser = {
    userId: regularUserId,
    id: regularUserId,
    email: 'regular@example.com',
    name: 'Regular User',
    role: 'user' as const,
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  }

  beforeAll(async () => {
    adminAuthToken = generateTestToken({ userId: adminUserId, role: 'admin' })
    userAuthToken = generateTestToken({ userId: regularUserId, role: 'user' })

    // Setup admin user mock
    prismaMock.user.findUnique.mockImplementation(async args => {
      const where = args?.where
      if (where?.userId === adminUserId || where?.email === 'admin@example.com') {
        return mockAdmin
      }
      if (where?.userId === targetUserId || where?.email === 'target@example.com') {
        return mockTargetUser
      }
      if (where?.userId === regularUserId || where?.email === 'regular@example.com') {
        return mockRegularUser
      }
      return null
    })

    const csrfResponse = await request(app)
      .get('/api/auth/csrf')
      .set('Authorization', `Bearer ${adminAuthToken}`)

    csrfToken = csrfResponse.body?.data?.csrfToken || csrfResponse.body?.csrfToken
  })

  beforeEach(() => {
    prismaMock.user.findById.mockImplementation(async id => {
      if (id === targetUserId) return mockTargetUser
      if (id === adminUserId) return mockAdmin
      if (id === regularUserId) return mockRegularUser
      return null
    })
  })

  afterEach(() => {
    prismaMock.user.update.mockReset()
    prismaMock.user.findById.mockReset()
  })

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app).put(`/api/auth/users/${targetUserId}`).send({
        name: 'Updated Name',
      })

      expect(response.status).toBe(401)
      expect(response.body.error).toMatch(/unauthorized/i)
    })

    it('should reject requests without CSRF token', async () => {
      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send({
          name: 'Updated Name',
        })

      expect(response.status).toBe(403)
      expect(response.body.error).toMatch(/csrf/i)
    })

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${userAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Updated Name',
        })

      expect(response.status).toBe(403)
      expect(response.body.error).toMatch(/admin/i)
    })
  })

  describe('Input Validation', () => {
    it('should validate name field length', async () => {
      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: '', // Empty name
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/validation/i)
    })

    it('should validate name maximum length', async () => {
      const longName = 'a'.repeat(101) // Exceeds 100 char limit

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: longName,
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/validation/i)
    })

    it('should validate language field format', async () => {
      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          language: 'x', // Too short
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/validation/i)
    })

    it('should validate role enum values', async () => {
      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          role: 'superuser', // Invalid role
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/validation/i)
    })

    it('should accept valid data', async () => {
      const updatedUser = {
        ...mockTargetUser,
        name: 'Updated Name',
        timezone: 'America/New_York',
        language: 'ja',
      }

      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Updated Name',
          timezone: 'America/New_York',
          language: 'ja',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('Profile Updates', () => {
    it('should successfully update display name', async () => {
      const updatedUser = { ...mockTargetUser, name: 'New Display Name' }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'New Display Name',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.name).toBe('New Display Name')

      expect(prismaMock.user.update).toHaveBeenCalledWith(targetUserId, {
        name: 'New Display Name',
      })
    })

    it('should successfully update timezone', async () => {
      const updatedUser = { ...mockTargetUser, timezone: 'Asia/Tokyo' }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          timezone: 'Asia/Tokyo',
        })

      expect(response.status).toBe(200)
      expect(response.body.data.user.timezone).toBe('Asia/Tokyo')

      expect(prismaMock.user.update).toHaveBeenCalledWith(targetUserId, {
        timezone: 'Asia/Tokyo',
      })
    })

    it('should successfully update language', async () => {
      const updatedUser = { ...mockTargetUser, language: 'fr' }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          language: 'fr',
        })

      expect(response.status).toBe(200)
      expect(response.body.data.user.language).toBe('fr')

      expect(prismaMock.user.update).toHaveBeenCalledWith(targetUserId, {
        language: 'fr',
      })
    })

    it('should update multiple fields simultaneously', async () => {
      const updatedUser = {
        ...mockTargetUser,
        name: 'Multi Update',
        timezone: 'Europe/London',
        language: 'de',
      }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Multi Update',
          timezone: 'Europe/London',
          language: 'de',
        })

      expect(response.status).toBe(200)
      expect(response.body.data.user.name).toBe('Multi Update')
      expect(response.body.data.user.timezone).toBe('Europe/London')
      expect(response.body.data.user.language).toBe('de')

      expect(prismaMock.user.update).toHaveBeenCalledWith(targetUserId, {
        name: 'Multi Update',
        timezone: 'Europe/London',
        language: 'de',
      })
    })

    it('should only update provided fields', async () => {
      const updatedUser = { ...mockTargetUser, name: 'Partial Update' }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Partial Update',
          // timezone and language not provided
        })

      expect(response.status).toBe(200)

      expect(prismaMock.user.update).toHaveBeenCalledWith(targetUserId, {
        name: 'Partial Update',
        // Should not include timezone or language
      })
    })
  })

  describe('Role and Status Updates', () => {
    it('should successfully update user role', async () => {
      const updatedUser = { ...mockTargetUser, role: 'admin' as const }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          role: 'admin',
        })

      expect(response.status).toBe(200)
      expect(response.body.data.user.role).toBe('admin')

      expect(prismaMock.user.update).toHaveBeenCalledWith(targetUserId, {
        role: 'admin',
      })
    })

    it('should successfully update user status', async () => {
      const updatedUser = { ...mockTargetUser, isActive: false }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          isActive: false,
        })

      expect(response.status).toBe(200)
      expect(response.body.data.user.isActive).toBe(false)

      expect(prismaMock.user.update).toHaveBeenCalledWith(targetUserId, {
        isActive: false,
      })
    })

    it('should clear lockout when activating user', async () => {
      const updatedUser = {
        ...mockTargetUser,
        isActive: true,
        lockedUntil: null,
        failedLoginCount: 0,
      }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          isActive: true,
        })

      expect(response.status).toBe(200)

      expect(prismaMock.user.update).toHaveBeenCalledWith(targetUserId, {
        isActive: true,
        lockedUntil: null,
        failedLoginCount: 0,
      })
    })
  })

  describe('Self-Modification Protection', () => {
    it('should prevent admin from changing their own role', async () => {
      const response = await request(app)
        .put(`/api/auth/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          role: 'user',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/cannot change.*own role/i)
    })

    it('should prevent admin from deactivating themselves', async () => {
      const response = await request(app)
        .put(`/api/auth/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          isActive: false,
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/cannot deactivate.*own account/i)
    })

    it('should allow admin to update their own profile fields', async () => {
      const updatedAdmin = {
        ...mockAdmin,
        name: 'Updated Admin Name',
        timezone: 'America/Los_Angeles',
        language: 'es',
      }
      prismaMock.user.update.mockResolvedValue(updatedAdmin)

      const response = await request(app)
        .put(`/api/auth/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Updated Admin Name',
          timezone: 'America/Los_Angeles',
          language: 'es',
        })

      expect(response.status).toBe(200)
      expect(response.body.data.user.name).toBe('Updated Admin Name')

      expect(prismaMock.user.update).toHaveBeenCalledWith(adminUserId, {
        name: 'Updated Admin Name',
        timezone: 'America/Los_Angeles',
        language: 'es',
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle user not found', async () => {
      prismaMock.user.findById.mockResolvedValue(null)

      const response = await request(app)
        .put(`/api/auth/users/nonexistent_user`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Updated Name',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/user not found/i)
    })

    it('should handle database update failure', async () => {
      prismaMock.user.update.mockRejectedValue(new Error('Database connection failed'))

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Updated Name',
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toMatch(/internal.*error/i)
    })
  })

  describe('Response Format', () => {
    it('should return correct response format on success', async () => {
      const updatedUser = { ...mockTargetUser, name: 'Success Test' }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Success Test',
        })

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toMatch(/application\/json/)
      expect(response.body).toMatchObject({
        success: true,
        message: 'User updated successfully',
        data: {
          user: {
            id: expect.any(String),
            email: expect.any(String),
            name: 'Success Test',
            role: expect.any(String),
            isActive: expect.any(Boolean),
          },
        },
      })
    })

    it('should include security headers', async () => {
      const updatedUser = { ...mockTargetUser, name: 'Headers Test' }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      const response = await request(app)
        .put(`/api/auth/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Headers Test',
        })

      expect(response.status).toBe(200)
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['cache-control']).toMatch(/no-cache/i)
    })
  })
})
