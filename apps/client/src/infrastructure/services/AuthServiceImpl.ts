import type { IAuthService, AuthResponse } from '@/domain/interfaces/IAuthService'
import type {
  User,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  ChangePasswordData,
} from '@/presentation/context/AuthContext'
import { log } from './LoggerService'

interface CSRFTokenResponse {
  csrfToken: string
}

interface ApiService {
  post<T>(
    url: string,
    data?: unknown,
    config?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }>
  get<T>(
    url: string,
    config?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }>
  put<T>(
    url: string,
    data?: unknown,
    config?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }>
  delete<T>(
    url: string,
    config?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }>
  setCSRFToken(token: string): void
}

export class AuthServiceImpl implements IAuthService {
  constructor(private api: ApiService) {}

  // Authentication operations
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post<{
      user: User
      accessTokenExpiresAt: string
      refreshTokenExpiresAt: string
    }>('/auth/login', credentials, {
      requiresAuth: false,
      requiresCSRF: false,
    })

    if (!response || !response.success || !response.data) {
      throw new Error(response?.error || 'Login failed')
    }

    return response.data
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.api.post<{
      user: User
      accessTokenExpiresAt: string
      refreshTokenExpiresAt: string
    }>('/auth/register', data, {
      requiresAuth: false,
      requiresCSRF: false,
    })

    if (!response || !response.success || !response.data) {
      throw new Error(response?.error || 'Registration failed')
    }

    return response.data
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout')
  }

  async refreshTokens(): Promise<AuthResponse> {
    const response = await this.api.post<{
      user: User
      accessTokenExpiresAt: string
      refreshTokenExpiresAt: string
    }>('/auth/refresh', undefined, {
      requiresCSRF: false,
    })

    if (!response || !response.success || !response.data) {
      throw new Error(response?.error || 'Token refresh failed')
    }

    return response.data
  }

  // User profile operations
  async getCurrentUser(): Promise<User> {
    const response = await this.api.get<{ user: User }>('/auth/me')

    if (!response || !response.success || !response.data || !response.data.user) {
      throw new Error(response?.error || 'Failed to get user data')
    }

    return response.data.user
  }

  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await this.api.put<{ user: User }>('/auth/profile', data)

    if (!response || !response.success || !response.data || !response.data.user) {
      throw new Error(response?.error || 'Profile update failed')
    }

    return response.data.user
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    const response = await this.api.post('/auth/change-password', data)

    if (!response || !response.success) {
      throw new Error(response?.error || 'Password change failed')
    }
  }

  async deleteAccount(): Promise<void> {
    const response = await this.api.delete('/auth/account')

    if (!response || !response.success) {
      throw new Error(response?.error || 'Account deletion failed')
    }
  }

  // CSRF token management
  async getCSRFToken(): Promise<string> {
    const response = await this.api.get<CSRFTokenResponse>('/auth/csrf-token', {
      requiresCSRF: false,
    })

    if (!response || !response.success || !response.data) {
      throw new Error(response?.error || 'Failed to get CSRF token')
    }

    // Update API service with the new token
    this.api.setCSRFToken(response.data.csrfToken)

    return response.data.csrfToken
  }

  // Utility methods
  async checkAuthStatus(): Promise<{ isAuthenticated: boolean; user?: User }> {
    try {
      const user = await this.getCurrentUser()
      return { isAuthenticated: true, user }
    } catch {
      return { isAuthenticated: false }
    }
  }

  async ensureCSRFToken(): Promise<void> {
    try {
      await this.getCSRFToken()
    } catch (error: unknown) {
      log.auth.warn('Failed to ensure CSRF token', error)
    }
  }

  // Admin operations
  async getAuthStats(): Promise<{
    totalUsers: number
    verifiedUsers: number
    unverifiedUsers: number
    adminUsers: number
    regularUsers: number
  }> {
    const response = await this.api.get<{
      totalUsers: number
      verifiedUsers: number
      unverifiedUsers: number
      adminUsers: number
      regularUsers: number
    }>('/auth/stats')

    if (!response || !response.success || !response.data) {
      throw new Error(response?.error || 'Failed to get auth stats')
    }

    return response.data
  }

  // Development helpers
  async seedTestUsers(): Promise<{ totalUsers: number }> {
    const response = await this.api.post<{ totalUsers: number }>('/auth/dev/seed', undefined, {
      requiresAuth: false,
      requiresCSRF: false,
    })

    if (!response || !response.success || !response.data) {
      throw new Error(response?.error || 'Failed to seed test users')
    }

    return response.data
  }

  async getTestUsers(): Promise<{ users: User[] }> {
    const response = await this.api.get<{ users: User[] }>('/auth/dev/users', {
      requiresAuth: false,
    })

    if (!response || !response.success || !response.data) {
      throw new Error(response?.error || 'Failed to get test users')
    }

    return response.data
  }
}
