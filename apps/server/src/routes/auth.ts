import { Router, type IRouter, Request, Response } from 'express'
import { AuthController } from '../controllers/AuthController'
import { requireAuth, requireCSRF, AuthenticatedRequest } from '../middleware/auth'
import { getService } from '../infrastructure/di/container'
import { TYPES } from '../infrastructure/di/types'
import { requireAdmin } from '../middleware/authorization'
import { validateRequest, asyncHandler } from '../middleware/errorHandling'
import { ValidationError } from '../middleware/errorHandling'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { UserRepository } from '../infrastructure/repositories'
import {
  securityLogger,
  SecurityEventType,
  SecuritySeverity,
} from '../infrastructure/services/securityLogger'

const router: IRouter = Router()

// Clean Architecture 実装 - InversifyJS DI コンテナを使用
const authController = getService<AuthController>(TYPES.AuthController)

// Database integration for user management
const prisma = new PrismaClient()
const userRepository = new UserRepository(prisma)

// Validation schemas for user management
const updateUserStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
})

const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(['user', 'admin'], {
      errorMap: () => ({ message: 'Role must be either "user" or "admin"' }),
    }),
  }),
})

// Public routes
router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.post('/refresh', authController.refreshToken)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password', authController.resetPassword)
router.get('/csrf-token', requireAuth, authController.getCSRFToken)

// Protected routes
router.get('/me', requireAuth, authController.getCurrentUser)
router.put('/profile', requireAuth, requireCSRF, authController.updateProfile)
router.post('/change-password', requireAuth, requireCSRF, authController.changePassword)
router.delete('/account', requireAuth, requireCSRF, authController.deleteAccount)

// User management routes (admin only)
router.get(
  '/users',
  requireAuth,
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = '1', limit = '10', search, status, role } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    if (role && (role === 'user' || role === 'admin')) {
      where.role = role
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    const [users, totalCount] = await Promise.all([
      userRepository.findMany(where, {
        skip,
        take: limitNum,
        orderBy: [{ createdAt: 'desc' }],
      }),
      userRepository.count(where),
    ])

    const totalPages = Math.ceil(totalCount / limitNum)

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      },
    })
  })
)

// User stats endpoint (admin only)
router.get(
  '/stats',
  requireAuth,
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const [totalUsers, verifiedUsers, adminUsers, activeUsers] = await Promise.all([
      userRepository.count({}),
      userRepository.count({ isEmailVerified: true }),
      userRepository.count({ role: 'admin' }),
      userRepository.count({ isActive: true }),
    ])

    const stats = {
      totalUsers,
      verifiedUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
      adminUsers,
      regularUsers: totalUsers - adminUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
    }

    res.json({
      success: true,
      data: stats,
    })
  })
)

export default router
