/**
 * DI Container Usage Examples
 *
 * Demonstrates Evidence-First patterns:
 * - Constructor injection
 * - Interface segregation
 * - Mock substitution for testing
 * - Service lifecycle management
 */

import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { injectable, inject } from 'inversify'
import {
  TestContainerManager,
  setupTestContainer,
  teardownTestContainer,
  TYPES,
  createMockLoggerService,
  createMockCacheService,
  type MockedLoggerService,
  type MockedCacheService,
} from '../../infrastructure/di/index.js'
import type { ILoggerService, ICacheService } from '../../infrastructure/di/interfaces.js'
import { vi } from 'vitest'

/**
 * Example Service using Dependency Injection
 */
@injectable()
class ExampleUserService {
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.CacheService) private cache: ICacheService
  ) {}

  // Test helper methods for better type safety
  public getInjectedLogger(): ILoggerService {
    return this.logger
  }

  public getInjectedCache(): ICacheService {
    return this.cache
  }

  async getUser(userId: string): Promise<{ id: string; name: string; email: string }> {
    this.logger.info('Fetching user', { userId })

    // Check cache first
    const cachedUser = await this.cache.get<{ id: string; name: string; email: string }>(
      `user:${userId}`
    )
    if (cachedUser) {
      this.logger.info('User found in cache', { userId })
      return cachedUser
    }

    // Simulate database fetch
    const user = { id: userId, name: `User ${userId}`, email: `user${userId}@example.com` }

    // Cache the result
    await this.cache.set(`user:${userId}`, user, 300) // 5 minutes TTL

    this.logger.info('User fetched from database', { userId })
    return user
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.delete(`user:${userId}`)
    this.logger.info('User cache invalidated', { userId })
  }
}

describe('DI Container Usage Examples', () => {
  let testContainer: TestContainerManager
  let userService: ExampleUserService

  beforeEach(() => {
    testContainer = setupTestContainer()

    // Create mocks
    const mockLogger = createMockLoggerService()
    const mockCache = createMockCacheService()

    // Inject mocks
    testContainer.mock(TYPES.LoggerService, mockLogger)
    testContainer.mock(TYPES.CacheService, mockCache)

    // Manually instantiate service with injected dependencies
    userService = new ExampleUserService(
      testContainer.get(TYPES.LoggerService),
      testContainer.get(TYPES.CacheService)
    )
  })

  afterEach(() => {
    teardownTestContainer(testContainer)
  })

  describe('Constructor Injection Pattern', () => {
    it('should inject dependencies through constructor', () => {
      expect(userService).toBeDefined()

      // Dependencies should be properly injected - using type-safe helper methods
      expect(userService.getInjectedLogger()).toBeDefined()
      expect(userService.getInjectedCache()).toBeDefined()
    })

    it('should use injected logger service', async () => {
      const mockLogger = testContainer.get(TYPES.LoggerService) as MockedLoggerService

      await userService.getUser('123')

      expect(mockLogger.info).toHaveBeenCalledWith('Fetching user', { userId: '123' })
      expect(mockLogger.info).toHaveBeenCalledWith('User fetched from database', { userId: '123' })
    })

    it('should use injected cache service', async () => {
      const mockCache = testContainer.get(TYPES.CacheService) as MockedCacheService
      mockCache.get.mockResolvedValue(null) // Simulate cache miss

      await userService.getUser('456')

      expect(mockCache.get).toHaveBeenCalledWith('user:456')
      expect(mockCache.set).toHaveBeenCalledWith('user:456', expect.any(Object), 300)
    })
  })

  describe('Mock Behavior Control', () => {
    it('should handle cache hit scenario', async () => {
      const mockCache = testContainer.get(TYPES.CacheService) as MockedCacheService
      const cachedUser = { id: '789', name: 'Cached User', email: 'cached@example.com' }

      mockCache.get.mockResolvedValue(cachedUser)

      const result = await userService.getUser('789')

      expect(result).toEqual(cachedUser)
      expect(mockCache.set).not.toHaveBeenCalled() // Should not set cache on cache hit
    })

    it('should handle cache miss scenario', async () => {
      const mockCache = testContainer.get(TYPES.CacheService) as MockedCacheService
      mockCache.get.mockResolvedValue(null) // Simulate cache miss

      const result = await userService.getUser('999')

      expect(result).toEqual({
        id: '999',
        name: 'User 999',
        email: 'user999@example.com',
      })
      expect(mockCache.set).toHaveBeenCalledWith('user:999', expect.any(Object), 300)
    })

    it('should invalidate cache correctly', async () => {
      const mockCache = testContainer.get(TYPES.CacheService) as MockedCacheService
      const mockLogger = testContainer.get(TYPES.LoggerService) as MockedLoggerService

      await userService.invalidateUserCache('123')

      expect(mockCache.delete).toHaveBeenCalledWith('user:123')
      expect(mockLogger.info).toHaveBeenCalledWith('User cache invalidated', { userId: '123' })
    })
  })

  describe('Service Interaction Testing', () => {
    it('should demonstrate service collaboration', async () => {
      const mockCache = testContainer.get(TYPES.CacheService) as MockedCacheService
      const mockLogger = testContainer.get(TYPES.LoggerService) as MockedLoggerService

      // Setup mock behavior
      mockCache.get.mockResolvedValueOnce(null) // First call - cache miss
      mockCache.get.mockResolvedValueOnce({ cached: 'user' }) // Second call - cache hit

      // First fetch - should go to database
      await userService.getUser('collaborative-test')

      // Second fetch - should use cache
      await userService.getUser('collaborative-test')

      // Verify interaction patterns
      expect(mockCache.get).toHaveBeenCalledTimes(2)
      expect(mockCache.set).toHaveBeenCalledTimes(1) // Only on first fetch
      expect(mockLogger.info).toHaveBeenCalledWith('User found in cache', {
        userId: 'collaborative-test',
      })
    })
  })

  describe('Error Handling with DI', () => {
    it('should handle service errors gracefully', async () => {
      const mockCache = testContainer.get(TYPES.CacheService) as jest.Mocked<ICacheService>
      const mockLogger = testContainer.get(TYPES.LoggerService) as jest.Mocked<ILoggerService>

      // Simulate cache service error
      mockCache.get.mockRejectedValue(new Error('Cache connection failed'))

      // Service should handle error gracefully
      await expect(userService.getUser('error-test')).rejects.toThrow('Cache connection failed')

      // Logger should be called for the attempt
      expect(mockLogger.info).toHaveBeenCalledWith('Fetching user', { userId: 'error-test' })
    })
  })
})
