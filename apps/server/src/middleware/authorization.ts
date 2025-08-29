import { Request, Response, NextFunction } from 'express'
import { AuthenticatedRequest } from './auth'
import { ForbiddenError, UnauthorizedError } from './errorHandling'
import { securityLogger, SecurityEventType, SecuritySeverity } from '../infrastructure/services/securityLogger'

// Resource types in the system
export enum ResourceType {
  USER_PROFILE = 'user_profile',
  USER_SETTINGS = 'user_settings',
  USER_DATA = 'user_data',
  MARKET_DATA = 'market_data',
  WATCHLIST = 'watchlist',
  ADMIN_PANEL = 'admin_panel',
  SYSTEM_STATS = 'system_stats',
  SECURITY_LOGS = 'security_logs',
}

// Actions that can be performed on resources
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  ADMIN = 'admin',
}

// Permission levels
export enum Permission {
  NONE = 'none',
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  OWNER = 'owner',
}

// Role-based permissions matrix
const ROLE_PERMISSIONS: Record<string, Record<ResourceType, Permission[]>> = {
  user: {
    [ResourceType.USER_PROFILE]: [Permission.READ, Permission.WRITE],
    [ResourceType.USER_SETTINGS]: [Permission.READ, Permission.WRITE],
    [ResourceType.USER_DATA]: [Permission.READ, Permission.WRITE],
    [ResourceType.MARKET_DATA]: [Permission.READ],
    [ResourceType.WATCHLIST]: [Permission.READ, Permission.WRITE],
    [ResourceType.ADMIN_PANEL]: [Permission.NONE],
    [ResourceType.SYSTEM_STATS]: [Permission.NONE],
    [ResourceType.SECURITY_LOGS]: [Permission.NONE],
  },
  admin: {
    [ResourceType.USER_PROFILE]: [Permission.READ, Permission.WRITE, Permission.ADMIN],
    [ResourceType.USER_SETTINGS]: [Permission.READ, Permission.WRITE, Permission.ADMIN],
    [ResourceType.USER_DATA]: [Permission.READ, Permission.WRITE, Permission.ADMIN],
    [ResourceType.MARKET_DATA]: [Permission.READ, Permission.WRITE, Permission.ADMIN],
    [ResourceType.WATCHLIST]: [Permission.READ, Permission.WRITE, Permission.ADMIN],
    [ResourceType.ADMIN_PANEL]: [Permission.READ, Permission.WRITE, Permission.ADMIN],
    [ResourceType.SYSTEM_STATS]: [Permission.READ, Permission.ADMIN],
    [ResourceType.SECURITY_LOGS]: [Permission.READ, Permission.ADMIN],
  },
}

// Action to permission mapping
const ACTION_PERMISSION_MAP: Record<Action, Permission> = {
  [Action.CREATE]: Permission.WRITE,
  [Action.READ]: Permission.READ,
  [Action.UPDATE]: Permission.WRITE,
  [Action.DELETE]: Permission.WRITE,
  [Action.LIST]: Permission.READ,
  [Action.ADMIN]: Permission.ADMIN,
}

// Resource ownership checker interface
export interface ResourceOwnershipChecker {
  checkOwnership(userId: string, resourceId: string): Promise<boolean>
}

// Default ownership checkers for different resource types
const DEFAULT_OWNERSHIP_CHECKERS: Partial<Record<ResourceType, ResourceOwnershipChecker>> = {
  [ResourceType.USER_PROFILE]: {
    async checkOwnership(userId: string, resourceId: string): Promise<boolean> {
      // User owns their own profile
      return userId === resourceId
    },
  },
  [ResourceType.USER_SETTINGS]: {
    async checkOwnership(userId: string, resourceId: string): Promise<boolean> {
      // User owns their own settings
      return userId === resourceId
    },
  },
  [ResourceType.USER_DATA]: {
    async checkOwnership(userId: string, resourceId: string): Promise<boolean> {
      // User owns their own data
      return userId === resourceId
    },
  },
  [ResourceType.WATCHLIST]: {
    async checkOwnership(userId: string, resourceId: string): Promise<boolean> {
      // In production, check database for watchlist ownership
      // For now, assume user owns watchlist if resourceId matches userId
      return userId === resourceId
    },
  },
}

// Authorization service
export class AuthorizationService {
  private ownershipCheckers: Map<ResourceType, ResourceOwnershipChecker> = new Map()

  constructor() {
    // Register default ownership checkers
    for (const [resourceType, checker] of Object.entries(DEFAULT_OWNERSHIP_CHECKERS)) {
      if (checker) {
        this.ownershipCheckers.set(resourceType as ResourceType, checker)
      }
    }
  }

  // Register custom ownership checker
  registerOwnershipChecker(resourceType: ResourceType, checker: ResourceOwnershipChecker): void {
    this.ownershipCheckers.set(resourceType, checker)
  }

  // Check if user has permission for action on resource type
  hasPermission(userRole: string, resourceType: ResourceType, action: Action): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole]
    if (!rolePermissions) {
      return false
    }

    const resourcePermissions = rolePermissions[resourceType]
    if (!resourcePermissions) {
      return false
    }

    const requiredPermission = ACTION_PERMISSION_MAP[action]
    return resourcePermissions.includes(requiredPermission)
  }

  // Check resource ownership
  async checkOwnership(
    resourceType: ResourceType,
    userId: string,
    resourceId: string
  ): Promise<boolean> {
    const checker = this.ownershipCheckers.get(resourceType)
    if (!checker) {
      // If no ownership checker, assume resource is not owned
      return false
    }

    try {
      return await checker.checkOwnership(userId, resourceId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown ownership check error'
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.WARNING,
        message: 'Ownership check failed',
        metadata: { resourceType, userId, resourceId, error: errorMessage },
      })
      return false
    }
  }

  // Comprehensive authorization check
  async authorize(
    userRole: string,
    userId: string,
    resourceType: ResourceType,
    action: Action,
    resourceId?: string
  ): Promise<{ authorized: boolean; reason?: string }> {
    // Check role-based permissions
    if (!this.hasPermission(userRole, resourceType, action)) {
      return {
        authorized: false,
        reason: `Role '${userRole}' does not have '${action}' permission on '${resourceType}'`,
      }
    }

    // Check resource ownership for non-admin users
    if (userRole !== 'admin' && resourceId) {
      const isOwner = await this.checkOwnership(resourceType, userId, resourceId)
      if (!isOwner) {
        return {
          authorized: false,
          reason: `User does not own resource '${resourceId}' of type '${resourceType}'`,
        }
      }
    }

    return { authorized: true }
  }
}

// Global authorization service instance
export const authorizationService = new AuthorizationService()

// Middleware factory for resource authorization
export const requirePermission = (
  resourceType: ResourceType,
  action: Action,
  getResourceId?: (req: AuthenticatedRequest) => string | undefined
) => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required')
      }

      const { userId, role, email } = req.user
      const resourceId = getResourceId ? getResourceId(req) : undefined

      const authResult = await authorizationService.authorize(
        role,
        userId,
        resourceType,
        action,
        resourceId
      )

      if (!authResult.authorized) {
        // Log authorization failure
        securityLogger.logRequest(
          req,
          SecurityEventType.FORBIDDEN_ACCESS,
          `Access denied: ${authResult.reason}`,
          SecuritySeverity.HIGH,
          {
            userId,
            email,
            role,
            resourceType,
            action,
            resourceId,
            reason: authResult.reason,
          }
        )

        throw new ForbiddenError(authResult.reason || 'Access denied')
      }

      // Log successful authorization for sensitive resources
      if (
        [ResourceType.ADMIN_PANEL, ResourceType.SYSTEM_STATS, ResourceType.SECURITY_LOGS].includes(
          resourceType
        )
      ) {
        securityLogger.logRequest(
          req,
          SecurityEventType.PRIVILEGE_ESCALATION,
          `Authorized access to sensitive resource: ${resourceType}`,
          SecuritySeverity.INFO,
          {
            userId,
            email,
            role,
            resourceType,
            action,
            resourceId,
          }
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

// Specific permission middleware for common use cases
export const requireOwnership = (
  resourceType: ResourceType,
  getResourceId: (req: AuthenticatedRequest) => string
) => {
  return requirePermission(resourceType, Action.READ, getResourceId)
}

export const requireAdmin = () => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required')
      }

      if (req.user.role !== 'admin') {
        securityLogger.logRequest(
          req,
          SecurityEventType.FORBIDDEN_ACCESS,
          'Non-admin attempted to access admin-only resource',
          SecuritySeverity.HIGH,
          {
            userId: req.user.userId,
            email: req.user.email,
            role: req.user.role,
          }
        )

        throw new ForbiddenError('Administrator privileges required')
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

// Path traversal protection middleware
export const preventPathTraversal = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const suspiciousPatterns = [
      '../',
      '..\\',
      '%2e%2e%2f',
      '%2e%2e%5c',
      '..%2f',
      '..%5c',
      '%252e%252e%252f',
      '%252e%252e%255c',
    ]

    const checkString = (str: string): boolean => {
      const lowerStr = str.toLowerCase()
      return suspiciousPatterns.some(pattern => lowerStr.includes(pattern))
    }

    // Check URL path
    if (checkString(req.path)) {
      securityLogger.logRequest(
        req as AuthenticatedRequest,
        SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
        `Path traversal attempt detected: ${req.path}`,
        SecuritySeverity.CRITICAL,
        { path: req.path }
      )

      res.status(400).json({
        success: false,
        message: 'Invalid path format',
      })
      return
    }

    // Check query parameters
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string' && checkString(value)) {
        securityLogger.logRequest(
          req as AuthenticatedRequest,
          SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
          `Path traversal attempt in query parameter: ${key}=${value}`,
          SecuritySeverity.CRITICAL,
          { queryParam: key, value }
        )

        res.status(400).json({
          success: false,
          message: 'Invalid query parameter format',
        })
        return
      }
    }

    next()
  }
}

// CORS validation middleware
export const validateCorsOrigin = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000']

    if (origin && !allowedOrigins.includes(origin)) {
      securityLogger.logRequest(
        req as AuthenticatedRequest,
        SecurityEventType.CORS_VIOLATION,
        `CORS violation: unauthorized origin ${origin}`,
        SecuritySeverity.HIGH,
        { origin, allowedOrigins }
      )

      res.status(403).json({
        success: false,
        message: 'CORS policy violation',
      })
      return
    }

    next()
  }
}

export default {
  authorizationService,
  requirePermission,
  requireOwnership,
  requireAdmin,
  preventPathTraversal,
  validateCorsOrigin,
  ResourceType,
  Action,
  Permission,
}
