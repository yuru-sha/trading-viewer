import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { log } from '../infrastructure/services/logger'
import { getService } from '../infrastructure/di/container'
import { TYPES } from '../infrastructure/di/types'
import type { IUserRepository } from '../domain/repositories/IUserRepository'

export interface AuthenticatedRequest extends Request {
  user: {
    id: string
    email: string
    role: string
  }
}

export class AuthMiddleware {
  private userRepository: IUserRepository
  private readonly JWT_SECRET: string

  constructor() {
    this.userRepository = getService<IUserRepository>(TYPES.UserRepository)
    this.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
  }

  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        res.status(401).json({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token is required',
        })
        return
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader

      if (!token) {
        res.status(401).json({
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Invalid token format',
        })
        return
      }

      // Verify JWT token
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        userId: string
        email: string
        role: string
        iat: number
        exp: number
      }

      // Check if user still exists and is active
      const user = await this.userRepository.findById(decoded.userId)
      if (!user || !user.isActive) {
        res.status(401).json({
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive',
        })
        return
      }

      // Attach user to request
      ;(req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        role: user.role,
      }

      next()
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        log.auth.warn('Invalid JWT token', { error: error.message })
        res.status(401).json({
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
        })
        return
      }

      if (error instanceof jwt.TokenExpiredError) {
        log.auth.warn('JWT token expired')
        res.status(401).json({
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
        })
        return
      }

      log.auth.error('Authentication middleware error', error)
      res.status(500).json({
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
      })
    }
  }

  requireRole = (roles: string | string[]) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles]

    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as AuthenticatedRequest).user

      if (!user) {
        res.status(401).json({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        })
        return
      }

      if (!allowedRoles.includes(user.role)) {
        log.auth.warn('Insufficient permissions', {
          userId: user.id,
          userRole: user.role,
          requiredRoles: allowedRoles,
        })

        res.status(403).json({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions',
        })
        return
      }

      next()
    }
  }

  requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as AuthenticatedRequest).user

      if (!user) {
        res.status(401).json({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        })
        return
      }

      // Define role-based permissions
      const rolePermissions = {
        ADMIN: [
          'user:read',
          'user:write',
          'user:delete',
          'system:admin',
          'analytics:read',
          'settings:write',
        ],
        USER: [
          'profile:read',
          'profile:write',
          'watchlist:read',
          'watchlist:write',
          'alerts:read',
          'alerts:write',
          'charts:read',
          'charts:write',
          'drawings:read',
          'drawings:write',
        ],
      }

      const userPermissions = rolePermissions[user.role as keyof typeof rolePermissions] || []

      if (!userPermissions.includes(permission)) {
        log.auth.warn('Permission denied', {
          userId: user.id,
          userRole: user.role,
          requiredPermission: permission,
        })

        res.status(403).json({
          code: 'PERMISSION_DENIED',
          message: `Permission '${permission}' required`,
        })
        return
      }

      next()
    }
  }

  optional = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        next()
        return
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader

      if (!token) {
        next()
        return
      }

      // Verify JWT token
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        userId: string
        email: string
        role: string
      }

      // Check if user still exists and is active
      const user = await this.userRepository.findById(decoded.userId)
      if (user && user.isActive) {
        ;(req as AuthenticatedRequest).user = {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      }

      next()
    } catch (error) {
      // For optional authentication, we don't return errors
      // Just continue without setting user
      next()
    }
  }

  rateLimitByUser = (maxRequests: number, windowMs: number) => {
    const requestCounts = new Map<string, { count: number; resetTime: number }>()

    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as AuthenticatedRequest).user
      const identifier = user?.id || req.ip || 'anonymous'
      const now = Date.now()

      const userLimit = requestCounts.get(identifier)

      if (!userLimit || now > userLimit.resetTime) {
        requestCounts.set(identifier, {
          count: 1,
          resetTime: now + windowMs,
        })
        next()
        return
      }

      if (userLimit.count >= maxRequests) {
        log.auth.warn('Rate limit exceeded', {
          identifier,
          count: userLimit.count,
          maxRequests,
        })

        res.status(429).json({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
        })
        return
      }

      userLimit.count++
      next()
    }
  }
}

// Create singleton instance
export const authMiddleware = new AuthMiddleware()

// Export individual middleware functions for convenience
export const authenticate = authMiddleware.authenticate
export const requireRole = authMiddleware.requireRole
export const requirePermission = authMiddleware.requirePermission
export const optionalAuth = authMiddleware.optional
export const rateLimitByUser = authMiddleware.rateLimitByUser
