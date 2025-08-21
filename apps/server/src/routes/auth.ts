import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import multer from 'multer'
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
import { requirePermission, requireAdmin, ResourceType, Action } from '../middleware/authorization'

const router = Router()

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true)
    } else {
      cb(new Error('Only JSON files are allowed'))
    }
  },
})

// Database integration with Repository pattern
import { UserRepository, WatchlistRepository, RefreshTokenRepository } from '../repositories'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const userRepository = new UserRepository(prisma)
const watchlistRepository = new WatchlistRepository(prisma)
const refreshTokenRepository = new RefreshTokenRepository(prisma)

// Mock user database (in production, use proper database)
export interface User {
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

const users: Map<string, User> = new Map()
const usersByEmail: Map<string, User> = new Map()

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

const updateProfileSchema = z.object({
  body: z.object({
    avatar: z.string().url().optional(),
  }),
})

// Helper function to generate user ID
const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Security configuration
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_TIME = 15 * 60 * 1000 // 15 minutes

// Helper function to check if account is locked
const isAccountLocked = (user: User): boolean => {
  return !!(user.lockedUntil && user.lockedUntil > new Date())
}

// Helper function to increment failed login attempts
const incrementFailedLogin = async (userId: string): Promise<void> => {
  try {
    const result = await userRepository.updateLoginCount(userId, true)

    // Lock account if max attempts reached
    if (result.failedLoginCount >= MAX_LOGIN_ATTEMPTS) {
      await userRepository.lockUser(userId, new Date(Date.now() + LOCK_TIME))
    }
  } catch (error) {
    console.error('Failed to increment login attempts:', error)
  }
}

// Helper function to reset failed login attempts
const resetFailedLogin = async (userId: string): Promise<void> => {
  try {
    await userRepository.unlockUser(userId)
    await userRepository.updateLastLogin(userId)
  } catch (error) {
    console.error('Failed to reset login attempts:', error)
  }
}

// Helper function to create user response (without password)
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

// POST /api/auth/register
router.post(
  '/register',
  validateRequest(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email)

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

    // Create user in database
    const user = await userRepository.create({
      email,
      passwordHash,
      role: 'user',
      isEmailVerified: false, // In production, implement email verification
      failedLoginCount: 0,
      isActive: true,
    })

    // Create default watchlist with tech giants
    const defaultWatchlist = [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    ]

    // Create default watchlist items using repository
    for (const item of defaultWatchlist) {
      await watchlistRepository.create({
        userId: user.id,
        symbol: item.symbol,
        name: item.name,
      })
    }

    // Log registration event
    securityLogger.logRequest(
      req as AuthenticatedRequest,
      SecurityEventType.REGISTER,
      `New user registered: ${email}`,
      SecuritySeverity.INFO,
      { userId: user.id, email }
    )

    // Generate tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
    })

    // Set cookies
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, COOKIE_OPTIONS)
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: createUserResponse(user),
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      },
    })
  })
)

// POST /api/auth/login
router.post(
  '/login',
  validateRequest(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown'

    try {
      // Rate limiting
      await rateLimitAuth(email)

      // Find user
      const user = await userRepository.findByEmail(email)

      if (!user) {
        securityLogger.logAuthFailure(req as AuthenticatedRequest, email, 'User not found')
        throw new UnauthorizedError('Invalid email or password')
      }

      // Check if account is active
      if (!user.isActive) {
        securityLogger.logAuthFailure(req as AuthenticatedRequest, email, 'Account deactivated')
        throw new UnauthorizedError('Account has been deactivated')
      }

      // Check if account is locked
      if (isAccountLocked(user)) {
        securityLogger.logAuthFailure(req as AuthenticatedRequest, email, 'Account locked')
        throw new UnauthorizedError(
          `Account is locked. Try again after ${user.lockedUntil?.toLocaleTimeString()}`
        )
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.passwordHash)
      if (!isValidPassword) {
        await incrementFailedLogin(user.id)
        securityLogger.logAuthFailure(req as AuthenticatedRequest, email, 'Invalid password')
        throw new UnauthorizedError('Invalid email or password')
      }

      // Clear failed attempts on successful login
      await resetFailedLogin(user.id)
      await clearAuthAttempts(email)

      // Log successful login
      securityLogger.logAuthSuccess(req as AuthenticatedRequest, user.id, email)

      // Generate tokens
      const tokens = await generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role as 'user' | 'admin',
      })

      // Set cookies
      res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, COOKIE_OPTIONS)
      res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: createUserResponse(user),
          accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        },
      })
    } catch (error) {
      // Log rate limit events
      if (
        error instanceof UnauthorizedError &&
        error.message.includes('Too many failed attempts')
      ) {
        securityLogger.logRateLimitExceeded(req as AuthenticatedRequest, email)
      }
      // Don't clear rate limiting on other errors
      throw error
    }
  })
)

// POST /api/auth/refresh
router.post(
  '/refresh',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Get refresh token from cookie or body (fallback for API clients)
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body.refreshToken

    if (!refreshToken) {
      securityLogger.logRequest(
        req,
        SecurityEventType.TOKEN_INVALID,
        'Missing refresh token',
        SecuritySeverity.WARNING
      )
      throw new UnauthorizedError('Refresh token is required')
    }

    // Verify refresh token
    const { userId } = await verifyRefreshToken(refreshToken)

    // Log token refresh
    securityLogger.logRequest(
      req,
      SecurityEventType.TOKEN_REFRESH,
      `Token refreshed for user ${userId}`,
      SecuritySeverity.INFO
    )

    // Find user
    const user = await userRepository.findById(userId)
    if (!user) {
      revokeRefreshToken(refreshToken)
      throw new UnauthorizedError('User not found')
    }

    // Revoke old refresh token
    await revokeRefreshToken(refreshToken)

    // Generate new tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
    })

    // Set new cookies
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, COOKIE_OPTIONS)
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role as 'user' | 'admin',
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      },
    })
  })
)

// POST /api/auth/logout
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Log logout event
    securityLogger.logRequest(
      req,
      SecurityEventType.LOGOUT,
      `User logged out: ${req.user!.email}`,
      SecuritySeverity.INFO
    )

    // Revoke all user's refresh tokens
    revokeAllUserTokens(req.user!.userId)

    // Clear cookies
    res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS)
    res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS)

    res.json({
      success: true,
      message: 'Logged out successfully',
    })
  })
)

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await userRepository.findById(req.user!.userId)
    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as 'user' | 'admin',
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
        },
      },
    })
  })
)

// GET /api/auth/csrf-token
router.get(
  '/csrf-token',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user?.userId) {
      throw new UnauthorizedError('Authentication required')
    }

    const csrfToken = await generateCSRFToken(req.user.userId)

    res.json({
      success: true,
      data: {
        csrfToken,
      },
    })
  })
)

// PUT /api/auth/profile
router.put(
  '/profile',
  requireAuth,
  requireCSRF,
  requirePermission(ResourceType.USER_PROFILE, Action.UPDATE, req => req.user!.userId),
  validateRequest(updateProfileSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { avatar } = req.body

    const user = await userRepository.findById(req.user!.userId)

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    // Update profile in database
    const updatedUser = await userRepository.update(req.user!.userId, {
      // Note: avatar field doesn't exist in current schema, would need migration
    })

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          isEmailVerified: updatedUser.isEmailVerified,
          createdAt: updatedUser.createdAt,
        },
      },
    })
  })
)

// POST /api/auth/change-password
router.post(
  '/change-password',
  requireAuth,
  requireCSRF,
  requirePermission(ResourceType.USER_SETTINGS, Action.UPDATE, req => req.user!.userId),
  validateRequest(changePasswordSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body

    const user = await userRepository.findById(req.user!.userId)

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect')
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      throw new ValidationError('Invalid new password', { errors: passwordValidation.errors })
    }

    // Check if new password is different from current
    const isSamePassword = await comparePassword(newPassword, user.passwordHash)
    if (isSamePassword) {
      throw new ValidationError('New password must be different from current password')
    }

    // Hash new password and update in database
    const hashedNewPassword = await hashPassword(newPassword)
    await userRepository.update(req.user!.userId, {
      passwordHash: hashedNewPassword,
    })

    // Log password change
    securityLogger.logRequest(
      req,
      SecurityEventType.PASSWORD_CHANGE,
      `Password changed for user ${user.email}`,
      SecuritySeverity.HIGH,
      { userId: user.id, email: user.email }
    )

    // Revoke all user's tokens to force re-login
    revokeAllUserTokens(user.id)
    revokeAllUserCSRFTokens(user.id)

    // Clear cookies
    res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS)
    res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS)

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    })
  })
)

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  validateRequest(forgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body

    // Check if user exists
    const user = await userRepository.findByEmail(email)

    // Always return success to prevent email enumeration
    // but only send email if user exists
    if (user && user.isActive) {
      // Generate reset token
      const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 20)}`
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Store reset token in database
      await userRepository.update(user.id, {
        resetToken,
        resetTokenExpiry,
      })

      // Log password reset request
      securityLogger.logRequest(
        req as AuthenticatedRequest,
        SecurityEventType.PASSWORD_RESET_REQUEST,
        `Password reset requested for ${email}`,
        SecuritySeverity.INFO,
        { userId: user.id, email }
      )

      // TODO: Send email with reset link
      console.log(`Password reset token for ${email}: ${resetToken}`)
      console.log(`Reset link: http://localhost:3000/reset-password?token=${resetToken}`)
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  })
)

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body

    // Find user with valid reset token
    const user = await userRepository.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
        isActive: true,
      },
    })

    if (!user) {
      throw new UnauthorizedError('Invalid or expired reset token')
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      throw new ValidationError('Invalid password', { errors: passwordValidation.errors })
    }

    // Hash new password and update in database
    const hashedNewPassword = await hashPassword(newPassword)
    await userRepository.update(user.id, {
      passwordHash: hashedNewPassword,
      resetToken: null,
      resetTokenExpiry: null,
      failedLoginCount: 0,
      lockedUntil: null,
    })

    // Log successful password reset
    securityLogger.logRequest(
      req as AuthenticatedRequest,
      SecurityEventType.PASSWORD_RESET_SUCCESS,
      `Password reset completed for ${user.email}`,
      SecuritySeverity.HIGH,
      { userId: user.id, email: user.email }
    )

    // Revoke all user's tokens to force re-login
    revokeAllUserTokens(user.id)
    revokeAllUserCSRFTokens(user.id)

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    })
  })
)

// DELETE /api/auth/account
router.delete(
  '/account',
  requireAuth,
  requireCSRF,
  requirePermission(ResourceType.USER_DATA, Action.DELETE, req => req.user!.userId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await userRepository.findById(req.user!.userId)

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    // Log account deletion
    securityLogger.logRequest(
      req,
      SecurityEventType.ACCOUNT_DELETION,
      `Account deleted: ${user.email}`,
      SecuritySeverity.HIGH,
      { userId: user.id, email: user.email }
    )

    // Delete user from database (cascade will handle related records)
    await userRepository.delete(req.user!.userId)

    // Revoke all tokens
    revokeAllUserTokens(user.id)
    revokeAllUserCSRFTokens(user.id)

    // Clear cookies
    res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS)
    res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS)

    res.json({
      success: true,
      message: 'Account deleted successfully',
    })
  })
)

// GET /api/auth/stats (admin only)
router.get(
  '/stats',
  requireAuth,
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const totalUsers = await userRepository.count()
    const verifiedUsers = await userRepository.count({ where: { isEmailVerified: true } })
    const adminUsers = await userRepository.count({ where: { role: 'admin' } })
    const activeUsers = await userRepository.count({ where: { isActive: true } })

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
        adminUsers,
        regularUsers: totalUsers - adminUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
      },
    })
  })
)

// GET /api/auth/users (admin only)
router.get(
  '/users',
  requireAuth,
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const skip = (page - 1) * limit

    const search = req.query.search as string
    const role = req.query.role as string
    const status = req.query.status as string

    const where: any = {}

    if (search) {
      where.OR = [{ email: { contains: search, mode: 'insensitive' } }]
    }

    if (role && ['admin', 'user'].includes(role)) {
      where.role = role
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    const [users, totalCount] = await Promise.all([
      userRepository.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          isEmailVerified: true,
          isActive: true,
          failedLoginCount: true,
          lockedUntil: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      userRepository.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    })
  })
)

// GET /api/auth/users/:userId (admin only)
router.get(
  '/users/:userId',
  requireAuth,
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params

    const user = await userRepository.findById(userId, {
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        failedLoginCount: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      throw new ValidationError('User not found')
    }

    res.json({
      success: true,
      data: user,
    })
  })
)

// PUT /api/auth/users/:userId/status (admin only)
router.put(
  '/users/:userId/status',
  requireAuth,
  requireAdmin(),
  requireCSRF,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      throw new ValidationError('isActive must be a boolean value')
    }

    // Prevent admin from deactivating themselves
    if (req.user!.userId === userId && !isActive) {
      throw new ValidationError('You cannot deactivate your own account')
    }

    const user = await userRepository.findById(userId)

    if (!user) {
      throw new ValidationError('User not found')
    }

    const updatedUser = await userRepository.update(userId, {
      isActive,
      lockedUntil: null, // Clear any lockout when activating
      failedLoginCount: 0, // Reset failed attempts when activating
    })

    // Log the action
    securityLogger.logRequest(
      req,
      SecurityEventType.USER_STATUS_CHANGE,
      `User ${user.email} ${isActive ? 'activated' : 'deactivated'} by admin ${req.user!.email}`,
      SecuritySeverity.HIGH,
      { targetUserId: userId, targetEmail: user.email, newStatus: isActive }
    )

    // If deactivating, revoke all user's tokens
    if (!isActive) {
      revokeAllUserTokens(userId)
      revokeAllUserCSRFTokens(userId)
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          isActive: updatedUser.isActive,
        },
      },
    })
  })
)

// PUT /api/auth/users/:userId/role (admin only)
router.put(
  '/users/:userId/role',
  requireAuth,
  requireAdmin(),
  requireCSRF,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params
    const { role } = req.body

    if (!['admin', 'user'].includes(role)) {
      throw new ValidationError('Role must be either "admin" or "user"')
    }

    // Prevent admin from demoting themselves
    if (req.user!.userId === userId && role === 'user') {
      throw new ValidationError('You cannot change your own role')
    }

    const user = await userRepository.findById(userId)

    if (!user) {
      throw new ValidationError('User not found')
    }

    const updatedUser = await userRepository.update(userId, { role })

    // Log the action
    securityLogger.logRequest(
      req,
      SecurityEventType.ROLE_CHANGE,
      `User ${user.email} role changed from ${user.role} to ${role} by admin ${req.user!.email}`,
      SecuritySeverity.HIGH,
      { targetUserId: userId, targetEmail: user.email, oldRole: user.role, newRole: role }
    )

    res.json({
      success: true,
      message: `User role updated successfully`,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      },
    })
  })
)

// POST /api/auth/users/:userId/unlock (admin only)
router.post(
  '/users/:userId/unlock',
  requireAuth,
  requireAdmin(),
  requireCSRF,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params

    const user = await userRepository.findById(userId)

    if (!user) {
      throw new ValidationError('User not found')
    }

    await userRepository.update(userId, {
      failedLoginCount: 0,
      lockedUntil: null,
    })

    // Log the action
    securityLogger.logRequest(
      req,
      SecurityEventType.ACCOUNT_UNLOCKED,
      `User ${user.email} unlocked by admin ${req.user!.email}`,
      SecuritySeverity.INFO,
      { targetUserId: userId, targetEmail: user.email }
    )

    res.json({
      success: true,
      message: 'User account unlocked successfully',
    })
  })
)

// Development/testing endpoints (strictly controlled)
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_ENDPOINTS === 'true') {
  console.warn('⚠️  Development endpoints are enabled. DO NOT use in production!')

  // Initialize development users in database
  const initializeDevUsers = async () => {
    try {
      // Create admin user if not exists
      const adminExists = await userRepository.findByEmail('admin@tradingviewer.com')

      if (!adminExists) {
        await userRepository.create({
          data: {
            email: 'admin@tradingviewer.com',
            passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBFiMLGwc5tVmy', // password: admin123!
            role: 'admin',
            isEmailVerified: true,
            isActive: true,
            failedLoginCount: 0,
          },
        })
        console.log('✅ Admin user created: admin@tradingviewer.com')
      }

      // Create test user if not exists
      const testExists = await userRepository.findByEmail('test@example.com')

      if (!testExists) {
        await userRepository.create({
          data: {
            email: 'test@example.com',
            passwordHash: await hashPassword('password123'),
            role: 'user',
            isEmailVerified: true,
            isActive: true,
            failedLoginCount: 0,
          },
        })
        console.log('✅ Test user created: test@example.com')
      }
    } catch (error) {
      console.error('Failed to initialize dev users:', error)
    }
  }

  // Initialize users on startup
  initializeDevUsers()

  // GET /api/auth/dev/users - List all users (dev only)
  router.get('/dev/users', (req: Request, res: Response) => {
    const userList = Array.from(users.values()).map(createUserResponse)
    res.json({
      success: true,
      data: { users: userList },
    })
  })

  // POST /api/auth/dev/seed - Create test users (dev only)
  router.post(
    '/dev/seed',
    asyncHandler(async (req: Request, res: Response) => {
      const testUsers = [
        { email: 'user1@test.com', password: 'Test123!' },
        { email: 'user2@test.com', password: 'Test123!' },
        { email: 'trader@test.com', password: 'Trade123!' },
      ]

      for (const testUser of testUsers) {
        if (!usersByEmail.has(testUser.email)) {
          const userId = generateUserId()
          const user: User = {
            id: userId,
            email: testUser.email,
            passwordHash: await hashPassword(testUser.password),
            role: 'user',
            isEmailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          users.set(userId, user)
          usersByEmail.set(testUser.email, user)
        }
      }

      res.json({
        success: true,
        message: `${testUsers.length} test users created`,
        data: { totalUsers: users.size },
      })
    })
  )
}

// POST /api/auth/users/import (admin only)
router.post(
  '/users/import',
  requireAuth,
  requireAdmin(),
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      throw new ValidationError('No file provided')
    }

    const results: any[] = []
    const errors: Array<{
      row: number
      field: string
      value: string
      error: string
    }> = []
    const warnings: string[] = []
    let successfulImports = 0
    let failedImports = 0

    // Parse JSON data
    try {
      const jsonData = JSON.parse(req.file.buffer.toString())
      if (Array.isArray(jsonData)) {
        results.push(...jsonData)
      } else {
        throw new ValidationError('JSON file must contain an array of user objects')
      }
    } catch (error) {
      throw new ValidationError('Invalid JSON format')
    }

    // Process each row
    for (let i = 0; i < results.length; i++) {
      const row = results[i]
      const lineNumber = i + 1 // Line number in JSON array

      try {
        // Validate required fields
        if (!row.email || !validateEmail(row.email)) {
          errors.push({
            row: lineNumber,
            field: 'email',
            value: row.email || '',
            error: 'Invalid or missing email',
          })
          failedImports++
          continue
        }

        // Check if user exists
        const existingUser = await userRepository.findByEmail(row.email.toLowerCase().trim())

        const userData = {
          email: row.email.toLowerCase().trim(),
          role: ['admin', 'user'].includes(row.role) ? row.role : 'user',
          isActive: row.isActive === 'true' || row.isActive === true || row.isActive === '1',
        }

        if (existingUser) {
          // Update existing user
          await userRepository.update(existingUser.id, userData)
          warnings.push(`User ${row.email} already exists - updated existing record`)
          successfulImports++
        } else {
          // Create new user
          const password = row.password || `temp${Date.now()}`
          if (!validatePassword(password)) {
            errors.push({
              row: lineNumber,
              field: 'password',
              value: password,
              error: 'Invalid password (must be at least 8 characters)',
            })
            failedImports++
            continue
          }

          await userRepository.create({
            data: {
              ...userData,
              passwordHash: await hashPassword(password),
              isEmailVerified:
                row.isEmailVerified === 'true' ||
                row.isEmailVerified === true ||
                row.isEmailVerified === '1',
            },
          })
          successfulImports++
        }
      } catch (error) {
        console.error(`Import error for line ${lineNumber}:`, error)
        errors.push({
          row: lineNumber,
          field: 'general',
          value: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        failedImports++
      }
    }

    securityLogger.log({
      eventType: SecurityEventType.USER_STATUS_CHANGE,
      message: `User import completed by ${req.user!.email}`,
      metadata: { successfulImports, failedImports, totalRows: results.length },
      severity: SecuritySeverity.INFO,
    })

    res.json({
      success: true,
      data: {
        successfulImports,
        failedImports,
        totalProcessed: results.length,
        totalRows: results.length,
        errors: errors.slice(0, 50), // Limit error messages
        warnings: warnings.slice(0, 50), // Limit warning messages
      },
    })
  })
)

// GET /api/auth/users/export (admin only)
router.get(
  '/users/export',
  requireAuth,
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const includePersonalInfo = req.query.includePersonalInfo === 'true'
    const includeWorkInfo = req.query.includeWorkInfo === 'true'
    const includePreferences = req.query.includePreferences === 'true'
    const includeSecurityInfo = req.query.includeSecurityInfo === 'true'
    const includeActivityInfo = req.query.includeActivityInfo === 'true'
    const format = req.query.format || 'json'
    const userIds = req.query.userIds ? (req.query.userIds as string).split(',') : undefined

    // Build where clause
    const where: any = {}
    if (userIds && userIds.length > 0) {
      where.id = { in: userIds }
    }

    // Fetch users
    const users = await userRepository.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        failedLoginCount: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Generate JSON file download
    const jsonData = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      ...(includeSecurityInfo && {
        failedLoginCount: user.failedLoginCount,
        isLocked: user.lockedUntil ? new Date(user.lockedUntil) > new Date() : false,
      }),
      ...(includeActivityInfo && {
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : '',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }),
    }))

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `users-export-${timestamp}.json`

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(JSON.stringify(jsonData, null, 2))

    securityLogger.log({
      eventType: SecurityEventType.USER_STATUS_CHANGE,
      message: `User data exported by ${req.user!.email}`,
      metadata: {
        userCount: users.length,
        format,
        includePersonalInfo,
        includeWorkInfo,
        includePreferences,
      },
      severity: SecuritySeverity.INFO,
    })
  })
)

export default router
