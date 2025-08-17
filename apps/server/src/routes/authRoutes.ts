import { Router, Request, Response } from 'express'
import { z } from 'zod'
import {
  generateTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  hashPassword,
  comparePassword,
  validatePassword,
  validateEmail,
  rateLimitAuth,
  clearAuthAttempts,
  requireAuth,
  requireCSRF,
  AuthenticatedRequest,
  COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  generateCSRFToken,
  revokeAllUserCSRFTokens,
} from '../middleware/auth'
import { validateRequest, asyncHandler } from '../middleware/errorHandling'
import { ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandling'
import { securityLogger, SecurityEventType, SecuritySeverity } from '../services/securityLogger'

// Database integration with Prisma
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Helper functions for authentication
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME = 30 * 60 * 1000 // 30 minutes

function isAccountLocked(user: any): boolean {
  return user.lockedUntil && user.lockedUntil > new Date()
}

async function incrementFailedLogin(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return

  const updates: any = {
    failedLoginCount: user.failedLoginCount + 1,
  }

  if (user.failedLoginCount + 1 >= MAX_LOGIN_ATTEMPTS) {
    updates.lockedUntil = new Date(Date.now() + LOCK_TIME)
  }

  await prisma.user.update({
    where: { id: userId },
    data: updates,
  })
}

async function resetFailedLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
    },
  })
}

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
})

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
})

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
})

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
})

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').toLowerCase(),
  }),
})

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
})

// User response helper
const createUserResponse = (user: any) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
  role: user.role as 'user' | 'admin',
  isEmailVerified: user.isEmailVerified,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
})

const router = Router()

// POST /api/auth/register
router.post(
  '/register',
  validateRequest(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ConflictError('User with this email already exists')
    }

    // Validate email
    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      throw new ValidationError('Invalid email', { errors: emailValidation.errors })
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      throw new ValidationError('Invalid password', { errors: passwordValidation.errors })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'user',
        isEmailVerified: false,
        failedLoginCount: 0,
        isActive: true,
      },
    })

    // Log security event
    securityLogger.log({
      type: SecurityEventType.USER_REGISTERED,
      severity: SecuritySeverity.INFO,
      message: 'User registered successfully',
      userId: user.id,
      metadata: {
        email: user.email,
        timestamp: new Date().toISOString(),
      },
    })

    // Generate tokens
    const tokens = generateTokens(user.id, user.role as 'user' | 'admin')

    // Set cookies
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, COOKIE_OPTIONS)
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    // Generate and set CSRF token
    const csrfToken = generateCSRFToken(user.id)
    res.cookie(CSRF_TOKEN_COOKIE, csrfToken, COOKIE_OPTIONS)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: createUserResponse(user),
      csrfToken,
    })
  })
)

// POST /api/auth/login
router.post(
  '/login',
  rateLimitAuth,
  validateRequest(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Log failed login attempt
      securityLogger.log({
        type: SecurityEventType.LOGIN_FAILED,
        severity: SecuritySeverity.WARNING,
        message: 'Login failed - user not found',
        metadata: {
          email,
          timestamp: new Date().toISOString(),
          ip: req.ip,
        },
      })
      throw new UnauthorizedError('Invalid credentials')
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      securityLogger.log({
        type: SecurityEventType.LOGIN_FAILED,
        severity: SecuritySeverity.WARNING,
        message: 'Login failed - account locked',
        userId: user.id,
        metadata: {
          email,
          timestamp: new Date().toISOString(),
          ip: req.ip,
        },
      })
      throw new UnauthorizedError(
        'Account is temporarily locked due to multiple failed login attempts'
      )
    }

    // Check if user is active
    if (!user.isActive) {
      securityLogger.log({
        type: SecurityEventType.LOGIN_FAILED,
        severity: SecuritySeverity.WARNING,
        message: 'Login failed - account inactive',
        userId: user.id,
        metadata: {
          email,
          timestamp: new Date().toISOString(),
          ip: req.ip,
        },
      })
      throw new UnauthorizedError('Account is inactive')
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash)
    if (!isValidPassword) {
      await incrementFailedLogin(user.id)
      securityLogger.log({
        type: SecurityEventType.LOGIN_FAILED,
        severity: SecuritySeverity.WARNING,
        message: 'Login failed - invalid password',
        userId: user.id,
        metadata: {
          email,
          timestamp: new Date().toISOString(),
          ip: req.ip,
        },
      })
      throw new UnauthorizedError('Invalid credentials')
    }

    // Reset failed login count on successful login
    await resetFailedLogin(user.id)

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Clear any existing auth attempts for this user
    clearAuthAttempts(user.id)

    // Generate tokens
    const tokens = generateTokens(user.id, user.role as 'user' | 'admin')

    // Set cookies
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, COOKIE_OPTIONS)
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    // Generate and set CSRF token
    const csrfToken = generateCSRFToken(user.id)
    res.cookie(CSRF_TOKEN_COOKIE, csrfToken, COOKIE_OPTIONS)

    // Log successful login
    securityLogger.log({
      type: SecurityEventType.LOGIN_SUCCESS,
      severity: SecuritySeverity.INFO,
      message: 'User logged in successfully',
      userId: user.id,
      metadata: {
        email: user.email,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: 'Login successful',
      user: createUserResponse(user),
      csrfToken,
    })
  })
)

// POST /api/auth/refresh
router.post(
  '/refresh',
  validateRequest(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body

    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken)

      // Check if user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      })

      if (!user || !user.isActive) {
        throw new UnauthorizedError('Invalid refresh token')
      }

      // Generate new tokens
      const tokens = generateTokens(user.id, user.role as 'user' | 'admin')

      // Set new cookies
      res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, COOKIE_OPTIONS)
      res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

      // Generate new CSRF token
      const csrfToken = generateCSRFToken(user.id)
      res.cookie(CSRF_TOKEN_COOKIE, csrfToken, COOKIE_OPTIONS)

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        user: createUserResponse(user),
        csrfToken,
      })
    } catch (error) {
      // Revoke the refresh token if it's invalid
      revokeRefreshToken(refreshToken)
      throw new UnauthorizedError('Invalid refresh token')
    }
  })
)

// POST /api/auth/logout
router.post(
  '/logout',
  requireAuth,
  requireCSRF,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId

    // Revoke all user tokens
    revokeAllUserTokens(userId)
    revokeAllUserCSRFTokens(userId)

    // Clear cookies
    res.clearCookie(ACCESS_TOKEN_COOKIE)
    res.clearCookie(REFRESH_TOKEN_COOKIE)
    res.clearCookie(CSRF_TOKEN_COOKIE)

    // Log logout
    securityLogger.log({
      type: SecurityEventType.LOGOUT,
      severity: SecuritySeverity.INFO,
      message: 'User logged out successfully',
      userId,
      metadata: {
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: 'Logout successful',
    })
  })
)

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    res.json({
      success: true,
      user: createUserResponse(user),
    })
  })
)

// POST /api/auth/change-password
router.post(
  '/change-password',
  requireAuth,
  requireCSRF,
  validateRequest(changePasswordSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId
    const { currentPassword, newPassword } = req.body

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      securityLogger.log({
        type: SecurityEventType.PASSWORD_CHANGE_FAILED,
        severity: SecuritySeverity.WARNING,
        message: 'Password change failed - invalid current password',
        userId,
        metadata: {
          timestamp: new Date().toISOString(),
          ip: req.ip,
        },
      })
      throw new UnauthorizedError('Current password is incorrect')
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      throw new ValidationError('Invalid new password', { errors: passwordValidation.errors })
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    })

    // Revoke all existing tokens to force re-login
    revokeAllUserTokens(userId)
    revokeAllUserCSRFTokens(userId)

    // Log password change
    securityLogger.log({
      type: SecurityEventType.PASSWORD_CHANGED,
      severity: SecuritySeverity.INFO,
      message: 'Password changed successfully',
      userId,
      metadata: {
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    })
  })
)

export default router
