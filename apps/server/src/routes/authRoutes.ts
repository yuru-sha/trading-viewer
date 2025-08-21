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
  rateLimitAuthMiddleware,
  clearAuthAttempts,
  requireAuth,
  AuthenticatedRequest,
  COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  revokeAllUserCSRFTokens,
} from '../middleware/auth'
import { validateRequest, asyncHandler } from '../middleware/errorHandling'
import { ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandling'
import { securityLogger, SecurityEventType, SecuritySeverity } from '../services/securityLogger'
import { PrismaClient } from '@prisma/client'
import { UserRepository } from '../repositories'

const router = Router()
const prisma = new PrismaClient()
const userRepository = new UserRepository(prisma)

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
})

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

const logoutSchema = z.object({
  allDevices: z.boolean().optional().default(false),
})

/**
 * 認証関連ルート（auth.ts から抽出）
 * - POST /register - ユーザー登録
 * - POST /login - ログイン
 * - POST /refresh - トークン更新
 * - POST /logout - ログアウト
 * - GET /me - 現在のユーザー情報取得
 */

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
    if (!emailValidation.isValid) {
      throw new ValidationError(emailValidation.message || 'Invalid email')
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.message || 'Invalid password')
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await userRepository.create({
      email,
      passwordHash: hashedPassword,
      role: 'user',
      isEmailVerified: false,
    })

    // Generate tokens
    const tokens = await generateTokens(user.id, user.email, user.role)

    // Security logging
    securityLogger.log(SecurityEventType.USER_REGISTRATION, SecuritySeverity.INFO, {
      userId: user.id,
      email: user.email,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
    })

    // Set cookies
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, COOKIE_OPTIONS)
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
    })
  })
)

// POST /api/auth/login
router.post(
  '/login',
  rateLimitAuthMiddleware,
  validateRequest(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body

    try {
      // Find user
      const user = await userRepository.findByEmail(email)

      if (!user) {
        throw new UnauthorizedError('Invalid email or password')
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password)
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password')
      }

      // Generate tokens
      const tokens = await generateTokens(user.id, user.email, user.role)

      // Clear any existing rate limit attempts on successful login
      await clearAuthAttempts(req.ip)

      // Security logging
      securityLogger.log(SecurityEventType.LOGIN_SUCCESS, SecuritySeverity.INFO, {
        userId: user.id,
        email: user.email,
      })

      // Set cookies
      res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, COOKIE_OPTIONS)
      res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS)

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        tokens,
      })
    } catch (error) {
      // Security logging for failed attempts
      securityLogger.log(SecurityEventType.LOGIN_FAILURE, SecuritySeverity.WARNING, {
        email,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
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
      user,
    })
  })
)

export default router
