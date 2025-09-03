import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { UserRepository } from '../../infrastructure/repositories/UserRepository'
import { prismaMock } from '../__mocks__/prisma'

describe('UserRepository - Profile Operations', () => {
  let userRepository: UserRepository
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

  beforeEach(() => {
    userRepository = new UserRepository(prismaMock)
  })

  afterEach(() => {
    prismaMock.user.update.mockReset()
    prismaMock.user.findUnique.mockReset()
  })

  describe('Profile Update Operations', () => {
    it('should update user name successfully', async () => {
      // Arrange
      const updatedUser = { ...mockUser, name: 'Updated Name', updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const result = await userRepository.update(mockUserId, { name: 'Updated Name' })

      // Assert
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          name: 'Updated Name',
        },
      })
      expect(result.name).toBe('Updated Name')
    })

    it('should update user avatar successfully', async () => {
      // Arrange
      const avatarUrl = 'https://example.com/avatar.jpg'
      const updatedUser = { ...mockUser, avatar: avatarUrl, updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const result = await userRepository.update(mockUserId, { avatar: avatarUrl })

      // Assert
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          avatar: avatarUrl,
          updatedAt: expect.any(Date),
        },
      })
      expect(result.avatar).toBe(avatarUrl)
    })

    it('should update both name and avatar simultaneously', async () => {
      // Arrange
      const updateData = { name: 'New Name', avatar: 'https://example.com/new-avatar.jpg' }
      const updatedUser = { ...mockUser, ...updateData, updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const result = await userRepository.update(mockUserId, updateData)

      // Assert
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          ...updateData,
          updatedAt: expect.any(Date),
        },
      })
      expect(result.name).toBe(updateData.name)
      expect(result.avatar).toBe(updateData.avatar)
    })

    it('should handle empty update data gracefully', async () => {
      // Arrange
      const updatedUser = { ...mockUser, updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const result = await userRepository.update(mockUserId, {})

      // Assert
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          updatedAt: expect.any(Date),
        },
      })
      expect(result.userId).toBe(mockUserId)
    })

    it('should sanitize name input to prevent XSS', async () => {
      // Arrange
      const maliciousName = '<script>alert("xss")</script>Test Name'
      const sanitizedName = 'Test Name' // Expected after sanitization
      const updatedUser = { ...mockUser, name: sanitizedName, updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const result = await userRepository.update(mockUserId, { name: maliciousName })

      // Assert
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          name: expect.stringMatching(/^[^<>]*$/), // No HTML tags
          updatedAt: expect.any(Date),
        },
      })
    })

    it('should validate name length constraints', async () => {
      // Act & Assert
      await expect(userRepository.update(mockUserId, { name: '' })).rejects.toThrow(
        'Name cannot be empty'
      )

      await expect(userRepository.update(mockUserId, { name: 'a'.repeat(51) })).rejects.toThrow(
        'Name cannot exceed 50 characters'
      )
    })

    it('should validate avatar URL format', async () => {
      // Act & Assert
      await expect(userRepository.update(mockUserId, { avatar: 'invalid-url' })).rejects.toThrow(
        'Invalid avatar URL format'
      )

      await expect(
        userRepository.update(mockUserId, { avatar: 'ftp://example.com/avatar.jpg' })
      ).rejects.toThrow('Avatar URL must use HTTPS protocol')
    })

    it('should handle database connection errors', async () => {
      // Arrange
      prismaMock.user.update.mockRejectedValue(new Error('Database connection failed'))

      // Act & Assert
      await expect(userRepository.update(mockUserId, { name: 'Test Name' })).rejects.toThrow(
        'Database connection failed'
      )
    })

    it('should handle user not found scenario', async () => {
      // Arrange
      prismaMock.user.update.mockRejectedValue({ code: 'P2025', message: 'Record not found' })

      // Act & Assert
      await expect(
        userRepository.update('non-existent-user', { name: 'Test Name' })
      ).rejects.toThrow('User not found')
    })
  })

  describe('Profile Retrieval Operations', () => {
    it('should retrieve user profile by ID', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(mockUser)

      // Act
      const result = await userRepository.findById(mockUserId)

      // Assert
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      })
      expect(result).toEqual(mockUser)
    })

    it('should return null for non-existent user', async () => {
      // Arrange
      prismaMock.user.findUnique.mockResolvedValue(null)

      // Act
      const result = await userRepository.findById('non-existent-user')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('Data Integrity and Audit', () => {
    it('should automatically update updatedAt timestamp', async () => {
      // Arrange
      const beforeUpdate = new Date()
      const updatedUser = { ...mockUser, name: 'Updated Name', updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      await userRepository.update(mockUserId, { name: 'Updated Name' })

      // Assert
      const updateCall = prismaMock.user.update.mock.calls[0][0]
      expect(updateCall.data.updatedAt).toBeInstanceOf(Date)
      expect(updateCall.data.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })

    it('should preserve other user fields during update', async () => {
      // Arrange
      const originalUser = { ...mockUser }
      const updatedUser = { ...mockUser, name: 'Updated Name', updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      const result = await userRepository.update(mockUserId, { name: 'Updated Name' })

      // Assert
      expect(result.email).toBe(originalUser.email)
      expect(result.role).toBe(originalUser.role)
      expect(result.isActive).toBe(originalUser.isActive)
      expect(result.isEmailVerified).toBe(originalUser.isEmailVerified)
      expect(result.hashedPassword).toBe(originalUser.hashedPassword)
    })
  })

  describe('Performance and Optimization', () => {
    it('should use optimized query for profile updates', async () => {
      // Arrange
      const updatedUser = { ...mockUser, name: 'Updated Name', updatedAt: new Date() }
      prismaMock.user.update.mockResolvedValue(updatedUser)

      // Act
      await userRepository.update(mockUserId, { name: 'Updated Name' })

      // Assert
      const updateCall = prismaMock.user.update.mock.calls[0][0]
      expect(updateCall.where).toEqual({ userId: mockUserId })
      expect(Object.keys(updateCall.data)).toHaveLength(2) // name + updatedAt only
    })
  })
})
