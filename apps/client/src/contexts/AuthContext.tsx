import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import { useErrorHandlers } from './ErrorContext'
import { clearCSRFToken } from '../lib/apiClient'
import { apiService } from '../services/base/ApiService'

// Types
export interface User {
  id: string
  email: string
  name?: string
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

export interface ForgotPasswordData {
  email: string
}

export interface ResetPasswordData {
  token: string
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
  forgotPassword: (data: ForgotPasswordData) => Promise<void>
  resetPassword: (data: ResetPasswordData) => Promise<void>
  clearAuth: () => void
  getCSRFToken: () => Promise<string>
  requestWithAuth: (url: string, options?: RequestInit) => Promise<Response>
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Create context
const AuthContext = createContext<AuthContextValue | null>(null)

// Cookie-based authentication helper
class AuthHelper {
  // Check authentication status via server (httpOnly cookies)
  static async checkAuthStatus(): Promise<{ isAuthenticated: boolean; user?: User }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.user) {
          return { isAuthenticated: true, user: data.data.user }
        }
      }
      return { isAuthenticated: false }
    } catch {
      return { isAuthenticated: false }
    }
  }
}

// HTTP client with httpOnly cookie authentication
class AuthApiClient {
  private csrfToken: string | null = null

  constructor(
    private onAuthError: () => void,
    private handleApiError: (error: any, context?: string) => void
  ) {}

  // CSRF token management
  private async ensureCSRFToken(): Promise<string> {
    if (!this.csrfToken) {
      await this.refreshCSRFToken()
    }
    return this.csrfToken!
  }

  async refreshCSRFToken(): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          this.onAuthError()
        }
        throw new Error('Failed to get CSRF token')
      }

      const data = await response.json()
      if (data.success && data.data?.csrfToken) {
        this.csrfToken = data.data.csrfToken
        // Sync CSRF token with apiService
        apiService.setCSRFToken(this.csrfToken)
        console.log('🔐 CSRF token updated:', this.csrfToken.substring(0, 8) + '...')
        return this.csrfToken
      }

      throw new Error('Invalid CSRF token response')
    } catch (error) {
      this.csrfToken = null
      throw error
    }
  }

  clearCSRFToken(): void {
    this.csrfToken = null
    // Sync CSRF token clear with apiService
    apiService.clearCSRFToken()
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`

    const config: RequestInit = {
      credentials: 'include', // Always include httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    // Add CSRF token for state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
      try {
        const csrfToken = await this.ensureCSRFToken()
        config.headers = {
          ...config.headers,
          'x-csrf-token': csrfToken,
        }
      } catch (error) {
        // If CSRF token fetch fails, proceed without it (will likely get 403)
        console.warn('Failed to get CSRF token:', error)
      }
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        // Handle 401 errors - no manual token refresh needed with httpOnly cookies
        if (response.status === 401) {
          this.clearCSRFToken()
          this.onAuthError()
        }

        // Handle 403 CSRF errors - try to refresh CSRF token once
        if (response.status === 403 && this.csrfToken) {
          try {
            await this.refreshCSRFToken()
            // Retry the request with new CSRF token
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                'x-csrf-token': this.csrfToken,
              },
            }
            const retryResponse = await fetch(url, retryConfig)
            if (retryResponse.ok) {
              return await retryResponse.json()
            }
          } catch (retryError) {
            console.warn('CSRF token refresh retry failed:', retryError)
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

  // Clear auth state
  const clearAuth = useCallback(() => {
    clearCSRFToken() // Clear CSRF token on logout/auth clear
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      tokens: null,
    })
  }, [])

  // Check authentication status (httpOnly cookie-based)
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    try {
      const { isAuthenticated, user } = await AuthHelper.checkAuthStatus()

      if (isAuthenticated && user) {
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          tokens: null,
        })
      } else {
        clearAuth()
      }
    } catch (error) {
      clearAuth()
    }
  }, [clearAuth])

  // Initialize API client
  const apiClient = useMemo(
    () => new AuthApiClient(clearAuth, handleApiError),
    [clearAuth, handleApiError]
  )

  // Login
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      setAuthState(prev => ({ ...prev, isLoading: true }))

      try {
        // Use direct fetch for login to avoid token dependencies
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw { response: { status: response.status, data: errorData } }
        }

        const data = await response.json()

        if (data.success && data.data?.user) {
          const { user } = data.data

          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            tokens: null,
          })

          // Pre-fetch CSRF token for future requests
          try {
            await apiClient.refreshCSRFToken()
          } catch (csrfError) {
            console.warn('Failed to fetch CSRF token after login:', csrfError)
          }
        } else {
          throw new Error('Invalid login response')
        }
      } catch (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        handleApiError(error, 'login')
        throw error
      }
    },
    [handleApiError, apiClient]
  )

  // Register
  const register = useCallback(
    async (data: RegisterData): Promise<void> => {
      setAuthState(prev => ({ ...prev, isLoading: true }))

      try {
        const response = await apiClient.post<any>('/auth/register', data)

        if (response.success && response.data?.user) {
          const { user } = response.data

          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            tokens: null,
          })
        }
      } catch (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        handleApiError(error, 'registration')
        throw error
      }
    },
    [apiClient, handleApiError]
  )

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
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

  // Forgot password
  const forgotPassword = useCallback(
    async (data: ForgotPasswordData): Promise<void> => {
      try {
        await fetch(`${API_BASE_URL}/auth/forgot-password`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } catch (error) {
        handleApiError(error, 'password reset request')
        throw error
      }
    },
    [handleApiError]
  )

  // Reset password
  const resetPassword = useCallback(
    async (data: ResetPasswordData): Promise<void> => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw { response: { status: response.status, data: errorData } }
        }
      } catch (error) {
        handleApiError(error, 'password reset')
        throw error
      }
    },
    [handleApiError]
  )

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      // Check authentication status via server (httpOnly cookies)
      const { isAuthenticated, user } = await AuthHelper.checkAuthStatus()

      if (isAuthenticated && user) {
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          tokens: null,
        })
        // Pre-fetch CSRF token for authenticated users
        try {
          await apiClient.refreshCSRFToken()
          console.log('🔐 CSRF token initialized on app startup')
        } catch (csrfError) {
          console.warn('Failed to initialize CSRF token on startup:', csrfError)
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initAuth()
  }, [])

  // Get CSRF token
  const getCSRFToken = useCallback(async (): Promise<string> => {
    return await apiClient.refreshCSRFToken()
  }, [apiClient])

  // Request with authentication (compatible with fetch)
  const requestWithAuth = useCallback(
    async (url: string, options?: RequestInit): Promise<Response> => {
      const cleanUrl = url.startsWith('/api') ? url.slice(4) : url
      const response = await apiClient.request(cleanUrl, options)

      // Return a Response-like object
      return new Response(JSON.stringify(response), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      })
    },
    [apiClient]
  )

  const value: AuthContextValue = {
    ...authState,
    login,
    register,
    logout,
    refreshTokens: checkAuthStatus, // Use checkAuthStatus instead of refreshTokens
    updateProfile,
    changePassword,
    deleteAccount,
    forgotPassword,
    resetPassword,
    clearAuth,
    getCSRFToken,
    requestWithAuth,
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
