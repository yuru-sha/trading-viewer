import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth, requireCSRF, AuthenticatedRequest } from '../middleware/auth'
import { validateRequest, asyncHandler } from '../middleware/errorHandling'
import { ValidationError } from '../middleware/errorHandling'
import { securityLogger, SecurityEventType, SecuritySeverity } from '../services/securityLogger'
import { requirePermission, requireAdmin, ResourceType, Action } from '../middleware/authorization'

// Database integration with Prisma
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Validation schemas
const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name must be less than 100 characters')
      .optional(),
    avatar: z.string().url('Invalid avatar URL').optional(),
  }),
})

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

// GET /api/auth/profile
router.get(
  '/profile',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
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

// PUT /api/auth/profile
router.put(
  '/profile',
  requireAuth,
  requireCSRF,
  validateRequest(updateProfileSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId
    const { name, avatar } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (avatar !== undefined) updateData.avatar = avatar

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('No valid fields to update')
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Log profile update
    securityLogger.log({
      type: SecurityEventType.PROFILE_UPDATED,
      severity: SecuritySeverity.INFO,
      message: 'User profile updated successfully',
      userId,
      metadata: {
        updatedFields: Object.keys(updateData),
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    })
  })
)

// GET /api/auth/users (admin only)
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
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.user.count({ where }),
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

// GET /api/auth/users/:userId (admin only)
router.get(
  '/users/:userId',
  requireAuth,
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
  validateRequest(updateUserStatusSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params
    const { isActive } = req.body
    const adminUserId = req.user!.userId

    // Prevent admin from deactivating themselves
    if (userId === adminUserId && !isActive) {
      throw new ValidationError('Cannot deactivate your own account')
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    // Log user status change
    securityLogger.log({
      type: SecurityEventType.USER_STATUS_CHANGED,
      severity: SecuritySeverity.WARNING,
      message: `User ${isActive ? 'activated' : 'deactivated'} by admin`,
      userId,
      metadata: {
        adminUserId,
        newStatus: isActive ? 'active' : 'inactive',
        targetUserEmail: user.email,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user,
    })
  })
)

// PUT /api/auth/users/:userId/role (admin only)
router.put(
  '/users/:userId/role',
  requireAuth,
  requireAdmin(),
  requireCSRF,
  validateRequest(updateUserRoleSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params
    const { role } = req.body
    const adminUserId = req.user!.userId

    // Prevent admin from changing their own role
    if (userId === adminUserId) {
      throw new ValidationError('Cannot change your own role')
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    // Log role change
    securityLogger.log({
      type: SecurityEventType.USER_ROLE_CHANGED,
      severity: SecuritySeverity.HIGH,
      message: `User role changed to ${role} by admin`,
      userId,
      metadata: {
        adminUserId,
        newRole: role,
        targetUserEmail: user.email,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: `User role changed to ${role} successfully`,
      data: user,
    })
  })
)

// DELETE /api/auth/users/:userId (admin only)
router.delete(
  '/users/:userId',
  requireAuth,
  requireAdmin(),
  requireCSRF,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params
    const adminUserId = req.user!.userId

    // Prevent admin from deleting themselves
    if (userId === adminUserId) {
      throw new ValidationError('Cannot delete your own account')
    }

    // Get user info before deletion for logging
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, role: true },
    })

    if (!user) {
      throw new ValidationError('User not found')
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    })

    // Log user deletion
    securityLogger.log({
      type: SecurityEventType.USER_DELETED,
      severity: SecuritySeverity.HIGH,
      message: 'User deleted by admin',
      userId,
      metadata: {
        adminUserId,
        deletedUserEmail: user.email,
        deletedUserRole: user.role,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: 'User deleted successfully',
    })
  })
)

export default router
