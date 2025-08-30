// Authentication and user-related types
export interface User {
  id: string
  email: string
  username?: string
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

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  success: boolean
  user?: User
  token?: string
  expiresAt?: number
  message?: string
}

export interface RegisterRequest {
  email: string
  password: string
  username?: string
}

export interface RegisterResponse {
  success: boolean
  user?: User
  message?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  expiresAt: number | null
}

// User preferences types
export interface UserIndicators {
  id: string
  userId: string
  symbol: string
  indicators: Array<{
    type: string
    parameters: Record<string, any>
    visible: boolean
  }>
  createdAt: number
  updatedAt: number
}
