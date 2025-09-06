import { z } from 'zod'
import {
  UserRepository,
  WatchlistRepository,
  RefreshTokenRepository,
} from '../../infrastructure/repositories'
import { PrismaClient } from '@prisma/client'

// Database integration with Repository pattern
export const prisma = new PrismaClient()
export const userRepository = new UserRepository(prisma)
export const watchlistRepository = new WatchlistRepository(prisma)
export const refreshTokenRepository = new RefreshTokenRepository(prisma)

// Type definitions
export type User = any

// Mock user database (in production, use proper database)
export interface MockUser {
  id: string
  email: string
  passwordHash: string
  name?: string
  avatar?: string
  role: 'user' | 'admin'
  isEmailVerified: boolean
  failedLoginCount: number
  lockedUntil?: Date
  lastLoginAt?: Date
  isActive: boolean
  resetToken?: string
  resetTokenExpiry?: Date
  createdAt: Date
  updatedAt: Date
}

// In-memory stores (for development)
export const users: Map<string, User> = new Map()
export const usersByEmail: Map<string, User> = new Map()

// Validation schemas - Core Authentication
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
})

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
})

// Validation schemas - Profile Management
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
})

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    avatar: z.string().url().optional(),
  }),
})

// Validation schemas - Password Recovery
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').toLowerCase(),
  }),
})

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
})

// Validation schemas - Admin Functions
export const updateUserSchema = z.object({
  body: z.object({
    isActive: z.boolean().optional(),
    role: z.enum(['user', 'admin']).optional(),
    name: z.string().min(1).max(50).optional(),
  }),
})

// Helper function to generate user ID
export const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Security configuration
export const MAX_LOGIN_ATTEMPTS = 5
export const LOCK_TIME = 15 * 60 * 1000 // 15 minutes

// Helper function to check if account is locked
export const isAccountLocked = (user: User): boolean => {
  return !!(user.lockedUntil && user.lockedUntil > new Date())
}

// Helper function to increment failed login attempts
export const incrementFailedLogin = (user: User): void => {
  user.failedLoginCount += 1
  if (user.failedLoginCount >= MAX_LOGIN_ATTEMPTS) {
    user.lockedUntil = new Date(Date.now() + LOCK_TIME)
  }
}

// Helper function to reset failed login attempts
export const resetFailedLogin = (user: User): void => {
  user.failedLoginCount = 0
  user.lockedUntil = undefined
}

// Helper function to create user response
export const createUserResponse = (user: User) => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  }
}

// Initialize development users
export const initializeDevUsers = () => {
  const testUsers = [
    {
      id: 'cmetntsgp0000qkeqtu2oz8yh',
      email: 'admin@tradingviewer.com',
      passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      name: 'Admin User',
      role: 'admin' as const,
      isEmailVerified: true,
      failedLoginCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'test_user_123',
      email: 'test@example.com',
      passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      name: 'Test User',
      role: 'user' as const,
      isEmailVerified: true,
      failedLoginCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  testUsers.forEach(user => {
    users.set(user.id, user)
    usersByEmail.set(user.email, user)
  })
}