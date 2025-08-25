import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { UnauthorizedError, ForbiddenError } from './errorHandling'
import {
  TokenBlacklist,
  RefreshTokenStore,
  CSRFTokenStore,
  RateLimitStore,
} from '../services/tokenStore.js'

// JWT payload interface
export interface JWTPayload {
  userId: string
  email: string
  role: 'user' | 'admin'
  iat?: number
  exp?: number
}

// Extended Request interface with user info and cookies
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload
  tokenVersion?: number
  cookies: Record<string, string>
}

// JWT configuration
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default-secret-change-in-production') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment')
  }
  console.warn(
    '⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable in production.'
  )
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

// Cookie configuration with environment-based security
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Enable secure in production
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 minutes for access token
}

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
}

export const ACCESS_TOKEN_COOKIE = 'access_token'
export const REFRESH_TOKEN_COOKIE = 'refresh_token'
export const CSRF_TOKEN_COOKIE = 'csrf_token'

// Rate limiting for authentication attempts (kept in memory for simplicity)
// In production, this should also use Redis for distributed rate limiting

// JWT utilities
export const generateTokens = async (
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): Promise<{
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  refreshTokenExpiresAt: Date
}> => {
  const accessTokenExpiresAt = new Date()
  const refreshTokenExpiresAt = new Date()

  // Calculate expiration times
  if (JWT_EXPIRES_IN.endsWith('m')) {
    accessTokenExpiresAt.setMinutes(accessTokenExpiresAt.getMinutes() + parseInt(JWT_EXPIRES_IN))
  } else if (JWT_EXPIRES_IN.endsWith('h')) {
    accessTokenExpiresAt.setHours(accessTokenExpiresAt.getHours() + parseInt(JWT_EXPIRES_IN))
  } else if (JWT_EXPIRES_IN.endsWith('d')) {
    accessTokenExpiresAt.setDate(accessTokenExpiresAt.getDate() + parseInt(JWT_EXPIRES_IN))
  }

  if (JWT_REFRESH_EXPIRES_IN.endsWith('d')) {
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + parseInt(JWT_REFRESH_EXPIRES_IN)
    )
  } else if (JWT_REFRESH_EXPIRES_IN.endsWith('h')) {
    refreshTokenExpiresAt.setHours(
      refreshTokenExpiresAt.getHours() + parseInt(JWT_REFRESH_EXPIRES_IN)
    )
  }

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256', // Explicitly set algorithm to prevent confusion attacks
  } as jwt.SignOptions)
  const refreshToken = jwt.sign({ userId: payload.userId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256', // Explicitly set algorithm
  } as jwt.SignOptions)

  // Store refresh token in database
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: payload.userId,
        expiresAt: refreshTokenExpiresAt,
        isRevoked: false,
      },
    })
  } catch (error) {
    console.error('Failed to store refresh token:', error)
    throw new Error('Token generation failed')
  }

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  }
}

export const verifyAccessToken = async (token: string): Promise<JWTPayload> => {
  console.log('🔍 verifyAccessToken called with token:', token ? 'exists' : 'missing')

  // Check if token is blacklisted using Redis
  if (await TokenBlacklist.isBlacklisted(token)) {
    throw new UnauthorizedError('Token has been revoked')
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    console.log('🔍 Token decoded successfully:', { userId: decoded.userId, email: decoded.email })
    return decoded
  } catch (error) {
    console.log(
      '🔍 Token verification failed:',
      error instanceof Error ? error.message : 'unknown error'
    )
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid access token')
    }
    throw new UnauthorizedError('Token verification failed')
  }
}

export const verifyRefreshToken = async (token: string): Promise<{ userId: string }> => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string }

    // Check if token exists in database and is not revoked
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    })

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token')
    }

    if (storedToken.isRevoked) {
      throw new UnauthorizedError('Refresh token has been revoked')
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired')
    }

    if (decoded.userId !== storedToken.userId) {
      throw new UnauthorizedError('Token mismatch')
    }

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token has expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token')
    } else if (error instanceof UnauthorizedError) {
      throw error
    }
    throw new UnauthorizedError('Refresh token verification failed')
  }
}

export const revokeToken = async (token: string): Promise<void> => {
  // Extract expiration from token for Redis TTL
  let expirationSeconds: number | undefined

  try {
    const decoded = jwt.decode(token) as JWTPayload
    if (decoded && decoded.exp) {
      const now = Math.floor(Date.now() / 1000)
      expirationSeconds = Math.max(0, decoded.exp - now)
    }
  } catch (error) {
    console.warn('Could not extract expiration from token for blacklist TTL')
  }

  await TokenBlacklist.add(token, expirationSeconds)
}

export const revokeRefreshToken = async (token: string): Promise<void> => {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    await prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    })
  } catch (error) {
    console.error('Failed to revoke refresh token:', error)
  }
}

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    })
  } catch (error) {
    console.error('Failed to revoke user tokens:', error)
  }
}

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')
  return await bcrypt.hash(password, saltRounds)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

// Validation utilities
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!password) {
    errors.push('Password is required')
    return { valid: false, errors }
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters')
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password',
    'password123',
    '12345678',
    'qwerty',
    'abc123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    '1234567890',
  ]

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common')
  }

  return { valid: errors.length === 0, errors }
}

export const validateEmail = (email: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!email) {
    errors.push('Email is required')
    return { valid: false, errors }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format')
  }

  if (email.length > 320) {
    errors.push('Email is too long')
  }

  return { valid: errors.length === 0, errors }
}

// Authentication middleware with Cookie support
export const requireAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined

    // First check cookies (preferred)
    if (req.cookies && req.cookies[ACCESS_TOKEN_COOKIE]) {
      token = req.cookies[ACCESS_TOKEN_COOKIE]
    }
    // Fallback to Authorization header for API clients
    else if (req.headers.authorization) {
      const authHeader = req.headers.authorization
      const [bearer, headerToken] = authHeader.split(' ')

      if (bearer === 'Bearer' && headerToken) {
        token = headerToken
      }
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required')
    }

    const user = await verifyAccessToken(token)
    req.user = user

    next()
  } catch (error) {
    next(error)
  }
}

// Optional authentication middleware with Cookie support
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined

    // First check cookies
    if (req.cookies && req.cookies[ACCESS_TOKEN_COOKIE]) {
      token = req.cookies[ACCESS_TOKEN_COOKIE]
    }
    // Fallback to Authorization header
    else if (req.headers.authorization) {
      const authHeader = req.headers.authorization
      const [bearer, headerToken] = authHeader.split(' ')

      if (bearer === 'Bearer' && headerToken) {
        token = headerToken
      }
    }

    if (token) {
      try {
        const user = await verifyAccessToken(token)
        req.user = user
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Role-based authorization middleware
export const requireRole = (...roles: Array<'user' | 'admin'>) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required')
      }

      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError('Insufficient permissions')
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

// CSRF protection middleware
export const requireCSRF = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required')
    }

    // Skip CSRF check for GET requests (they should be idempotent)
    if (req.method === 'GET') {
      next()
      return
    }

    const csrfToken = req.headers['x-csrf-token'] as string

    if (!csrfToken) {
      throw new ForbiddenError('CSRF token is required')
    }

    if (!(await verifyCSRFToken(csrfToken, req.user.userId))) {
      throw new ForbiddenError('Invalid CSRF token')
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Rate limiting constants for authentication attempts
const MAX_AUTH_ATTEMPTS = 10 // Increased from 5 for better UX
const AUTH_ATTEMPT_WINDOW = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_DURATION = 15 * 60 * 1000 // Reduced from 30 to 15 minutes

export const rateLimitAuth = async (identifier: string): Promise<void> => {
  // Skip rate limiting in development environment
  if (process.env.NODE_ENV === 'development') {
    return
  }

  const now = new Date()
  const attempts = await RateLimitStore.get(identifier)

  if (!attempts) {
    await RateLimitStore.set(
      identifier,
      { count: 1, lastAttempt: now },
      Math.ceil(AUTH_ATTEMPT_WINDOW / 1000)
    )
    return
  }

  // Reset if window has passed
  if (now.getTime() - attempts.lastAttempt.getTime() > AUTH_ATTEMPT_WINDOW) {
    await RateLimitStore.set(
      identifier,
      { count: 1, lastAttempt: now },
      Math.ceil(AUTH_ATTEMPT_WINDOW / 1000)
    )
    return
  }

  // Check if locked out
  if (attempts.count >= MAX_AUTH_ATTEMPTS) {
    const lockoutEnd = new Date(attempts.lastAttempt.getTime() + LOCKOUT_DURATION)
    if (now < lockoutEnd) {
      const remainingMinutes = Math.ceil((lockoutEnd.getTime() - now.getTime()) / (60 * 1000))
      throw new UnauthorizedError(
        `Too many failed attempts. Try again in ${remainingMinutes} minutes.`
      )
    } else {
      // Lockout period ended, reset
      await RateLimitStore.set(
        identifier,
        { count: 1, lastAttempt: now },
        Math.ceil(AUTH_ATTEMPT_WINDOW / 1000)
      )
      return
    }
  }

  // Increment attempts
  const newCount = attempts.count + 1
  await RateLimitStore.set(
    identifier,
    { count: newCount, lastAttempt: now },
    Math.ceil(AUTH_ATTEMPT_WINDOW / 1000)
  )

  if (newCount >= MAX_AUTH_ATTEMPTS) {
    throw new UnauthorizedError(
      `Too many failed attempts. Account locked for ${LOCKOUT_DURATION / 60000} minutes.`
    )
  }
}

export const clearAuthAttempts = async (identifier: string): Promise<void> => {
  await RateLimitStore.remove(identifier)
}

// Rate limiting middleware wrapper
export const rateLimitAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const identifier = req.body?.email || req.ip || 'unknown'
    await rateLimitAuth(identifier)
    next()
  } catch (error) {
    next(error)
  }
}

// CSRF Token utilities
export const generateCSRFToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
  const expirationSeconds = 60 * 60 // 1 hour in seconds

  await CSRFTokenStore.set(token, { userId, expiresAt }, expirationSeconds)
  return token
}

export const verifyCSRFToken = async (token: string, userId: string): Promise<boolean> => {
  const storedData = await CSRFTokenStore.get(token)

  if (!storedData) {
    return false
  }

  if (storedData.userId !== userId) {
    return false
  }

  if (storedData.expiresAt < new Date()) {
    await CSRFTokenStore.remove(token)
    return false
  }

  return true
}

export const revokeCSRFToken = async (token: string): Promise<void> => {
  await CSRFTokenStore.remove(token)
}

export const revokeAllUserCSRFTokens = async (userId: string): Promise<void> => {
  await CSRFTokenStore.removeAllForUser(userId)
}

// Security headers middleware with strict CSP
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Content Security Policy - Stricter in production
  const cspPolicy =
    process.env.NODE_ENV === 'production'
      ? "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self'; " +
        "connect-src 'self' wss:; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'"
      : "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' https:; " +
        "connect-src 'self' ws: wss: https:; " +
        "frame-ancestors 'none'"

  res.setHeader('Content-Security-Policy', cspPolicy)

  // Additional security headers
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  next()
}

// Clean up expired tokens and rate limit entries periodically
setInterval(
  () => {
    // Clean up expired CSRF tokens (Redis-based cleanup)
    CSRFTokenStore.cleanupExpired().catch(error => {
      console.error('Failed to cleanup expired CSRF tokens:', error)
    })

    // Clean up expired rate limit entries (Redis-based cleanup)
    RateLimitStore.cleanupExpired(AUTH_ATTEMPT_WINDOW).catch(error => {
      console.error('Failed to cleanup expired rate limit entries:', error)
    })
  },
  60 * 60 * 1000
) // Run every hour

export default {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  hashPassword,
  comparePassword,
  validatePassword,
  validateEmail,
  requireAuth,
  optionalAuth,
  requireRole,
  rateLimitAuth,
  clearAuthAttempts,
  securityHeaders,
}
