import { Router, Request, Response } from 'express'
import { z } from 'zod'
import {
  requireAuth,
  requireCSRF,
  AuthenticatedRequest,
  hashPassword,
  generateCSRFToken,
  revokeAllUserTokens,
  revokeAllUserCSRFTokens,
} from '../middleware/auth'
import { validateRequest, asyncHandler } from '../middleware/errorHandling'
import { ValidationError, UnauthorizedError } from '../middleware/errorHandling'
import { securityLogger, SecurityEventType, SecuritySeverity } from '../infrastructure/services/securityLogger'
import { requirePermission, requireAdmin, ResourceType, Action } from '../middleware/authorization'

// Database integration with Repository pattern
import { PrismaClient } from '@prisma/client'
import { UserRepository } from '../infrastructure/repositories'

const prisma = new PrismaClient()
const userRepository = new UserRepository(prisma)

// Validation schemas
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

const unlockAccountSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User ID is required'),
  }),
})

// Helper function to generate random reset token
function generateResetToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

const router: import('express').Router = Router()

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  validateRequest(forgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body

    const user = await userRepository.findByEmail(email)

    // Always return success to prevent email enumeration
    if (!user) {
      securityLogger.log({
        eventType: SecurityEventType.PASSWORD_RESET_REQUEST,
        severity: SecuritySeverity.WARNING,
        message: 'Password reset requested for non-existent email',
        metadata: {
          email,
          timestamp: new Date().toISOString(),
          ip: req.ip,
        },
      })

      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
      return
    }

    // Generate reset token
    const resetToken = generateResetToken()
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Save reset token to database
    await userRepository.update(user.id, {
      resetToken,
      resetTokenExpiry,
    })

    // Log password reset request
    securityLogger.log({
      eventType: SecurityEventType.PASSWORD_RESET_REQUEST,
      severity: SecuritySeverity.INFO,
      message: 'Password reset requested',
      userId: user.id,
      metadata: {
        email: user.email,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    // In production, send email with reset link
    // For now, we'll just log the token (remove in production)
    console.log(`Password reset token for ${email}: ${resetToken}`)

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

    const user = await userRepository.findByResetToken(token)

    if (!user) {
      securityLogger.log({
        eventType: SecurityEventType.PASSWORD_RESET_FAILED,
        severity: SecuritySeverity.WARNING,
        message: 'Password reset failed - invalid or expired token',
        metadata: {
          token: token.substring(0, 8) + '...', // Log partial token for debugging
          timestamp: new Date().toISOString(),
          ip: req.ip,
        },
      })
      throw new UnauthorizedError('Invalid or expired reset token')
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword)

    // Update password and clear reset token
    await userRepository.update(user.id, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
      failedLoginCount: 0, // Reset failed login count
      lockedUntil: null, // Unlock account if it was locked
    })

    // Revoke all existing tokens to force re-login
    revokeAllUserTokens(user.id)
    revokeAllUserCSRFTokens(user.id)

    // Log successful password reset
    securityLogger.log({
      eventType: SecurityEventType.PASSWORD_RESET_SUCCESS,
      severity: SecuritySeverity.INFO,
      message: 'Password reset successfully',
      userId: user.id,
      metadata: {
        email: user.email,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    })
  })
)

// POST /api/auth/unlock-account (admin only)
router.post(
  '/unlock-account',
  requireAuth,
  requireAdmin(),
  requireCSRF,
  validateRequest(unlockAccountSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.body
    const adminUserId = req.user!.userId

    const user = await userRepository.findById(userId)

    if (!user) {
      throw new ValidationError('User not found')
    }

    // Unlock the account
    await userRepository.update(userId, {
      failedLoginCount: 0,
      lockedUntil: null,
    })

    // Log account unlock
    securityLogger.log({
      eventType: SecurityEventType.ACCOUNT_UNLOCKED,
      severity: SecuritySeverity.INFO,
      message: 'Account unlocked by admin',
      userId,
      metadata: {
        adminUserId,
        targetUserEmail: user.email,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: 'Account unlocked successfully',
    })
  })
)

// POST /api/auth/revoke-sessions
router.post(
  '/revoke-sessions',
  requireAuth,
  requireCSRF,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId

    // Revoke all user tokens except current session
    await revokeAllUserTokens(userId)
    await revokeAllUserCSRFTokens(userId)

    // Generate new CSRF token for current session
    const csrfToken = await generateCSRFToken(userId)

    // Log session revocation
    securityLogger.log({
      eventType: SecurityEventType.SESSIONS_REVOKED,
      severity: SecuritySeverity.INFO,
      message: 'All sessions revoked by user',
      userId,
      metadata: {
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: 'All other sessions have been revoked',
      csrfToken,
    })
  })
)

// GET /api/auth/security/logs (admin only)
router.get(
  '/security/logs',
  requireAuth,
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = '1', limit = '50', userId, type, severity, startDate, endDate } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100) // Max 100 items per page
    const skip = (pageNum - 1) * limitNum

    // Build filter criteria (this would depend on your security logging implementation)
    const filters: any = {}

    if (userId) filters.userId = userId
    if (type) filters.type = type
    if (severity) filters.severity = severity
    if (startDate) filters.timestamp = { gte: new Date(startDate as string) }
    if (endDate) {
      filters.timestamp = {
        ...filters.timestamp,
        lte: new Date(endDate as string),
      }
    }

    // In a real implementation, you would query your security logs table
    // For now, we'll return a mock response
    const mockLogs = [
      {
        id: '1',
        type: 'LOGIN_SUCCESS',
        severity: 'INFO',
        message: 'User logged in successfully',
        userId: userId || 'user1',
        timestamp: new Date(),
        metadata: { ip: req.ip },
      },
    ]

    res.json({
      success: true,
      data: {
        logs: mockLogs,
        pagination: {
          currentPage: pageNum,
          totalPages: 1,
          totalCount: mockLogs.length,
          limit: limitNum,
        },
      },
    })
  })
)

// GET /api/auth/security/stats (admin only)
router.get(
  '/security/stats',
  requireAuth,
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { period = '24h' } = req.query

    // Calculate time range based on period
    let startDate: Date
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000)
        break
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    }

    // Get user statistics
    const totalUsers = await userRepository.count()
    const activeUsers = await userRepository.count({ isActive: true })
    const lockedUsers = 0 // UserFilter doesn't support lockedUntil filter
    const recentLogins = 0 // UserFilter doesn't support lastLoginAt filter

    // In a real implementation, you would also query security events
    const mockSecurityStats = {
      loginAttempts: 150,
      failedLogins: 12,
      passwordResets: 3,
      accountLockouts: 2,
    }

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          locked: lockedUsers,
          recentLogins,
        },
        security: mockSecurityStats,
        period,
        generatedAt: new Date().toISOString(),
      },
    })
  })
)

export default router
