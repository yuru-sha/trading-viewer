import { vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
  ExternalServiceError,
  globalErrorHandler,
  formatErrorForClient,
  classifyError,
  asyncHandler,
  wrapExternalServiceCall,
} from '../../middleware/errorHandling'

// Mock Express objects
const mockRequest = (overrides = {}): Partial<Request> => ({
  method: 'GET',
  path: '/test',
  headers: { 'x-request-id': 'test-request-id' },
  get: vi.fn().mockReturnValue('test-user-agent'),
  ip: '127.0.0.1',
  ...overrides,
})

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.set = vi.fn().mockReturnValue(res)
  return res
}

const mockNext = (): NextFunction => vi.fn()

describe('Error Handling Middleware', () => {
  let consoleSpy: vi.SpyInstance

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation()
    vi.spyOn(console, 'warn').mockImplementation()
    vi.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    vi.restoreAllMocks()
  })

  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { test: true })

      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.details).toEqual({ test: true })
      expect(error.isOperational).toBe(true)
      expect(error.name).toBe('AppError')
    })

    it('should default to status 500 and operational true', () => {
      const error = new AppError('Test error')

      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
    })
  })

  describe('ValidationError', () => {
    it('should create a ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input', { field: 'email' })

      expect(error.message).toBe('Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toEqual({ field: 'email' })
      expect(error.name).toBe('ValidationError')
    })
  })

  describe('NotFoundError', () => {
    it('should create a NotFoundError with default message', () => {
      const error = new NotFoundError()

      expect(error.message).toBe('Resource not found')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
    })

    it('should create a NotFoundError with custom resource', () => {
      const error = new NotFoundError('User')

      expect(error.message).toBe('User not found')
    })
  })

  describe('RateLimitError', () => {
    it('should create a RateLimitError with retry after', () => {
      const error = new RateLimitError('Too many requests', 60)

      expect(error.message).toBe('Too many requests')
      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_LIMIT')
      expect(error.details).toEqual({ retryAfter: 60 })
    })
  })

  describe('classifyError', () => {
    it('should classify ValidationError as low severity', () => {
      const error = new ValidationError('Invalid input')
      const classification = classifyError(error)

      expect(classification).toEqual({
        category: 'validation',
        severity: 'low',
      })
    })

    it('should classify ZodError as low severity', () => {
      const error = new ZodError([])
      const classification = classifyError(error)

      expect(classification).toEqual({
        category: 'validation',
        severity: 'low',
      })
    })

    it('should classify UnauthorizedError as medium severity', () => {
      const error = new UnauthorizedError()
      const classification = classifyError(error)

      expect(classification).toEqual({
        category: 'auth',
        severity: 'medium',
      })
    })

    it('should classify ExternalServiceError as high severity', () => {
      const error = new ExternalServiceError('TestService')
      const classification = classifyError(error)

      expect(classification).toEqual({
        category: 'external',
        severity: 'high',
      })
    })

    it('should classify unknown errors as critical severity', () => {
      const error = new Error('Unknown error')
      const classification = classifyError(error)

      expect(classification).toEqual({
        category: 'system',
        severity: 'critical',
      })
    })
  })

  describe('formatErrorForClient', () => {
    it('should format AppError for client', () => {
      const error = new ValidationError('Invalid input', { field: 'email' })
      const formatted = formatErrorForClient(error)

      expect(formatted.error).toMatchObject({
        message: 'Invalid input',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        timestamp: expect.any(String),
      })
    })

    it('should format ZodError for client', () => {
      const zodError = new ZodError([
        {
          path: ['email'],
          message: 'Invalid email format',
          code: 'invalid_string' as any,
        },
      ])

      const formatted = formatErrorForClient(zodError)

      expect(formatted.error).toMatchObject({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: [
          {
            path: 'email',
            message: 'Invalid email format',
            code: 'invalid_string',
          },
        ],
      })
    })

    it('should hide internal errors in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const error = new Error('Internal error')
      const formatted = formatErrorForClient(error)

      expect(formatted.error).toMatchObject({
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      })

      process.env.NODE_ENV = originalEnv
    })

    it('should expose error details in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Internal error')
      const formatted = formatErrorForClient(error)

      expect(formatted.error.message).toBe('Internal error')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('globalErrorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new ValidationError('Invalid input')
      const req = mockRequest() as Request
      const res = mockResponse() as Response
      const next = mockNext()

      globalErrorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Invalid input',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          requestId: 'test-request-id',
        }),
      })
    })

    it('should set Retry-After header for RateLimitError', () => {
      const error = new RateLimitError('Too many requests', 60)
      const req = mockRequest() as Request
      const res = mockResponse() as Response
      const next = mockNext()

      globalErrorHandler(error, req, res, next)

      expect(res.set).toHaveBeenCalledWith('Retry-After', '60')
      expect(res.status).toHaveBeenCalledWith(429)
    })

    it('should log high severity errors', () => {
      const error = new ExternalServiceError('TestService')
      const req = mockRequest() as Request
      const res = mockResponse() as Response
      const next = mockNext()

      globalErrorHandler(error, req, res, next)

      expect(consoleSpy).toHaveBeenCalledWith(
        'High severity error:',
        expect.objectContaining({
          error: expect.objectContaining({
            name: 'ExternalServiceError',
            message: expect.stringContaining('TestService'),
          }),
        })
      )
    })
  })

  describe('asyncHandler', () => {
    it('should handle successful async functions', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const wrapped = asyncHandler(mockFn)
      const req = mockRequest() as Request
      const res = mockResponse() as Response
      const next = mockNext()

      await wrapped(req, res, next)

      expect(mockFn).toHaveBeenCalledWith(req, res, next)
      expect(next).not.toHaveBeenCalled()
    })

    it('should catch and forward async errors', async () => {
      const error = new Error('Async error')
      const mockFn = vi.fn().mockRejectedValue(error)
      const wrapped = asyncHandler(mockFn)
      const req = mockRequest() as Request
      const res = mockResponse() as Response
      const next = mockNext()

      await wrapped(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('wrapExternalServiceCall', () => {
    it('should return successful results', async () => {
      const serviceCall = vi.fn().mockResolvedValue('success')

      const result = await wrapExternalServiceCall('TestService', serviceCall)

      expect(result).toBe('success')
      expect(serviceCall).toHaveBeenCalled()
    })

    it('should wrap external service errors', async () => {
      const originalError = new Error('Service unavailable')
      const serviceCall = vi.fn().mockRejectedValue(originalError)

      await expect(wrapExternalServiceCall('TestService', serviceCall)).rejects.toThrow(
        ExternalServiceError
      )

      await expect(wrapExternalServiceCall('TestService', serviceCall)).rejects.toThrow(
        'External service error: TestService'
      )
    })

    it('should log external service errors', async () => {
      const originalError = new Error('Service unavailable')
      const serviceCall = vi.fn().mockRejectedValue(originalError)

      try {
        await wrapExternalServiceCall('TestService', serviceCall)
      } catch (error) {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'External service error (TestService):',
        originalError
      )
    })
  })

  describe('Error inheritance', () => {
    it('should maintain proper error inheritance', () => {
      const validationError = new ValidationError('Test')
      const notFoundError = new NotFoundError()
      const unauthorizedError = new UnauthorizedError()

      expect(validationError instanceof Error).toBe(true)
      expect(validationError instanceof AppError).toBe(true)
      expect(validationError instanceof ValidationError).toBe(true)

      expect(notFoundError instanceof Error).toBe(true)
      expect(notFoundError instanceof AppError).toBe(true)
      expect(notFoundError instanceof NotFoundError).toBe(true)

      expect(unauthorizedError instanceof Error).toBe(true)
      expect(unauthorizedError instanceof AppError).toBe(true)
      expect(unauthorizedError instanceof UnauthorizedError).toBe(true)
    })
  })
})
