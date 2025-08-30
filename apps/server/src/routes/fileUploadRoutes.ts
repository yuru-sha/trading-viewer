import { Router, Request, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { requireAuth, requireCSRF, AuthenticatedRequest, hashPassword } from '../middleware/auth'
import { validateRequest, asyncHandler } from '../middleware/errorHandling'
import { ValidationError } from '../middleware/errorHandling'
import {
  securityLogger,
  SecurityEventType,
  SecuritySeverity,
} from '../infrastructure/services/securityLogger'
import { requireAdmin } from '../middleware/authorization'

// Database integration with Repository pattern
import { PrismaClient } from '@prisma/client'
import { UserRepository } from '../infrastructure/repositories'

const prisma = new PrismaClient()
const userRepository = new UserRepository(prisma)

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

// Helper function to generate user ID
function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

// User import validation schema
interface ImportUser {
  email: string
  password?: string
  name?: string
  role?: 'user' | 'admin'
  isActive?: boolean
}

const router: import('express').Router = Router()

// POST /api/auth/users/import (admin only)
router.post(
  '/users/import',
  requireAuth,
  requireAdmin(),
  requireCSRF,
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminUserId = req.user!.userId

    if (!req.file) {
      throw new ValidationError('No file uploaded')
    }

    let userData: ImportUser[]
    try {
      const fileContent = req.file.buffer.toString('utf8')
      userData = JSON.parse(fileContent)
    } catch (error) {
      throw new ValidationError('Invalid JSON file format')
    }

    if (!Array.isArray(userData)) {
      throw new ValidationError('JSON file must contain an array of users')
    }

    if (userData.length === 0) {
      throw new ValidationError('No users found in the file')
    }

    if (userData.length > 1000) {
      throw new ValidationError('Cannot import more than 1000 users at once')
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ email: string; error: string }>,
    }

    // Process each user
    for (const [index, user] of userData.entries()) {
      try {
        // Validate required fields
        if (!user.email || typeof user.email !== 'string') {
          results.errors.push({
            email: user.email || `User at index ${index}`,
            error: 'Email is required and must be a string',
          })
          continue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(user.email)) {
          results.errors.push({
            email: user.email,
            error: 'Invalid email format',
          })
          continue
        }

        // Check if user already exists
        const existingUser = await userRepository.findByEmail(user.email.toLowerCase())

        if (existingUser) {
          results.skipped++
          continue
        }

        // Set default values
        const userData = {
          email: user.email.toLowerCase(),
          name: user.name || null,
          role: user.role === 'admin' ? 'admin' : 'user',
          isActive: user.isActive !== false, // Default to true
          isEmailVerified: false,
          failedLoginCount: 0,
        }

        // Generate password if not provided
        let passwordHash: string
        if (user.password && typeof user.password === 'string') {
          // Validate password strength
          if (user.password.length < 8) {
            results.errors.push({
              email: user.email,
              error: 'Password must be at least 8 characters long',
            })
            continue
          }
          passwordHash = await hashPassword(user.password)
        } else {
          // Generate random password
          const randomPassword =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
          passwordHash = await hashPassword(randomPassword)
        }

        // Create user
        await userRepository.create({
          ...userData,
          passwordHash,
        })

        results.imported++
      } catch (error) {
        results.errors.push({
          email: user.email || `User at index ${index}`,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Log import operation
    securityLogger.log({
      eventType: SecurityEventType.BULK_USER_IMPORT,
      severity: SecuritySeverity.INFO,
      message: 'Bulk user import completed',
      userId: adminUserId,
      metadata: {
        totalAttempted: userData.length,
        imported: results.imported,
        skipped: results.skipped,
        errors: results.errors.length,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: `Import completed. ${results.imported} users imported, ${results.skipped} skipped`,
      data: results,
    })
  })
)

// GET /api/auth/users/export (admin only)
router.get(
  '/users/export',
  requireAuth,
  requireAdmin(),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminUserId = req.user!.userId
    const { format = 'json', includeInactive = 'false' } = req.query

    // Build filter
    const filter: any = {}
    if (includeInactive === 'false') {
      filter.isActive = true
    }

    // Get users
    const users = await userRepository.findMany(filter, {
      orderBy: [{ createdAt: 'desc' }],
    })

    // Log export operation
    securityLogger.log({
      eventType: SecurityEventType.USER_DATA_EXPORT,
      severity: SecuritySeverity.WARNING,
      message: 'User data exported by admin',
      userId: adminUserId,
      metadata: {
        totalUsers: users.length,
        format,
        includeInactive: includeInactive === 'true',
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader =
        'ID,Email,Name,Role,Active,Email Verified,Last Login,Created At,Updated At\n'
      const csvRows = users
        .map(user => {
          return [
            user.id,
            user.email,
            user.name || '',
            user.role,
            user.isActive,
            user.isEmailVerified,
            user.lastLoginAt?.toISOString() || '',
            user.createdAt.toISOString(),
            user.updatedAt.toISOString(),
          ].join(',')
        })
        .join('\n')

      const csvContent = csvHeader + csvRows

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`
      )
      res.send(csvContent)
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.json"`
      )
      res.json({
        exportedAt: new Date().toISOString(),
        totalUsers: users.length,
        users,
      })
    }
  })
)

// POST /api/auth/users/bulk-action (admin only)
router.post(
  '/users/bulk-action',
  requireAuth,
  requireAdmin(),
  requireCSRF,
  validateRequest(
    z.object({
      body: z.object({
        action: z.enum(['activate', 'deactivate', 'delete']),
        userIds: z
          .array(z.string())
          .min(1, 'At least one user ID is required')
          .max(100, 'Cannot process more than 100 users at once'),
      }),
    })
  ),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { action, userIds } = req.body
    const adminUserId = req.user!.userId

    // Prevent admin from affecting themselves
    if (userIds.includes(adminUserId)) {
      throw new ValidationError('Cannot perform bulk actions on your own account')
    }

    const results = {
      processed: 0,
      skipped: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    }

    for (const userId of userIds) {
      try {
        const user = await userRepository.findById(userId)

        if (!user) {
          results.errors.push({
            userId,
            error: 'User not found',
          })
          continue
        }

        switch (action) {
          case 'activate':
            if (user.isActive) {
              results.skipped++
            } else {
              await userRepository.update(userId, { isActive: true })
              results.processed++
            }
            break

          case 'deactivate':
            if (!user.isActive) {
              results.skipped++
            } else {
              await userRepository.update(userId, { isActive: false })
              results.processed++
            }
            break

          case 'delete':
            await userRepository.delete(userId)
            results.processed++
            break
        }
      } catch (error) {
        results.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Log bulk action
    securityLogger.log({
      eventType: SecurityEventType.BULK_USER_ACTION,
      severity: SecuritySeverity.WARNING,
      message: `Bulk ${action} action performed by admin`,
      userId: adminUserId,
      metadata: {
        action,
        totalUsers: userIds.length,
        processed: results.processed,
        skipped: results.skipped,
        errors: results.errors.length,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      },
    })

    res.json({
      success: true,
      message: `Bulk ${action} completed. ${results.processed} users processed, ${results.skipped} skipped`,
      data: results,
    })
  })
)

export default router
