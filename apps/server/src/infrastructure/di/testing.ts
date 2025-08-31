/**
 * Testing Utilities for Dependency Injection
 *
 * Evidence-First Testing Design:
 * - Mock-friendly container configuration
 * - Type-safe mock creation
 * - Test isolation guarantees
 * - Easy mock injection and restoration
 */

import 'reflect-metadata'
import { Container } from 'inversify'
import { TYPES } from './types.js'
import { ApplicationContainer } from './container.js'
import type {
  IYahooFinanceService,
  IIndicatorCalculationService,
  IWebSocketService,
  ILoggerService,
  ICacheService,
  IDatabaseService,
  IAuthorizationService,
  IDrawingCleanupService,
} from './interfaces.js'

/**
 * Test Container Manager
 *
 * Provides isolated DI container instances for testing
 * with easy mock injection and cleanup
 */
export class TestContainerManager {
  private testContainer: Container
  private originalBindings = new Map<symbol, any>()

  constructor() {
    this.testContainer = ApplicationContainer.getTestInstance()
  }

  /**
   * Inject a mock service for testing
   *
   * @param serviceIdentifier - The service type symbol
   * @param mockImplementation - Mock implementation
   */
  mock<T>(serviceIdentifier: symbol, mockImplementation: T): void {
    // Store original binding if exists
    if (this.testContainer.isBound(serviceIdentifier)) {
      this.originalBindings.set(serviceIdentifier, this.testContainer.get(serviceIdentifier))
      this.testContainer.unbind(serviceIdentifier)
    }

    // Bind mock implementation
    this.testContainer.bind<T>(serviceIdentifier).toConstantValue(mockImplementation)
  }

  /**
   * Get service from test container
   */
  get<T>(serviceIdentifier: symbol): T {
    return this.testContainer.get<T>(serviceIdentifier)
  }

  /**
   * Restore original service binding
   */
  restore(serviceIdentifier: symbol): void {
    if (this.testContainer.isBound(serviceIdentifier)) {
      this.testContainer.unbind(serviceIdentifier)
    }

    const original = this.originalBindings.get(serviceIdentifier)
    if (original) {
      this.testContainer.bind(serviceIdentifier).toConstantValue(original)
      this.originalBindings.delete(serviceIdentifier)
    }
  }

  /**
   * Restore all mocked services
   */
  restoreAll(): void {
    for (const [serviceIdentifier] of this.originalBindings) {
      this.restore(serviceIdentifier)
    }
  }

  /**
   * Clean up test container
   */
  cleanup(): void {
    this.restoreAll()
    this.testContainer.unbindAll()
    ApplicationContainer.reset()
  }
}

/**
 * Mock Factory Functions
 *
 * Creates type-safe mocks for each service interface
 */

import { vi, type MockedFunction } from 'vitest'

// Mock type definitions
export type MockedYahooFinanceService = {
  getQuote: MockedFunction<IYahooFinanceService['getQuote']>
  getMultipleQuotes: MockedFunction<IYahooFinanceService['getMultipleQuotes']>
  getCandles: MockedFunction<IYahooFinanceService['getCandles']>
  getCandlesWithResolution: MockedFunction<IYahooFinanceService['getCandlesWithResolution']>
  searchSymbols: MockedFunction<IYahooFinanceService['searchSymbols']>
  getNews: MockedFunction<IYahooFinanceService['getNews']>
  getCategoryNews: MockedFunction<IYahooFinanceService['getCategoryNews']>
}

export function createMockYahooFinanceService(): MockedYahooFinanceService {
  return {
    getQuote: vi.fn().mockResolvedValue(null),
    getMultipleQuotes: vi.fn().mockResolvedValue([]),
    getCandles: vi.fn().mockResolvedValue([]),
    getCandlesWithResolution: vi.fn().mockResolvedValue([]),
    searchSymbols: vi.fn().mockResolvedValue([]),
    getNews: vi.fn().mockResolvedValue([]),
    getCategoryNews: vi.fn().mockResolvedValue([]),
  }
}

export type MockedIndicatorCalculationService = {
  calculateSMA: MockedFunction<IIndicatorCalculationService['calculateSMA']>
  calculateEMA: MockedFunction<IIndicatorCalculationService['calculateEMA']>
  calculateRSI: MockedFunction<IIndicatorCalculationService['calculateRSI']>
  calculateMACD: MockedFunction<IIndicatorCalculationService['calculateMACD']>
  calculateBollingerBands: MockedFunction<IIndicatorCalculationService['calculateBollingerBands']>
  calculateIndicator: MockedFunction<IIndicatorCalculationService['calculateIndicator']>
}

export function createMockIndicatorCalculationService(): MockedIndicatorCalculationService {
  return {
    calculateSMA: vi.fn().mockReturnValue([]),
    calculateEMA: vi.fn().mockReturnValue([]),
    calculateRSI: vi.fn().mockReturnValue([]),
    calculateMACD: vi.fn().mockReturnValue({
      macd: [],
      signal: [],
      histogram: [],
    }),
    calculateBollingerBands: vi.fn().mockReturnValue({
      upper2: [],
      upper1: [],
      middle: [],
      lower1: [],
      lower2: [],
    }),
    calculateIndicator: vi.fn().mockReturnValue({
      type: 'test',
      name: 'test',
      parameters: {},
      values: [],
    }),
  }
}

export type MockedWebSocketService = {
  broadcast: MockedFunction<IWebSocketService['broadcast']>
  broadcastToUser: MockedFunction<IWebSocketService['broadcastToUser']>
  sendToClient: MockedFunction<IWebSocketService['sendToClient']>
  getConnectedClientsCount: MockedFunction<IWebSocketService['getConnectedClientsCount']>
  getConnectedUserIds: MockedFunction<IWebSocketService['getConnectedUserIds']>
  isUserConnected: MockedFunction<IWebSocketService['isUserConnected']>
}

export function createMockWebSocketService(): MockedWebSocketService {
  return {
    broadcast: vi.fn(),
    broadcastToUser: vi.fn(),
    sendToClient: vi.fn(),
    getConnectedClientsCount: vi.fn().mockReturnValue(0),
    getConnectedUserIds: vi.fn().mockReturnValue([]),
    isUserConnected: vi.fn().mockReturnValue(false),
  }
}

type MockedLoggerMethods = {
  info: MockedFunction<ILoggerService['info']>
  warn: MockedFunction<ILoggerService['warn']>
  error: MockedFunction<ILoggerService['error']>
  debug: MockedFunction<ILoggerService['debug']>
  fatal: MockedFunction<ILoggerService['fatal']>
}

export type MockedLoggerService = MockedLoggerMethods & {
  auth: MockedLoggerMethods
  api: MockedLoggerMethods
  database: MockedLoggerMethods
  websocket: MockedLoggerMethods
  security: MockedLoggerMethods
  performance: MockedLoggerMethods
  business: MockedLoggerMethods
  system: MockedLoggerMethods
  audit: MockedLoggerMethods
}

export function createMockLoggerService(): MockedLoggerService {
  const mockLogger: MockedLoggerMethods = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  }

  return {
    ...mockLogger,
    auth: mockLogger,
    api: mockLogger,
    database: mockLogger,
    websocket: mockLogger,
    security: mockLogger,
    performance: mockLogger,
    business: mockLogger,
    system: mockLogger,
    audit: mockLogger,
  }
}

export type MockedCacheService = {
  get: MockedFunction<ICacheService['get']>
  set: MockedFunction<ICacheService['set']>
  has: MockedFunction<ICacheService['has']>
  delete: MockedFunction<ICacheService['delete']>
  clear: MockedFunction<ICacheService['clear']>
  getStats: MockedFunction<ICacheService['getStats']>
}

export function createMockCacheService(): MockedCacheService {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockResolvedValue(false),
    delete: vi.fn().mockResolvedValue(false),
    clear: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockReturnValue({
      hits: 0,
      misses: 0,
      keys: 0,
      hitRate: 0,
    }),
  }
}

export type MockedDatabaseService = {
  isHealthy: MockedFunction<IDatabaseService['isHealthy']>
  ping: MockedFunction<IDatabaseService['ping']>
}

export function createMockDatabaseService(): MockedDatabaseService {
  return {
    isHealthy: vi.fn().mockResolvedValue(true),
    ping: vi.fn().mockResolvedValue(true),
  }
}

export type MockedAuthorizationService = {
  hasPermission: MockedFunction<IAuthorizationService['hasPermission']>
  hasRole: MockedFunction<IAuthorizationService['hasRole']>
  getUserPermissions: MockedFunction<IAuthorizationService['getUserPermissions']>
  getUserRoles: MockedFunction<IAuthorizationService['getUserRoles']>
}

export function createMockAuthorizationService(): MockedAuthorizationService {
  return {
    hasPermission: vi.fn().mockResolvedValue(true),
    hasRole: vi.fn().mockResolvedValue(true),
    getUserPermissions: vi.fn().mockResolvedValue([]),
    getUserRoles: vi.fn().mockResolvedValue([]),
  }
}

export type MockedDrawingCleanupService = {
  cleanupOrphanedDrawings: MockedFunction<IDrawingCleanupService['cleanupOrphanedDrawings']>
  cleanupExpiredDrawings: MockedFunction<IDrawingCleanupService['cleanupExpiredDrawings']>
  getCleanupStats: MockedFunction<IDrawingCleanupService['getCleanupStats']>
}

export function createMockDrawingCleanupService(): MockedDrawingCleanupService {
  return {
    cleanupOrphanedDrawings: vi.fn().mockResolvedValue(undefined),
    cleanupExpiredDrawings: vi.fn().mockResolvedValue(undefined),
    getCleanupStats: vi.fn().mockResolvedValue({
      orphanedCount: 0,
      expiredCount: 0,
      lastCleanup: new Date(),
    }),
  }
}

/**
 * Convenience function to create a fully mocked test environment
 */
export function createMockedTestContainer(): {
  container: TestContainerManager
  mocks: {
    yahooFinance: MockedYahooFinanceService
    indicators: MockedIndicatorCalculationService
    websocket: MockedWebSocketService
    logger: MockedLoggerService
    cache: MockedCacheService
    database: MockedDatabaseService
    authorization: MockedAuthorizationService
    drawingCleanup: MockedDrawingCleanupService
  }
} {
  const container = new TestContainerManager()

  const mocks = {
    yahooFinance: createMockYahooFinanceService(),
    indicators: createMockIndicatorCalculationService(),
    websocket: createMockWebSocketService(),
    logger: createMockLoggerService(),
    cache: createMockCacheService(),
    database: createMockDatabaseService(),
    authorization: createMockAuthorizationService(),
    drawingCleanup: createMockDrawingCleanupService(),
  }

  // Inject all mocks
  container.mock(TYPES.YahooFinanceService, mocks.yahooFinance)
  container.mock(TYPES.IndicatorCalculationService, mocks.indicators)
  container.mock(TYPES.WebSocketService, mocks.websocket)
  container.mock(TYPES.LoggerService, mocks.logger)
  container.mock(TYPES.CacheService, mocks.cache)
  container.mock(TYPES.DatabaseService, mocks.database)
  container.mock(TYPES.AuthorizationService, mocks.authorization)
  container.mock(TYPES.DrawingCleanupService, mocks.drawingCleanup)

  return { container, mocks }
}

/**
 * Test helper for setup and teardown
 */
export function setupTestContainer(): TestContainerManager {
  return new TestContainerManager()
}

export function teardownTestContainer(container: TestContainerManager): void {
  container.cleanup()
}
