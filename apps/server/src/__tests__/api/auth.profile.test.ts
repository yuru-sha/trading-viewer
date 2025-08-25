import request from 'supertest'
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { app } from '../../server'
import { generateTestToken } from '../helpers/authHelper'
import { prismaMock } from '../__mocks__/prisma'

describe.skip('PUT /api/auth/profile - Profile Update API', () => {
  let authToken: string
  let csrfToken: string
  const mockUserId = 'user_123'
  const mockUser = {
    userId: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    hashedPassword: 'hashedPassword123',
    role: 'user' as const,
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  beforeAll(async () => {
    authToken = generateTestToken({ userId: mockUserId })

    // Mock CSRF token endpoint
    prismaMock.user.findUnique.mockResolvedValue(mockUser)

    // Get CSRF token
    const csrfResponse = await request(app)
      .get('/api/auth/csrf')
      .set('Authorization', `Bearer ${authToken}`)

    csrfToken = csrfResponse.body?.data?.csrfToken || csrfResponse.body?.csrfToken
  })

  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
  })

  afterEach(() => {
    prismaMock.user.update.mockReset()
    prismaMock.user.findUnique.mockReset()
  })

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication token', async () => {
      // Act
      const response = await request(app).put('/api/auth/profile').send({ name: 'Updated Name' })

      // Assert
      expect(response.status).toBe(401)
      expect(response.body.error).toMatch(/unauthorized/i)
    })

    it('should reject requests with invalid authentication token', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Updated Name' })

      // Assert
      expect(response.status).toBe(401)
      expect(response.body.error).toMatch(/invalid.*token/i)
    })

    it('should reject requests without CSRF token', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })

      // Assert
      expect(response.status).toBe(403)
      expect(response.body.error).toMatch(/csrf/i)
    })

    it('should reject requests with invalid CSRF token', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'invalid-csrf-token')
        .send({ name: 'Updated Name' })

      // Assert
      expect(response.status).toBe(403)
      expect(response.body.error).toMatch(/csrf/i)
    })
  })

  describe('Request Validation', () => {
    it('should reject requests with invalid name - too long', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'a'.repeat(51) })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/name.*length/i)
    })

    it('should reject requests with invalid name - empty string', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: '' })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/name.*required/i)
    })

    it('should reject requests with invalid avatar URL', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ avatar: 'invalid-url' })

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/avatar.*url/i)
    })

    it('should accept requests with valid data', async () => {
      // Arrange
      const updatedUser = { ...mockUser, name: 'Updated Name', updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Updated Name' })

      // Assert
      expect(response.status).toBe(200)
    })
  })

  describe('Profile Update Operations', () => {
    it('should successfully update user name', async () => {
      // Arrange
      const updatedUser = { ...mockUser, name: 'Updated Name', updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Updated Name' })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Profile updated successfully')
      expect(response.body.data.user.name).toBe('Updated Name')

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: expect.objectContaining({
          name: 'Updated Name',
        }),
      })
    })

    it('should successfully update user avatar', async () => {
      // Arrange
      const avatarUrl = 'https://example.com/avatar.jpg'
      const updatedUser = { ...mockUser, avatar: avatarUrl, updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ avatar: avatarUrl })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data.user.avatar).toBe(avatarUrl)

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: expect.objectContaining({
          avatar: avatarUrl,
        }),
      })
    })

    it('should successfully update both name and avatar', async () => {
      // Arrange
      const updateData = { name: 'New Name', avatar: 'https://example.com/new-avatar.jpg' }
      const updatedUser = { ...mockUser, ...updateData, updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send(updateData)

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data.user.name).toBe(updateData.name)
      expect(response.body.data.user.avatar).toBe(updateData.avatar)

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: expect.objectContaining(updateData),
      })
    })

    it('should handle empty update gracefully', async () => {
      // Arrange
      const updatedUser = { ...mockUser, updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({})

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: expect.objectContaining({
          updatedAt: expect.any(Date),
        }),
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle user not found error', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(null)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Updated Name' })

      // Assert
      expect(response.status).toBe(401)
      expect(response.body.error).toMatch(/user not found/i)
    })

    it('should handle database update failure', async () => {
      // Arrange
      prismaMock.user.update.mockRejectedValue(new Error('Database connection failed'))

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Updated Name' })

      // Assert
      expect(response.status).toBe(500)
      expect(response.body.error).toMatch(/internal.*error/i)
    })

    it('should handle constraint violation errors', async () => {
      // Arrange
      const constraintError = { code: 'P2002', message: 'Unique constraint violation' }
      prismaMock.user.update.mockRejectedValue(constraintError)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Duplicate Name' })

      // Assert
      expect(response.status).toBe(409)
      expect(response.body.error).toMatch(/conflict/i)
    })
  })

  describe('Security Features', () => {
    it('should sanitize HTML in name field', async () => {
      // Arrange
      const maliciousName = '<script>alert("xss")</script>Clean Name'
      const expectedSanitizedName = 'Clean Name'
      const updatedUser = { ...mockUser, name: expectedSanitizedName, updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: maliciousName })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.data.user.name).toBe(expectedSanitizedName)
    })

    it('should rate limit profile update requests', async () => {
      // Arrange
      const updatedUser = { ...mockUser, name: 'Updated Name', updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act - Make multiple rapid requests
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', csrfToken)
          .send({ name: 'Updated Name' })
      )

      const responses = await Promise.all(promises)

      // Assert - Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })

    it('should validate Content-Type header', async () => {
      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .set('Content-Type', 'text/plain')
        .send('name=Updated Name')

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/content.*type/i)
    })
  })

  describe('Response Format and Headers', () => {
    it('should return correct response format', async () => {
      // Arrange
      const updatedUser = { ...mockUser, name: 'Updated Name', updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Updated Name' })

      // Assert
      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toMatch(/application\/json/)
      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: {
          user: expect.objectContaining({
            userId: mockUserId,
            name: 'Updated Name',
            email: mockUser.email,
          }),
        },
      })
    })

    it('should not expose sensitive user data', async () => {
      // Arrange
      const updatedUser = { ...mockUser, name: 'Updated Name', updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Updated Name' })

      // Assert
      expect(response.body.data.user).not.toHaveProperty('hashedPassword')
      expect(response.body.data.user).not.toHaveProperty('sessionId')
      expect(response.body.data.user).not.toHaveProperty('resetToken')
    })

    it('should include cache control headers', async () => {
      // Arrange
      const updatedUser = { ...mockUser, name: 'Updated Name', updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Updated Name' })

      // Assert
      expect(response.headers['cache-control']).toMatch(/no-cache/i)
      expect(response.headers['x-content-type-options']).toBe('nosniff')
    })
  })
})
