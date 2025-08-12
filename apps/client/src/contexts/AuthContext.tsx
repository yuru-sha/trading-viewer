import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { useErrorHandlers } from './ErrorContext'

// Types
export interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  isEmailVerified: boolean
  createdAt: string
  profile: {
    firstName?: string
    lastName?: string
    avatar?: string
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  tokens: AuthTokens | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface UpdateProfileData {
  firstName?: string
  lastName?: string
  avatar?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshTokens: () => Promise<void>
  updateProfile: (data: UpdateProfileData) => Promise<void>
  changePassword: (data: ChangePasswordData) => Promise<void>
  deleteAccount: () => Promise<void>
  clearAuth: () => void
}

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'

// Token storage keys
const ACCESS_TOKEN_KEY = 'auth_access_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'
const USER_KEY = 'auth_user'

// Create context
const AuthContext = createContext<AuthContextValue | null>(null)

// Token management utilities
class TokenManager {
  private refreshPromise: Promise<void> | null = null
  private refreshTimer: NodeJS.Timeout | null = null

  static setTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  static clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  static setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  static getUser(): User | null {
    try {
      const userData = localStorage.getItem(USER_KEY)
      return userData ? JSON.parse(userData) : null
    } catch {
      return null
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return Date.now() >= payload.exp * 1000
    } catch {
      return true
    }
  }

  static getTokenExpirationTime(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000
    } catch {
      return null
    }
  }

  setupAutoRefresh(refreshCallback: () => Promise<void>): void {
    const accessToken = TokenManager.getAccessToken()
    if (!accessToken) return

    const expirationTime = TokenManager.getTokenExpirationTime(accessToken)
    if (!expirationTime) return

    // Refresh token 5 minutes before expiration
    const refreshTime = expirationTime - Date.now() - 5 * 60 * 1000

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        refreshCallback().catch(console.error)
      }, refreshTime)
    }
  }

  clearAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  async refresh(refreshCallback: () => Promise<void>): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = refreshCallback()

    try {
      await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }
}

// HTTP client with automatic token handling
class AuthApiClient {
  constructor(
    private onTokenRefresh: () => Promise<void>,
    private onAuthError: () => void,
    private handleApiError: (error: any, context?: string) => void
  ) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    // Add auth header if token exists
    const accessToken = TokenManager.getAccessToken()
    if (accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      }
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        // Handle 401 errors with token refresh
        if (response.status === 401 && accessToken) {
          try {
            await this.onTokenRefresh()

            // Retry with new token
            const newToken = TokenManager.getAccessToken()
            if (newToken) {
              config.headers = {
                ...config.headers,
                Authorization: `Bearer ${newToken}`,
              }
              const retryResponse = await fetch(url, config)
              if (retryResponse.ok) {
                return await retryResponse.json()
              }
            }
          } catch (refreshError) {
            this.onAuthError()
            throw refreshError
          }
        }

        const errorData = await response.json().catch(() => ({}))
        throw { response: { status: response.status, data: errorData } }
      }

      return await response.json()
    } catch (error) {
      if (!(error as any).response) {
        // Network error
        throw error
      }
      throw error
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Auth Provider Component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    tokens: null,
  })

  const { handleApiError, handleNetworkError } = useErrorHandlers()
  const tokenManager = new TokenManager()

  // Initialize API client
  const apiClient = new AuthApiClient(refreshTokens, clearAuth, handleApiError)

  // Clear auth state
  const clearAuth = useCallback(() => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      tokens: null,
    })
    TokenManager.clearTokens()
    tokenManager.clearAutoRefresh()
  }, [tokenManager])

  // Refresh tokens
  const refreshTokens = useCallback(async (): Promise<void> => {
    const refreshToken = TokenManager.getRefreshToken()
    if (!refreshToken) {
      clearAuth()
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        clearAuth()
        return
      }

      const data = await response.json()

      if (data.success && data.data) {
        const {
          user,
          accessToken,
          refreshToken: newRefreshToken,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
        } = data.data

        const tokens: AuthTokens = {
          accessToken,
          refreshToken: newRefreshToken,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
        }

        TokenManager.setTokens(tokens)
        TokenManager.setUser(user)

        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          tokens,
        })

        // Setup auto refresh for new token
        tokenManager.setupAutoRefresh(refreshTokens)
      } else {
        clearAuth()
      }
    } catch (error) {
      handleNetworkError(error, 'token refresh')
      clearAuth()
    }
  }, [clearAuth, handleNetworkError, tokenManager])

  // Login
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      setAuthState(prev => ({ ...prev, isLoading: true }))

      try {
        const data = await apiClient.post<any>('/auth/login', credentials)

        if (data.success && data.data) {
          const { user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } =
            data.data

          const tokens: AuthTokens = {
            accessToken,
            refreshToken,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
          }

          TokenManager.setTokens(tokens)
          TokenManager.setUser(user)

          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            tokens,
          })

          // Setup auto refresh
          tokenManager.setupAutoRefresh(refreshTokens)
        }
      } catch (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        handleApiError(error, 'login')
        throw error
      }
    },
    [apiClient, handleApiError, tokenManager, refreshTokens]
  )

  // Register
  const register = useCallback(
    async (data: RegisterData): Promise<void> => {
      setAuthState(prev => ({ ...prev, isLoading: true }))

      try {
        const response = await apiClient.post<any>('/auth/register', data)

        if (response.success && response.data) {
          const { user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } =
            response.data

          const tokens: AuthTokens = {
            accessToken,
            refreshToken,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
          }

          TokenManager.setTokens(tokens)
          TokenManager.setUser(user)

          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            tokens,
          })

          // Setup auto refresh
          tokenManager.setupAutoRefresh(refreshTokens)
        }
      } catch (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        handleApiError(error, 'registration')
        throw error
      }
    },
    [apiClient, handleApiError, tokenManager, refreshTokens]
  )

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error)
    } finally {
      clearAuth()
    }
  }, [apiClient, clearAuth])

  // Update profile
  const updateProfile = useCallback(
    async (data: UpdateProfileData): Promise<void> => {
      try {
        const response = await apiClient.put<any>('/auth/profile', data)

        if (response.success && response.data?.user) {
          const updatedUser = response.data.user
          TokenManager.setUser(updatedUser)

          setAuthState(prev => ({
            ...prev,
            user: updatedUser,
          }))
        }
      } catch (error) {
        handleApiError(error, 'profile update')
        throw error
      }
    },
    [apiClient, handleApiError]
  )

  // Change password
  const changePassword = useCallback(
    async (data: ChangePasswordData): Promise<void> => {
      try {
        await apiClient.post('/auth/change-password', data)
        // Password change logs out the user
        clearAuth()
      } catch (error) {
        handleApiError(error, 'password change')
        throw error
      }
    },
    [apiClient, handleApiError, clearAuth]
  )

  // Delete account
  const deleteAccount = useCallback(async (): Promise<void> => {
    try {
      await apiClient.delete('/auth/account')
      clearAuth()
    } catch (error) {
      handleApiError(error, 'account deletion')
      throw error
    }
  }, [apiClient, handleApiError, clearAuth])

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = TokenManager.getAccessToken()
      const refreshToken = TokenManager.getRefreshToken()
      const user = TokenManager.getUser()

      if (!accessToken || !refreshToken || !user) {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        return
      }

      // Check if access token is still valid
      if (TokenManager.isTokenExpired(accessToken)) {
        // Try to refresh
        try {
          await tokenManager.refresh(refreshTokens)
        } catch (error) {
          console.warn('Failed to refresh token on init:', error)
          clearAuth()
        }
      } else {
        // Token is still valid
        const accessTokenExpiresAt =
          TokenManager.getTokenExpirationTime(accessToken)?.toString() || ''
        const refreshTokenExpiresAt =
          TokenManager.getTokenExpirationTime(refreshToken)?.toString() || ''

        const tokens: AuthTokens = {
          accessToken,
          refreshToken,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
        }

        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          tokens,
        })

        // Setup auto refresh
        tokenManager.setupAutoRefresh(refreshTokens)
      }
    }

    initAuth()
  }, [tokenManager, refreshTokens, clearAuth])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      tokenManager.clearAutoRefresh()
    }
  }, [tokenManager])

  const value: AuthContextValue = {
    ...authState,
    login,
    register,
    logout,
    refreshTokens,
    updateProfile,
    changePassword,
    deleteAccount,
    clearAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook to use auth context
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for protected routes
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login or show login modal
      window.location.href = '/login'
    }
  }, [isAuthenticated, isLoading])

  return { isAuthenticated, isLoading }
}

export default AuthContext
