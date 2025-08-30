import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AuthService } from '../AuthService'
import type { ApiService } from '../base/ApiService'
import type { User, LoginCredentials, RegisterData, UpdateProfileData, ChangePasswordData } from '../../contexts/AuthContext'

// Mock ApiService
const mockApiService = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  setCSRFToken: vi.fn()
} as unknown as ApiService

describe('AuthService', () => {
  let authService: AuthService

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    isEmailVerified: true,
    role: 'user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }

  const mockAuthResponse = {
    user: mockUser,
    accessTokenExpiresAt: '2024-12-31T23:59:59.000Z',
    refreshTokenExpiresAt: '2025-01-31T23:59:59.000Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    authService = new AuthService(mockApiService)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login', () => {
    const credentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true
    }

    it('should login successfully', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: true,
        data: mockAuthResponse
      })

      const result = await authService.login(credentials)

      expect(mockApiService.post).toHaveBeenCalledWith('/auth/login', credentials, {
        requiresAuth: false,
        requiresCSRF: false
      })
      expect(result).toEqual(mockAuthResponse)
    })

    it('should throw error on login failure', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      })

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials')
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: false,
        data: null
      })

      await expect(authService.login(credentials)).rejects.toThrow('Login failed')
    })

    it('should handle API service throwing error', async () => {
      mockApiService.post = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(authService.login(credentials)).rejects.toThrow('Network error')
    })
  })

  describe('register', () => {
    const registerData: RegisterData = {
      email: 'new@example.com',
      password: 'NewPassword123!',
      name: 'New User',
      acceptTerms: true
    }

    it('should register successfully', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: true,
        data: mockAuthResponse
      })

      const result = await authService.register(registerData)

      expect(mockApiService.post).toHaveBeenCalledWith('/auth/register', registerData, {
        requiresAuth: false,
        requiresCSRF: false
      })
      expect(result).toEqual(mockAuthResponse)
    })

    it('should throw error on registration failure', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: false,
        error: 'Email already exists'
      })

      await expect(authService.register(registerData)).rejects.toThrow('Email already exists')
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: false
      })

      await expect(authService.register(registerData)).rejects.toThrow('Registration failed')
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: true
      })

      await expect(authService.logout()).resolves.toBeUndefined()
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/logout')
    })

    it('should handle logout API errors gracefully', async () => {
      mockApiService.post = vi.fn().mockRejectedValue(new Error('Logout failed'))

      await expect(authService.logout()).rejects.toThrow('Logout failed')
    })
  })

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: true,
        data: mockAuthResponse
      })

      const result = await authService.refreshTokens()

      expect(mockApiService.post).toHaveBeenCalledWith('/auth/refresh', undefined, {
        requiresCSRF: false
      })
      expect(result).toEqual(mockAuthResponse)
    })

    it('should throw error on refresh failure', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: false,
        error: 'Token expired'
      })

      await expect(authService.refreshTokens()).rejects.toThrow('Token expired')
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: false
      })

      await expect(authService.refreshTokens()).rejects.toThrow('Token refresh failed')
    })
  })

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: true,
        data: { user: mockUser }
      })

      const result = await authService.getCurrentUser()

      expect(mockApiService.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockUser)
    })

    it('should throw error when API fails', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: false,
        error: 'Unauthorized'
      })

      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized')
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: false
      })

      await expect(authService.getCurrentUser()).rejects.toThrow('Failed to get user data')
    })
  })

  describe('updateProfile', () => {
    const profileData: UpdateProfileData = {
      name: 'Updated Name',
      avatar: 'https://example.com/new-avatar.jpg'
    }

    const updatedUser: User = {
      ...mockUser,
      name: 'Updated Name',
      avatar: 'https://example.com/new-avatar.jpg'
    }

    it('should update profile successfully', async () => {
      mockApiService.put = vi.fn().mockResolvedValue({
        success: true,
        data: { user: updatedUser }
      })

      const result = await authService.updateProfile(profileData)

      expect(mockApiService.put).toHaveBeenCalledWith('/auth/profile', profileData)
      expect(result).toEqual(updatedUser)
    })

    it('should throw error on profile update failure', async () => {
      mockApiService.put = vi.fn().mockResolvedValue({
        success: false,
        error: 'Validation failed'
      })

      await expect(authService.updateProfile(profileData)).rejects.toThrow('Validation failed')
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.put = vi.fn().mockResolvedValue({
        success: false
      })

      await expect(authService.updateProfile(profileData)).rejects.toThrow('Profile update failed')
    })
  })

  describe('changePassword', () => {
    const passwordData: ChangePasswordData = {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456!'
    }

    it('should change password successfully', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: true
      })

      await expect(authService.changePassword(passwordData)).resolves.toBeUndefined()
      expect(mockApiService.post).toHaveBeenCalledWith('/auth/change-password', passwordData)
    })

    it('should throw error on password change failure', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: false,
        error: 'Current password is incorrect'
      })

      await expect(authService.changePassword(passwordData)).rejects.toThrow('Current password is incorrect')
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: false
      })

      await expect(authService.changePassword(passwordData)).rejects.toThrow('Password change failed')
    })
  })

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      mockApiService.delete = vi.fn().mockResolvedValue({
        success: true
      })

      await expect(authService.deleteAccount()).resolves.toBeUndefined()
      expect(mockApiService.delete).toHaveBeenCalledWith('/auth/account')
    })

    it('should throw error on account deletion failure', async () => {
      mockApiService.delete = vi.fn().mockResolvedValue({
        success: false,
        error: 'Cannot delete account with active subscriptions'
      })

      await expect(authService.deleteAccount()).rejects.toThrow('Cannot delete account with active subscriptions')
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.delete = vi.fn().mockResolvedValue({
        success: false
      })

      await expect(authService.deleteAccount()).rejects.toThrow('Account deletion failed')
    })
  })

  describe('getCSRFToken', () => {
    const csrfToken = 'csrf-token-abc123'

    it('should get CSRF token successfully', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: true,
        data: { csrfToken }
      })

      const result = await authService.getCSRFToken()

      expect(mockApiService.get).toHaveBeenCalledWith('/auth/csrf-token', {
        requiresCSRF: false
      })
      expect(mockApiService.setCSRFToken).toHaveBeenCalledWith(csrfToken)
      expect(result).toBe(csrfToken)
    })

    it('should throw error when CSRF token request fails', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: false,
        error: 'CSRF token generation failed'
      })

      await expect(authService.getCSRFToken()).rejects.toThrow('CSRF token generation failed')
      expect(mockApiService.setCSRFToken).not.toHaveBeenCalled()
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: false
      })

      await expect(authService.getCSRFToken()).rejects.toThrow('Failed to get CSRF token')
    })
  })

  describe('checkAuthStatus', () => {
    it('should return authenticated status for valid user', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser)

      const result = await authService.checkAuthStatus()

      expect(result).toEqual({
        isAuthenticated: true,
        user: mockUser
      })
    })

    it('should return unauthenticated status when getCurrentUser fails', async () => {
      vi.spyOn(authService, 'getCurrentUser').mockRejectedValue(new Error('Unauthorized'))

      const result = await authService.checkAuthStatus()

      expect(result).toEqual({
        isAuthenticated: false
      })
    })
  })

  describe('ensureCSRFToken', () => {
    it('should get CSRF token successfully', async () => {
      vi.spyOn(authService, 'getCSRFToken').mockResolvedValue('csrf-token-123')

      await expect(authService.ensureCSRFToken()).resolves.toBeUndefined()
      expect(authService.getCSRFToken).toHaveBeenCalled()
    })

    it('should handle CSRF token failure gracefully', async () => {
      const testError = new Error('Token failed')
      vi.spyOn(authService, 'getCSRFToken').mockRejectedValue(testError)

      await expect(authService.ensureCSRFToken()).resolves.toBeUndefined()
      expect(console.warn).toHaveBeenCalledWith('Operation failed', testError)
    })
  })

  describe('getAuthStats', () => {
    const mockStats = {
      totalUsers: 1000,
      verifiedUsers: 800,
      unverifiedUsers: 200,
      adminUsers: 5,
      regularUsers: 995
    }

    it('should get auth stats successfully', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: true,
        data: mockStats
      })

      const result = await authService.getAuthStats()

      expect(mockApiService.get).toHaveBeenCalledWith('/auth/stats')
      expect(result).toEqual(mockStats)
    })

    it('should throw error when stats request fails', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: false,
        error: 'Insufficient permissions'
      })

      await expect(authService.getAuthStats()).rejects.toThrow('Insufficient permissions')
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: false
      })

      await expect(authService.getAuthStats()).rejects.toThrow('Failed to get auth stats')
    })
  })

  describe('seedTestUsers', () => {
    const mockResult = { totalUsers: 10 }

    it('should seed test users successfully', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: true,
        data: mockResult
      })

      const result = await authService.seedTestUsers()

      expect(mockApiService.post).toHaveBeenCalledWith('/auth/dev/seed', undefined, {
        requiresAuth: false,
        requiresCSRF: false
      })
      expect(result).toEqual(mockResult)
    })

    it('should throw error when seeding fails', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: false,
        error: 'Seeding not allowed in production'
      })

      await expect(authService.seedTestUsers()).rejects.toThrow('Seeding not allowed in production')
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.post = vi.fn().mockResolvedValue({
        success: false
      })

      await expect(authService.seedTestUsers()).rejects.toThrow('Failed to seed test users')
    })
  })

  describe('getTestUsers', () => {
    const mockUsers = {
      users: [mockUser, { ...mockUser, id: 'user-456', email: 'test2@example.com' }]
    }

    it('should get test users successfully', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: true,
        data: mockUsers
      })

      const result = await authService.getTestUsers()

      expect(mockApiService.get).toHaveBeenCalledWith('/auth/dev/users', {
        requiresAuth: false
      })
      expect(result).toEqual(mockUsers)
    })

    it('should throw error when getting test users fails', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: false,
        error: 'Test users not available'
      })

      await expect(authService.getTestUsers()).rejects.toThrow('Test users not available')
    })

    it('should throw default error when no error message provided', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: false
      })

      await expect(authService.getTestUsers()).rejects.toThrow('Failed to get test users')
    })
  })

  describe('Edge Cases and Error Boundaries', () => {
    it('should handle null/undefined API responses', async () => {
      mockApiService.post = vi.fn().mockResolvedValue(null)

      await expect(authService.login({
        email: 'test@example.com',
        password: 'password123'
      } as LoginCredentials)).rejects.toThrow('Login failed')
    })

    it('should handle malformed API responses', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: true,
        data: null // Invalid response structure
      })

      await expect(authService.getCurrentUser()).rejects.toThrow('Failed to get user data')
    })

    it('should handle missing user data in response', async () => {
      mockApiService.get = vi.fn().mockResolvedValue({
        success: true,
        data: {} // Missing user property
      })

      await expect(authService.getCurrentUser()).rejects.toThrow('Failed to get user data')
    })

    it('should handle API service returning undefined', async () => {
      mockApiService.post = vi.fn().mockResolvedValue(undefined)

      await expect(authService.logout()).resolves.toBeUndefined()
    })

    it('should handle concurrent CSRF token requests', async () => {
      let callCount = 0
      mockApiService.get = vi.fn().mockImplementation(() => {
        callCount++
        return Promise.resolve({
          success: true,
          data: { csrfToken: `token-${callCount}` }
        })
      })

      // Simulate concurrent CSRF requests
      const promises = [
        authService.getCSRFToken(),
        authService.getCSRFToken(),
        authService.getCSRFToken()
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      expect(mockApiService.setCSRFToken).toHaveBeenCalledTimes(3)
      results.forEach((token, index) => {
        expect(token).toBe(`token-${index + 1}`)
      })
    })

    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout')
      mockApiService.post = vi.fn().mockRejectedValue(timeoutError)

      await expect(authService.login({
        email: 'test@example.com',
        password: 'password123'
      } as LoginCredentials)).rejects.toThrow('Request timeout')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', async () => {
      // Setup all mocks before starting the flow
      mockApiService.post = vi.fn()
        .mockResolvedValueOnce({ success: true, data: mockAuthResponse }) // login
        .mockResolvedValueOnce({ success: true }) // logout

      mockApiService.get = vi.fn()
        .mockResolvedValueOnce({ success: true, data: { user: mockUser } })

      mockApiService.put = vi.fn()
        .mockResolvedValueOnce({ success: true, data: { user: { ...mockUser, name: 'Updated' } } })

      // Execute the flow
      await authService.login({
        email: 'test@example.com',
        password: 'password123'
      } as LoginCredentials)

      await authService.getCurrentUser()
      await authService.updateProfile({ name: 'Updated' })
      await authService.logout()

      // Verify all calls
      expect(mockApiService.post).toHaveBeenCalledTimes(2) // login + logout
      expect(mockApiService.get).toHaveBeenCalledTimes(1)  // getCurrentUser
      expect(mockApiService.put).toHaveBeenCalledTimes(1)  // updateProfile
    })

    it('should handle token refresh during profile operations', async () => {
      // AuthService does not automatically retry on 401 errors
      // This test verifies that authentication errors are properly propagated
      mockApiService.put = vi.fn()
        .mockRejectedValueOnce({ response: { status: 401 } })

      // This should reject with the 401 error since AuthService doesn't handle retries
      await expect(authService.updateProfile({ name: 'Test' })).rejects.toEqual({ response: { status: 401 } })
    })
  })
})