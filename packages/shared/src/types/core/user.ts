// User and authentication core types
export interface User {
  id: string
  email: string
  name?: string
  createdAt: number
  updatedAt: number
  isActive: boolean
  role: 'user' | 'admin'
}

export interface AuthSession {
  id: string
  userId: string
  token: string
  expiresAt: number
  createdAt: number
  isActive: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name?: string
}

// Authentication request types for API
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdateProfileRequest {
  name?: string
  email?: string
  avatar?: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

// Authentication response types
export interface LoginResponse {
  success: boolean
  user?: User
  token?: string
  expiresAt?: number
  message?: string
}

export interface RegisterResponse {
  success: boolean
  user?: User
  message?: string
}

export interface RefreshTokenResponse {
  success: boolean
  token?: string
  user?: User
  message?: string
}

// Authentication state
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  expiresAt: number | null
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    trading: boolean
  }
}

export interface UserIndicators {
  [key: string]: {
    enabled: boolean
    settings: Record<string, any>
  }
}
