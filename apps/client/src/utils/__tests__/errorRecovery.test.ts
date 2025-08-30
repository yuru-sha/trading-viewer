import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  classifyError,
  createRecoveryStrategies,
  ErrorRecoveryManager,
  createErrorReport,
  reportError,
  errorRecoveryManager
} from '../errorRecovery'

// Mock window location and other browser APIs
const mockLocation = {
  reload: vi.fn(),
  href: '/'
}

const mockNavigator = {
  userAgent: 'test-user-agent'
}

const mockCaches = {
  keys: vi.fn().mockResolvedValue(['cache1', 'cache2']),
  delete: vi.fn().mockResolvedValue(true),
  // Add availability check
  has: vi.fn().mockResolvedValue(true)
}

const mockCrypto = {
  randomUUID: vi.fn().mockReturnValue('test-uuid-123')
}

const mockLocalStorage = {
  clear: vi.fn(),
  removeItem: vi.fn()
}

const mockSessionStorage = {
  clear: vi.fn(),
  removeItem: vi.fn()
}

// Setup globalThis for better compatibility
Object.defineProperty(globalThis, 'window', {
  value: {
    location: mockLocation,
    navigator: mockNavigator,
    caches: mockCaches,
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage
  },
  writable: true
})

// Mock global caches for the 'caches' in window check
Object.defineProperty(globalThis, 'caches', {
  value: mockCaches,
  writable: true
})

Object.defineProperty(globalThis, 'crypto', {
  value: mockCrypto,
  writable: true
})

// Also set on global for fallback
global.window = globalThis.window
global.caches = globalThis.caches
global.crypto = globalThis.crypto

describe('Error Recovery System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('classifyError', () => {
    it('should classify network errors correctly', () => {
      const networkError = { code: 'NETWORK_ERROR' }
      const result = classifyError(networkError)

      expect(result).toEqual({
        category: 'network',
        severity: 'medium',
        isRecoverable: true,
        retryable: true,
        userActionRequired: false
      })
    })

    it('should classify fetch errors correctly', () => {
      const fetchError = { message: 'Failed to fetch data from server' }
      const result = classifyError(fetchError)

      expect(result).toEqual({
        category: 'network',
        severity: 'medium',
        isRecoverable: true,
        retryable: true,
        userActionRequired: false
      })
    })

    it('should classify 401 authentication errors correctly', () => {
      const authError = { response: { status: 401 } }
      const result = classifyError(authError)

      expect(result).toEqual({
        category: 'authentication',
        severity: 'high',
        isRecoverable: true,
        retryable: false,
        userActionRequired: true
      })
    })

    it('should classify 403 CSRF errors as recoverable', () => {
      const csrfError = {
        response: {
          status: 403,
          data: { message: 'CSRF token validation failed' }
        }
      }
      const result = classifyError(csrfError)

      expect(result).toEqual({
        category: 'csrf',
        severity: 'medium',
        isRecoverable: true,
        retryable: true,
        userActionRequired: false
      })
    })

    it('should classify 403 authorization errors as non-recoverable', () => {
      const authzError = {
        response: {
          status: 403,
          data: { message: 'Insufficient permissions' }
        }
      }
      const result = classifyError(authzError)

      expect(result).toEqual({
        category: 'authorization',
        severity: 'high',
        isRecoverable: false,
        retryable: false,
        userActionRequired: true
      })
    })

    it('should classify validation errors correctly', () => {
      const validationError400 = { response: { status: 400 } }
      const validationError422 = { response: { status: 422 } }

      expect(classifyError(validationError400)).toEqual({
        category: 'validation',
        severity: 'low',
        isRecoverable: true,
        retryable: false,
        userActionRequired: true
      })

      expect(classifyError(validationError422)).toEqual({
        category: 'validation',
        severity: 'low',
        isRecoverable: true,
        retryable: false,
        userActionRequired: true
      })
    })

    it('should classify rate limit errors correctly', () => {
      const rateLimitError = { response: { status: 429 } }
      const result = classifyError(rateLimitError)

      expect(result).toEqual({
        category: 'rate_limit',
        severity: 'medium',
        isRecoverable: true,
        retryable: true,
        userActionRequired: false
      })
    })

    it('should classify server errors correctly', () => {
      const serverError500 = { response: { status: 500 } }
      const serverError502 = { response: { status: 502 } }
      const serverError503 = { response: { status: 503 } }
      const serverError504 = { response: { status: 504 } }

      expect(classifyError(serverError500)).toEqual({
        category: 'server',
        severity: 'high',
        isRecoverable: true,
        retryable: true,
        userActionRequired: false
      })

      expect(classifyError(serverError502)).toEqual({
        category: 'server',
        severity: 'medium',
        isRecoverable: true,
        retryable: true,
        userActionRequired: false
      })

      expect(classifyError(serverError503)).toEqual({
        category: 'server',
        severity: 'medium',
        isRecoverable: true,
        retryable: true,
        userActionRequired: false
      })

      expect(classifyError(serverError504)).toEqual({
        category: 'server',
        severity: 'medium',
        isRecoverable: true,
        retryable: true,
        userActionRequired: false
      })
    })

    it('should classify unknown HTTP status as client error', () => {
      const unknownError = { response: { status: 418 } }
      const result = classifyError(unknownError)

      expect(result).toEqual({
        category: 'client',
        severity: 'medium',
        isRecoverable: false,
        retryable: false,
        userActionRequired: true
      })
    })

    it('should classify JavaScript errors correctly', () => {
      const jsError = new Error('TypeError: Cannot read property of null')
      const result = classifyError(jsError)

      expect(result).toEqual({
        category: 'client',
        severity: 'medium',
        isRecoverable: false,
        retryable: false,
        userActionRequired: false
      })
    })

    it('should classify unknown errors correctly', () => {
      const unknownError = { some: 'unknown error' }
      const result = classifyError(unknownError)

      expect(result).toEqual({
        category: 'client',
        severity: 'low',
        isRecoverable: false,
        retryable: false,
        userActionRequired: false
      })
    })

    it('should handle null and undefined errors', () => {
      expect(classifyError(null)).toEqual({
        category: 'client',
        severity: 'low',
        isRecoverable: false,
        retryable: false,
        userActionRequired: false
      })

      expect(classifyError(undefined)).toEqual({
        category: 'client',
        severity: 'low',
        isRecoverable: false,
        retryable: false,
        userActionRequired: false
      })
    })

    it('should handle CSRF errors with different message formats', () => {
      const csrfErrorInMessage = {
        response: {
          status: 403,
          data: { message: 'Invalid CSRF token provided' }
        }
      }

      const csrfErrorInError = {
        response: {
          status: 403,
          data: { error: 'CSRF validation failed' }
        }
      }

      expect(classifyError(csrfErrorInMessage).category).toBe('csrf')
      expect(classifyError(csrfErrorInError).category).toBe('csrf')
    })
  })

  describe('createRecoveryStrategies', () => {
    it('should create all recovery strategies with correct properties', () => {
      const strategies = createRecoveryStrategies()

      expect(strategies).toHaveProperty('refreshPage')
      expect(strategies).toHaveProperty('clearCache')
      expect(strategies).toHaveProperty('retryRequest')
      expect(strategies).toHaveProperty('forceReauth')
      expect(strategies).toHaveProperty('navigateHome')

      // Check strategy structure
      Object.values(strategies).forEach(strategy => {
        expect(strategy).toHaveProperty('id')
        expect(strategy).toHaveProperty('name')
        expect(strategy).toHaveProperty('description')
        expect(strategy).toHaveProperty('action')
        expect(strategy).toHaveProperty('canRetry')
        expect(strategy).toHaveProperty('priority')
        expect(typeof strategy.action).toBe('function')
      })
    })

    it('should have strategies with correct priority order', () => {
      const strategies = createRecoveryStrategies()
      const priorities = Object.values(strategies).map(s => s.priority)

      expect(strategies.refreshPage.priority).toBe(1)
      expect(strategies.clearCache.priority).toBe(2)
      expect(strategies.retryRequest.priority).toBe(3)
      expect(strategies.forceReauth.priority).toBe(4)
      expect(strategies.navigateHome.priority).toBe(5)
    })

    it('should execute refreshPage strategy', async () => {
      const strategies = createRecoveryStrategies()
      const result = await strategies.refreshPage.action()

      expect(result).toBe(true)
      expect(mockLocation.reload).toHaveBeenCalled()
    })

    it('should execute clearCache strategy successfully', async () => {
      const strategies = createRecoveryStrategies()
      const result = await strategies.clearCache.action()

      expect(result).toBe(true)
      expect(mockCaches.keys).toHaveBeenCalled()
      expect(mockCaches.delete).toHaveBeenCalledWith('cache1')
      expect(mockCaches.delete).toHaveBeenCalledWith('cache2')
      expect(mockStorage.clear).toHaveBeenCalledTimes(2) // localStorage and sessionStorage
    })

    it('should handle clearCache strategy failure gracefully', async () => {
      mockCaches.keys.mockRejectedValueOnce(new Error('Cache API not available'))

      const strategies = createRecoveryStrategies()
      const result = await strategies.clearCache.action()

      expect(result).toBe(false)
    })

    it('should execute retryRequest strategy with delay', async () => {
      vi.useFakeTimers()
      const strategies = createRecoveryStrategies()

      const actionPromise = strategies.retryRequest.action()
      
      // Fast-forward time by 1 second
      vi.advanceTimersByTime(1000)
      
      const result = await actionPromise
      expect(result).toBe(true)

      vi.useRealTimers()
    })

    it('should execute forceReauth strategy', async () => {
      const strategies = createRecoveryStrategies()
      const result = await strategies.forceReauth.action()

      expect(result).toBe(true)
      expect(mockSessionStorage.clear).toHaveBeenCalled()
      expect(mockLocation.href).toBe('/api/auth/logout')
    })

    it('should execute navigateHome strategy', async () => {
      const strategies = createRecoveryStrategies()
      const result = await strategies.navigateHome.action()

      expect(result).toBe(true)
      expect(mockLocation.href).toBe('/')
    })
  })

  describe('ErrorRecoveryManager', () => {
    let manager: ErrorRecoveryManager

    beforeEach(() => {
      manager = new ErrorRecoveryManager()
    })

    it('should return false for non-recoverable errors', async () => {
      const nonRecoverableError = new Error('Some client error')
      const result = await manager.attemptRecovery(nonRecoverableError)

      expect(result).toBe(false)
    })

    it('should attempt recovery for network errors', async () => {
      const networkError = { code: 'NETWORK_ERROR' }
      vi.useFakeTimers()
      
      const recoveryPromise = manager.attemptRecovery(networkError)
      vi.advanceTimersByTime(1000) // For retry delay
      const result = await recoveryPromise

      expect(result).toBe(true)
      vi.useRealTimers()
    })

    it('should attempt recovery for authentication errors', async () => {
      const authError = { response: { status: 401 } }
      const result = await manager.attemptRecovery(authError)

      expect(result).toBe(true)
      expect(mockSessionStorage.clear).toHaveBeenCalled()
    })

    it('should attempt recovery for CSRF errors', async () => {
      const csrfError = {
        response: {
          status: 403,
          data: { message: 'CSRF token expired' }
        }
      }
      
      vi.useFakeTimers()
      const recoveryPromise = manager.attemptRecovery(csrfError)
      vi.advanceTimersByTime(1000)
      const result = await recoveryPromise

      expect(result).toBe(true)
      vi.useRealTimers()
    })

    it('should attempt recovery for rate limit errors', async () => {
      const rateLimitError = { response: { status: 429 } }
      
      vi.useFakeTimers()
      const recoveryPromise = manager.attemptRecovery(rateLimitError)
      vi.advanceTimersByTime(1000)
      const result = await recoveryPromise

      expect(result).toBe(true)
      vi.useRealTimers()
    })

    it('should attempt recovery for server errors', async () => {
      const serverError = { response: { status: 500 } }
      
      vi.useFakeTimers()
      const recoveryPromise = manager.attemptRecovery(serverError)
      vi.advanceTimersByTime(1000)
      const result = await recoveryPromise

      expect(result).toBe(true)
      vi.useRealTimers()
    })

    it('should attempt recovery for client errors with cache clearing', async () => {
      const clientError = { response: { status: 404 } }
      const result = await manager.attemptRecovery(clientError)

      expect(result).toBe(true)
      expect(mockCaches.keys).toHaveBeenCalled()
    })

    it('should respect max retry limits', async () => {
      const networkError = { code: 'NETWORK_ERROR' }
      manager['maxRetries'] = 2
      
      vi.useFakeTimers()
      
      // First attempt should succeed
      let recoveryPromise = manager.attemptRecovery(networkError)
      vi.advanceTimersByTime(1000)
      let result = await recoveryPromise
      expect(result).toBe(true)

      // Reset manager state and make retry fail
      vi.spyOn(manager['strategies'].retryRequest, 'action').mockResolvedValue(false)
      
      // Exhaust retries
      for (let i = 0; i < 3; i++) {
        recoveryPromise = manager.attemptRecovery(networkError)
        vi.advanceTimersByTime(1000)
        await recoveryPromise
      }

      // Should skip retry strategy after max attempts
      recoveryPromise = manager.attemptRecovery(networkError)
      vi.advanceTimersByTime(1000)
      result = await recoveryPromise
      
      expect(mockLocation.reload).toHaveBeenCalled() // Should fall back to refresh

      vi.useRealTimers()
    })

    it('should handle recovery strategy failures gracefully', async () => {
      const networkError = { code: 'NETWORK_ERROR' }
      
      // Mock retry strategy to throw error
      vi.spyOn(manager['strategies'].retryRequest, 'action').mockRejectedValue(new Error('Strategy failed'))
      
      vi.useFakeTimers()
      const recoveryPromise = manager.attemptRecovery(networkError)
      vi.advanceTimersByTime(1000)
      const result = await recoveryPromise

      expect(result).toBe(true) // Should succeed with refresh strategy
      expect(console.warn).toHaveBeenCalledWith('Recovery strategy retryRequest failed:', expect.any(Error))
      
      vi.useRealTimers()
    })

    it('should reset retry attempts', () => {
      manager['retryAttempts'].set('testStrategy', 3)
      manager.reset()
      
      expect(manager.getRetryCount('testStrategy')).toBe(0)
    })

    it('should track retry counts correctly', () => {
      expect(manager.getRetryCount('nonexistent')).toBe(0)
      
      manager['retryAttempts'].set('testStrategy', 2)
      expect(manager.getRetryCount('testStrategy')).toBe(2)
    })
  })

  describe('createErrorReport', () => {
    it('should create complete error report', () => {
      const error = new Error('Test error message')
      error.stack = 'Error: Test error\n    at test.js:1:1'
      
      const report = createErrorReport(error, 'test context', 'user123')

      expect(report).toEqual({
        id: 'test-uuid-123',
        timestamp: expect.any(Date),
        error: {
          message: 'Test error message',
          stack: 'Error: Test error\n    at test.js:1:1',
          response: undefined
        },
        classification: expect.objectContaining({
          category: 'client',
          severity: 'medium'
        }),
        context: 'test context',
        userAgent: 'test-user-agent',
        url: '/',
        userId: 'user123',
        recoveryAttempted: false
      })
    })

    it('should create error report with HTTP response', () => {
      const error = {
        message: 'Request failed',
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      }
      
      const report = createErrorReport(error)

      expect(report.error.response).toEqual({
        status: 500,
        data: { message: 'Internal server error' }
      })
    })

    it('should handle error without message', () => {
      const error = {}
      const report = createErrorReport(error)

      expect(report.error.message).toBe('Unknown error')
    })

    it('should create report without optional parameters', () => {
      const error = new Error('Test error')
      const report = createErrorReport(error)

      expect(report).not.toHaveProperty('context')
      expect(report).not.toHaveProperty('userId')
    })
  })

  describe('reportError', () => {
    beforeEach(() => {
      // Mock process.env.NODE_ENV
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('should log error in development environment', async () => {
      const error = new Error('Test error')
      const report = createErrorReport(error, 'test context')

      await reportError(report)

      expect(console.group).toHaveBeenCalledWith('🚨 Error Report')
      expect(console.error).toHaveBeenCalledWith('Operation failed')
      expect(console.log).toHaveBeenCalledWith('Classification:', report.classification)
      expect(console.log).toHaveBeenCalledWith('Context:', 'test context')
      expect(console.log).toHaveBeenCalledWith('URL:', '/')
      expect(console.groupEnd).toHaveBeenCalled()
    })

    it('should not log in production environment', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      
      const error = new Error('Test error')
      const report = createErrorReport(error)

      await reportError(report)

      expect(console.group).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    })
  })

  describe('singleton errorRecoveryManager', () => {
    it('should export singleton instance', () => {
      expect(errorRecoveryManager).toBeInstanceOf(ErrorRecoveryManager)
      expect(errorRecoveryManager).toBe(errorRecoveryManager) // Same reference
    })
  })

  describe('Edge Cases and Error Boundaries', () => {
    it('should handle malformed error objects', () => {
      const malformedError = {
        response: {
          status: 'invalid',
          data: null
        }
      }
      
      const classification = classifyError(malformedError)
      expect(classification.category).toBe('client')
    })

    it('should handle errors with circular references', () => {
      const circularError: any = { message: 'Circular error' }
      circularError.self = circularError
      
      expect(() => classifyError(circularError)).not.toThrow()
    })

    it('should handle recovery when window objects are not available', async () => {
      const originalWindow = global.window
      delete (global as any).window
      
      const strategies = createRecoveryStrategies()
      
      // Should not throw when window is undefined
      await expect(strategies.refreshPage.action()).resolves.toBe(true)
      
      // Restore window
      global.window = originalWindow
    })

    it('should handle cache API unavailability', async () => {
      const originalWindow = global.window
      global.window = { ...global.window, caches: undefined } as any
      
      const strategies = createRecoveryStrategies()
      const result = await strategies.clearCache.action()
      
      expect(result).toBe(true) // Should still succeed by clearing storage
      
      global.window = originalWindow
    })

    it('should handle crypto API unavailability', () => {
      const originalCrypto = global.crypto
      delete (global as any).crypto
      
      // Should not throw, might return undefined or fallback
      expect(() => createErrorReport(new Error('test'))).not.toThrow()
      
      global.crypto = originalCrypto
    })
  })
})