// User and authentication core types
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

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  username?: string
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
