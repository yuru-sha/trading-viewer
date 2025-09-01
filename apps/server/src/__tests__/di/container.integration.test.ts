/**
 * DI Container Integration Tests
 *
 * Evidence-Based Testing:
 * - Validates container configuration
 * - Tests service resolution
 * - Verifies dependency injection
 * - Confirms mock substitution
 */

import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TYPES } from '../../infrastructure/di/types'
import { ApplicationContainer } from '../../infrastructure/di/container'
import {
  TestContainerManager,
  createMockedTestContainer,
  setupTestContainer,
  teardownTestContainer,
  createMockYahooFinanceService,
  createMockLoggerService,
} from '../../infrastructure/di/testing'
import type {
  IYahooFinanceService,
  ILoggerService,
  IIndicatorCalculationService,
} from '../../infrastructure/di/interfaces'

describe('DI Container Integration', () => {
  let testContainer: TestContainerManager

  beforeEach(() => {
    testContainer = setupTestContainer()
  })

  afterEach(() => {
    teardownTestContainer(testContainer)
  })

  describe('Service Resolution', () => {
    it('should resolve YahooFinanceService', () => {
      const service = testContainer.get<IYahooFinanceService>(TYPES.YahooFinanceService)
      expect(service).toBeDefined()
      expect(typeof service.getQuote).toBe('function')
    })

    it('should resolve LoggerService', () => {
      const service = testContainer.get<ILoggerService>(TYPES.LoggerService)
      expect(service).toBeDefined()
      expect(typeof service.info).toBe('function')
      expect(service.api).toBeDefined()
      expect(service.security).toBeDefined()
    })

    it('should resolve IndicatorCalculationService', () => {
      const service = testContainer.get<IIndicatorCalculationService>(
        TYPES.IndicatorCalculationService
      )
      expect(service).toBeDefined()
      expect(typeof service.calculateSMA).toBe('function')
      expect(typeof service.calculateRSI).toBe('function')
    })
  })

  describe('Mock Injection', () => {
    it('should inject mock YahooFinanceService', async () => {
      const mockService = createMockYahooFinanceService()
      const testQuote = {
        symbol: 'AAPL',
        currentPrice: 150.0,
        change: 5.0,
        changePercent: 3.33,
        high: 155.0,
        low: 145.0,
        open: 148.0,
        previousClose: 145.0,
        volume: 1000000,
        timestamp: Date.now(),
      }

      mockService.getQuote.mockResolvedValue(testQuote)
      testContainer.mock(TYPES.YahooFinanceService, mockService)

      const injectedService = testContainer.get<IYahooFinanceService>(TYPES.YahooFinanceService)
      const result = await injectedService.getQuote('AAPL')

      expect(result).toEqual(testQuote)
      expect(mockService.getQuote).toHaveBeenCalledWith('AAPL')
    })

    it('should inject mock LoggerService', () => {
      const mockLogger = createMockLoggerService()
      testContainer.mock(TYPES.LoggerService, mockLogger)

      const injectedLogger = testContainer.get<ILoggerService>(TYPES.LoggerService)
      injectedLogger.info('Test message')
      injectedLogger.api.error('API error', new Error('Test error'))

      expect(mockLogger.info).toHaveBeenCalledWith('Test message')
      expect(mockLogger.api.error).toHaveBeenCalledWith('API error', new Error('Test error'))
    })

    it('should restore original service after mock', () => {
      // Get original service
      const originalService = testContainer.get<IYahooFinanceService>(TYPES.YahooFinanceService)

      // Inject mock
      const mockService = createMockYahooFinanceService()
      testContainer.mock(TYPES.YahooFinanceService, mockService)

      // Verify mock is injected
      const mockedService = testContainer.get<IYahooFinanceService>(TYPES.YahooFinanceService)
      expect(mockedService).toBe(mockService)

      // Restore original
      testContainer.restore(TYPES.YahooFinanceService)
      const restoredService = testContainer.get<IYahooFinanceService>(TYPES.YahooFinanceService)

      // Should be original implementation (not the same instance due to DI container behavior)
      expect(restoredService).not.toBe(mockService)
      expect(typeof restoredService.getQuote).toBe('function')
    })
  })

  describe('Full Mock Environment', () => {
    it('should create complete mocked environment', () => {
      const { container, mocks } = createMockedTestContainer()

      // Verify all services are mocked
      expect(mocks.yahooFinance.getQuote).toBeDefined()
      expect(mocks.indicators.calculateSMA).toBeDefined()
      expect(mocks.websocket.broadcast).toBeDefined()
      expect(mocks.logger.info).toBeDefined()
      expect(mocks.cache.get).toBeDefined()
      expect(mocks.database.ping).toBeDefined()
      expect(mocks.authorization.hasPermission).toBeDefined()
      expect(mocks.drawingCleanup.cleanupOrphanedDrawings).toBeDefined()

      // Verify services are injected
      const yahooService = container.get<IYahooFinanceService>(TYPES.YahooFinanceService)
      expect(yahooService).toBe(mocks.yahooFinance)

      container.cleanup()
    })

    it('should handle service interactions', async () => {
      const { container, mocks } = createMockedTestContainer()

      // Configure mocks
      mocks.cache.get.mockResolvedValue({ cached: 'data' })
      mocks.logger.info.mockImplementation(() => {})

      // Get services
      const cacheService = container.get(TYPES.CacheService)
      const loggerService = container.get(TYPES.LoggerService)

      // Test interaction
      const cachedData = await cacheService.get('test-key')
      loggerService.info('Retrieved cached data', { data: cachedData })

      // Verify interactions
      expect(mocks.cache.get).toHaveBeenCalledWith('test-key')
      expect(mocks.logger.info).toHaveBeenCalledWith('Retrieved cached data', {
        data: { cached: 'data' },
      })

      container.cleanup()
    })
  })

  describe('Error Handling', () => {
    it('should handle service resolution errors gracefully', () => {
      const invalidSymbol = Symbol.for('NonExistentService')

      expect(() => {
        testContainer.get(invalidSymbol)
      }).toThrow()
    })

    it('should handle mock injection errors', () => {
      const invalidMock = null as any

      expect(() => {
        testContainer.mock(TYPES.YahooFinanceService, invalidMock)
      }).not.toThrow() // InversifyJS handles null values
    })
  })

  describe('Container Isolation', () => {
    it('should maintain test isolation between containers', () => {
      const container1 = setupTestContainer()
      const container2 = setupTestContainer()

      const mock1 = createMockYahooFinanceService()
      const mock2 = createMockYahooFinanceService()

      container1.mock(TYPES.YahooFinanceService, mock1)
      container2.mock(TYPES.YahooFinanceService, mock2)

      const service1 = container1.get<IYahooFinanceService>(TYPES.YahooFinanceService)
      const service2 = container2.get<IYahooFinanceService>(TYPES.YahooFinanceService)

      expect(service1).toBe(mock1)
      expect(service2).toBe(mock2)
      expect(service1).not.toBe(service2)

      teardownTestContainer(container1)
      teardownTestContainer(container2)
    })
  })
})
