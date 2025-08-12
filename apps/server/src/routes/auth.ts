import { Router, Request, Response, NextFunction } from 'express'
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
  AuthenticatedRequest,
  COOKIE_OPTIONS,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../middleware/auth'
import { validateRequest, asyncHandler } from '../middleware/errorHandling'
import { ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandling'
import { securityLogger, SecurityEventType, SecuritySeverity } from '../services/securityLogger'
import { requirePermission, requireAdmin, ResourceType, Action } from '../middleware/authorization'

const router = Router()

// Mock user database (in production, use proper database)
interface User {
  id: string
  email: string
  passwordHash: string
  role: 'user' | 'admin'
  isEmailVerified: boolean
  createdAt: Date
  updatedAt: Date
  profile?: {
    firstName?: string
    lastName?: string
    avatar?: string
  }
}

const users: Map<string, User> = new Map()
const usersByEmail: Map<string, User> = new Map()

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required').max(50).optional(),
    lastName: z.string().min(1, 'Last name is required').max(50).optional(),
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

const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    avatar: z.string().url().optional(),
  }),
})

// Helper function to generate user ID
const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Helper function to create user response (without password)
const createUserResponse = (user: User) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  profile: user.profile || {},
})

// POST /api/auth/register
router.post(
  '/register',
  validateRequest(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName } = req.body

    // Check if user already exists
    if (usersByEmail.has(email)) {
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
    const userId = generateUserId()
    const user: User = {
      id: userId,
      email,
      passwordHash,
      role: 'user',
      isEmailVerified: false, // In production, implement email verification
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {
        firstName,
        lastName,
      },
    }

    users.set(userId, user)
    usersByEmail.set(email, user)

    // Log registration event
    securityLogger.logRequest(
      req as AuthenticatedRequest,
      SecurityEventType.REGISTER,
      `New user registered: ${email}`,
      SecuritySeverity.INFO,
      { userId, email }
    )

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Set cookies
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    })
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

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
      rateLimitAuth(email)

      // Find user
      const user = usersByEmail.get(email)
      if (!user) {
        securityLogger.logAuthFailure(req as AuthenticatedRequest, email, 'User not found')
        throw new UnauthorizedError('Invalid email or password')
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.passwordHash)
      if (!isValidPassword) {
        securityLogger.logAuthFailure(req as AuthenticatedRequest, email, 'Invalid password')
        throw new UnauthorizedError('Invalid email or password')
      }

      // Clear failed attempts on successful login
      clearAuthAttempts(email)

      // Log successful login
      securityLogger.logAuthSuccess(req as AuthenticatedRequest, user.id, email)

      // Update last login
      user.updatedAt = new Date()

      // Generate tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      // Set cookies
      res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000, // 15 minutes
      })
      res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })

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
    const { userId } = verifyRefreshToken(refreshToken)

    // Log token refresh
    securityLogger.logRequest(
      req,
      SecurityEventType.TOKEN_REFRESH,
      `Token refreshed for user ${userId}`,
      SecuritySeverity.INFO
    )

    // Find user
    const user = users.get(userId)
    if (!user) {
      revokeRefreshToken(refreshToken)
      throw new UnauthorizedError('User not found')
    }

    // Revoke old refresh token
    revokeRefreshToken(refreshToken)

    // Generate new tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Set new cookies
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    })
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        user: createUserResponse(user),
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
    const user = users.get(req.user!.userId)
    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    res.json({
      success: true,
      data: {
        user: createUserResponse(user),
      },
    })
  })
)

// PUT /api/auth/profile
router.put(
  '/profile',
  requireAuth,
  requirePermission(ResourceType.USER_PROFILE, Action.UPDATE, req => req.user!.userId),
  validateRequest(updateProfileSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { firstName, lastName, avatar } = req.body
    const user = users.get(req.user!.userId)

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    // Update profile
    user.profile = {
      ...user.profile,
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(avatar !== undefined && { avatar }),
    }
    user.updatedAt = new Date()

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: createUserResponse(user),
      },
    })
  })
)

// POST /api/auth/change-password
router.post(
  '/change-password',
  requireAuth,
  requirePermission(ResourceType.USER_SETTINGS, Action.UPDATE, req => req.user!.userId),
  validateRequest(changePasswordSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body
    const user = users.get(req.user!.userId)

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

    // Hash new password
    user.passwordHash = await hashPassword(newPassword)
    user.updatedAt = new Date()

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

    // Clear cookies
    res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS)
    res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS)

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    })
  })
)

// DELETE /api/auth/account
router.delete(
  '/account',
  requireAuth,
  requirePermission(ResourceType.USER_DATA, Action.DELETE, req => req.user!.userId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = users.get(req.user!.userId)

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

    // Remove user from storage
    users.delete(user.id)
    usersByEmail.delete(user.email)

    // Revoke all tokens
    revokeAllUserTokens(user.id)

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
    const totalUsers = users.size
    const verifiedUsers = Array.from(users.values()).filter(u => u.isEmailVerified).length
    const adminUsers = Array.from(users.values()).filter(u => u.role === 'admin').length

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
        adminUsers,
        regularUsers: totalUsers - adminUsers,
      },
    })
  })
)

// Development/testing endpoints (strictly controlled)
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_ENDPOINTS === 'true') {
  console.warn('⚠️  Development endpoints are enabled. DO NOT use in production!')
  // Create default admin user
  const adminId = generateUserId()
  const adminUser: User = {
    id: adminId,
    email: 'admin@tradingviewer.com',
    passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBFiMLGwc5tVmy', // password: admin123!
    role: 'admin',
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      firstName: 'Admin',
      lastName: 'User',
    },
  }
  users.set(adminId, adminUser)
  usersByEmail.set(adminUser.email, adminUser)

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
        { email: 'user1@test.com', password: 'Test123!', firstName: 'John', lastName: 'Doe' },
        { email: 'user2@test.com', password: 'Test123!', firstName: 'Jane', lastName: 'Smith' },
        { email: 'trader@test.com', password: 'Trade123!', firstName: 'Alex', lastName: 'Trader' },
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
            profile: {
              firstName: testUser.firstName,
              lastName: testUser.lastName,
            },
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

export default router
