import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export interface ApiError extends Error {
  statusCode: number
  code?: string
  details?: any
  isOperational?: boolean
}

export class AppError extends Error implements ApiError {
  public statusCode: number
  public code?: string
  public details?: any
  public isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT', { retryAfter })
    this.name = 'RateLimitError'
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(`External service error: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalError: originalError?.message,
    })
    this.name = 'ExternalServiceError'
  }
}

// Error type guards
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError || error?.isOperational === true
}

export const isZodError = (error: any): error is ZodError => {
  return error instanceof ZodError
}

// Error classification
export const classifyError = (
  error: any
): { category: string; severity: 'low' | 'medium' | 'high' | 'critical' } => {
  if (error instanceof ValidationError || error instanceof ZodError) {
    return { category: 'validation', severity: 'low' }
  }

  if (error instanceof NotFoundError) {
    return { category: 'client', severity: 'low' }
  }

  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return { category: 'auth', severity: 'medium' }
  }

  if (error instanceof RateLimitError) {
    return { category: 'rate_limit', severity: 'medium' }
  }

  if (error instanceof ExternalServiceError) {
    return { category: 'external', severity: 'high' }
  }

  if (isAppError(error)) {
    return { category: 'application', severity: 'medium' }
  }

  return { category: 'system', severity: 'critical' }
}

// Format error for client response
export const formatErrorForClient = (
  error: ApiError | Error
): {
  error: {
    message: string
    code?: string
    details?: any
    statusCode: number
    timestamp: string
    requestId?: string
  }
} => {
  const isProduction = process.env.NODE_ENV === 'production'

  if (isAppError(error)) {
    return {
      error: {
        message: error.message,
        code: error.code,
        details: isProduction ? undefined : error.details,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
      },
    }
  }

  if (isZodError(error)) {
    const details = error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }))

    return {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: details,
        statusCode: 400,
        timestamp: new Date().toISOString(),
      },
    }
  }

  // Don't expose internal errors in production
  if (isProduction) {
    return {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      },
    }
  }

  return {
    error: {
      message: error.message || 'Unknown error',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    },
  }
}

// Global error handler middleware
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { category, severity } = classifyError(error)
  const requestId = req.headers['x-request-id'] as string

  // Log error with context
  const errorContext = {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    category,
    severity,
    timestamp: new Date().toISOString(),
  }

  if (severity === 'critical' || severity === 'high') {
    console.error('High severity error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: errorContext,
    })
  } else if (severity === 'medium') {
    console.warn('Medium severity error:', {
      error: {
        name: error.name,
        message: error.message,
      },
      context: errorContext,
    })
  } else {
    console.log('Low severity error:', {
      error: {
        name: error.name,
        message: error.message,
      },
      context: errorContext,
    })
  }

  // Format response
  const formattedError = formatErrorForClient(error)
  formattedError.error.requestId = requestId

  const statusCode = isAppError(error) ? error.statusCode : 500

  // Add retry-after header for rate limit errors
  if (error instanceof RateLimitError && error.details?.retryAfter) {
    res.set('Retry-After', error.details.retryAfter.toString())
  }

  res.status(statusCode).json(formattedError)
}

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`)
  next(error)
}

// Request validation middleware
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body)
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query)
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params)
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}

// Rate limiting error helper
export const createRateLimitError = (windowMs: number): RateLimitError => {
  const retryAfter = Math.ceil(windowMs / 1000)
  return new RateLimitError(`Too many requests. Try again in ${retryAfter} seconds.`, retryAfter)
}

// External service error wrapper
export const wrapExternalServiceCall = async <T>(
  serviceName: string,
  serviceCall: () => Promise<T>
): Promise<T> => {
  try {
    return await serviceCall()
  } catch (error) {
    console.error(`External service error (${serviceName}):`, error)
    throw new ExternalServiceError(serviceName, error as Error)
  }
}

// Health check error
export class HealthCheckError extends AppError {
  constructor(service: string, details?: any) {
    super(`Health check failed for ${service}`, 503, 'HEALTH_CHECK_FAILED', details)
    this.name = 'HealthCheckError'
  }
}
