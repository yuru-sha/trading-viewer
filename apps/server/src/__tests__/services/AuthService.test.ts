import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { AuthService } from '../../application/services/AuthService'
import type { UserRepository } from '../../infrastructure/repositories/UserRepository'
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository'
import { RefreshToken } from '../../domain/entities/RefreshToken'

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

// Mock jwt
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}))

// Mock logger
vi.mock('../../infrastructure/services/logger', () => ({
  log: {
    auth: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}))

describe('AuthService', () => {
  let authService: AuthService
  let mockUserRepository: Partial<UserRepository>
  let mockRefreshTokenRepository: Partial<IRefreshTokenRepository>

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    name: 'Test User',
    role: 'user' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    failedLoginCount: 0,
    lockedUntil: null,
    isActive: true,
    isEmailVerified: true,
    lastLoginAt: new Date(),
    avatar: null,
    resetToken: null,
    resetTokenExpiry: null,
  }

  beforeEach(() => {
    // Setup mocks
    mockUserRepository = {
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
    }

    mockRefreshTokenRepository = {
      create: vi.fn(),
      findByToken: vi.fn(),
      deleteByToken: vi.fn(),
      deleteExpiredTokens: vi.fn(),
      update: vi.fn(),
    }

    // Create AuthService instance
    authService = new AuthService(
      mockUserRepository as UserRepository,
      mockRefreshTokenRepository as IRefreshTokenRepository
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('register', () => {
    it('should successfully register a new user', async () => {
      // Setup
      const registerRequest = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      }

      const hashedPassword = 'hashedPassword123'
      const newUser = {
        ...mockUser,
        id: 'new-user-123',
        email: registerRequest.email,
        passwordHash: hashedPassword,
        name: registerRequest.name,
      }

      const mockToken = 'jwt-token'
      const mockRefreshToken = 'refresh-token'

      // Mock implementations
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never)
      vi.mocked(mockUserRepository.create).mockResolvedValue(newUser)
      vi.mocked(jwt.sign).mockReturnValue(mockToken as never)
      vi.mocked(mockRefreshTokenRepository.create).mockResolvedValue({
        id: 'token-123',
        token: mockRefreshToken,
        userId: newUser.id,
        expiresAt: new Date(),
        createdAt: new Date(),
      })

      // Execute
      const result = await authService.register(registerRequest)

      // Assert
      expect(result).toEqual({
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
          isActive: true,
          role: newUser.role,
        },
        token: mockToken,
        refreshToken: expect.any(String),
      })

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(registerRequest.email)
      expect(bcrypt.hash).toHaveBeenCalledWith(registerRequest.password, 12)
      expect(mockUserRepository.create).toHaveBeenCalled()
      expect(jwt.sign).toHaveBeenCalled()
    })

    it('should throw error when user already exists', async () => {
      // Setup
      const registerRequest = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      }

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser)

      // Execute & Assert
      await expect(authService.register(registerRequest)).rejects.toThrow(
        'User with this email already exists'
      )
    })
  })

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Setup
      const loginRequest = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockToken = 'jwt-token'
      const mockRefreshToken = 'refresh-token'

      // Mock implementations
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser)
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
      vi.mocked(jwt.sign).mockReturnValue(mockToken as never)
      vi.mocked(mockUserRepository.update).mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      })
      vi.mocked(mockRefreshTokenRepository.create).mockResolvedValue({
        id: 'token-123',
        token: mockRefreshToken,
        userId: mockUser.id,
        expiresAt: new Date(),
        createdAt: new Date(),
      })

      // Execute
      const result = await authService.login(loginRequest)

      // Assert
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
          isActive: true,
          role: mockUser.role,
        },
        token: mockToken,
        refreshToken: expect.any(String),
      })

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginRequest.email)
      expect(bcrypt.compare).toHaveBeenCalledWith(loginRequest.password, mockUser.passwordHash)
    })

    it('should throw error with invalid credentials', async () => {
      // Setup
      const loginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(mockUser)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

      // Execute & Assert
      await expect(authService.login(loginRequest)).rejects.toThrow('Invalid credentials')
    })

    it('should throw error when user not found', async () => {
      // Setup
      const loginRequest = {
        email: 'nonexistent@example.com',
        password: 'password123',
      }

      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null)

      // Execute & Assert
      await expect(authService.login(loginRequest)).rejects.toThrow('Invalid credentials')
    })
  })

  describe('getCurrentUser', () => {
    it('should successfully get current user with valid userId', async () => {
      // Setup
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser)

      // Execute
      const result = await authService.getCurrentUser(mockUser.id)

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        createdAt: mockUser.createdAt.getTime(),
        updatedAt: mockUser.updatedAt.getTime(),
        isActive: mockUser.isActive,
        role: mockUser.role,
      })

      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id)
    })

    it('should throw error when user not found', async () => {
      // Setup
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null)

      // Execute & Assert
      await expect(authService.getCurrentUser('non-existent-id')).rejects.toThrow('User not found')
    })
  })

  describe('refreshToken', () => {
    it('should successfully refresh a valid token', async () => {
      // Setup
      const refreshTokenString = 'valid-refresh-token'
      const mockRefreshTokenEntity = new RefreshToken(
        'token-123',
        refreshTokenString,
        mockUser.id,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        undefined, // lastUsedAt
        new Date(), // createdAt
        new Date() // updatedAt
      )
      const newJwtToken = 'new-jwt-token'

      vi.mocked(mockRefreshTokenRepository.findByToken).mockResolvedValue(mockRefreshTokenEntity)
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser)
      vi.mocked(jwt.sign).mockReturnValue(newJwtToken as never)
      vi.mocked(mockRefreshTokenRepository.update).mockResolvedValue(mockRefreshTokenEntity)

      // Execute
      const result = await authService.refreshToken(refreshTokenString)

      // Assert
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          createdAt: mockUser.createdAt.getTime(),
          updatedAt: mockUser.updatedAt.getTime(),
          isActive: mockUser.isActive,
          role: mockUser.role,
        },
        token: newJwtToken,
      })

      expect(mockRefreshTokenRepository.findByToken).toHaveBeenCalledWith(refreshTokenString)
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id)
      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(mockRefreshTokenEntity.id, {
        lastUsedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    })

    it('should throw error for invalid refresh token', async () => {
      // Setup
      const invalidRefreshToken = 'invalid-refresh-token'

      vi.mocked(mockRefreshTokenRepository.findByToken).mockResolvedValue(null)

      // Execute & Assert
      await expect(authService.refreshToken(invalidRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      )
    })
  })

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Setup
      const refreshTokenString = 'valid-refresh-token'

      vi.mocked(mockRefreshTokenRepository.deleteByToken).mockResolvedValue()

      // Execute
      await authService.logout(refreshTokenString)

      // Assert
      expect(mockRefreshTokenRepository.deleteByToken).toHaveBeenCalledWith(refreshTokenString)
    })
  })
})
