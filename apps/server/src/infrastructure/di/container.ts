/**
 * Dependency Injection Container Configuration
 *
 * Evidence-First Architecture:
 * - Centralized dependency management
 * - Type-safe service resolution
 * - Environment-specific configurations
 * - Test-friendly design
 */

import 'reflect-metadata'
import { Container } from 'inversify'
import { TYPES } from './types.js'
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

// Import concrete implementations
// Note: Services must be properly decorated with @injectable()
// Some services will be bound dynamically to avoid circular dependencies

/**
 * Application DI Container
 *
 * Singleton pattern with lazy initialization
 * Supports both production and test configurations
 */
// Import concrete implementations (synchronous)
import { YahooFinanceService } from '../../application/services/yahooFinanceService.js'
import { IndicatorCalculationService } from '../../application/services/IndicatorCalculationService.js'
import { AuthService } from '../../application/services/AuthService.js'
import { UserRepository } from '../repositories/UserRepository.js'
import { RefreshTokenRepository } from '../repositories/RefreshTokenRepository.js'
import { AuthValidator } from '../../validators/AuthValidator.js'
import { AuthController } from '../../controllers/AuthController.js'
import { prisma } from '../../lib/database.js'

class ApplicationContainer {
  private static instance: Container | null = null
  private static testMode = false

  /**
   * Get container instance (production mode)
   */
  static getInstance(): Container {
    if (!ApplicationContainer.instance) {
      ApplicationContainer.instance = ApplicationContainer.createContainer()
    }
    return ApplicationContainer.instance
  }

  /**
   * Get container instance for testing
   * Allows mock bindings to be injected
   */
  static getTestInstance(): Container {
    ApplicationContainer.testMode = true
    const container = ApplicationContainer.createContainer()
    return container
  }

  /**
   * Reset container instance (useful for testing)
   */
  static reset(): void {
    ApplicationContainer.instance = null
    ApplicationContainer.testMode = false
  }

  /**
   * Create and configure container
   */
  private static createContainer(): Container {
    const container = new Container({
      defaultScope: 'Singleton',
    })

    // Bind services to their implementations
    ApplicationContainer.bindServices(container)

    return container
  }

  /**
   * Bind all services to their implementations
   */
  private static bindServices(container: Container): void {
    // Database
    container.bind(TYPES.PrismaClient).toConstantValue(prisma)

    // Authentication services - Real implementations
    container.bind(TYPES.UserRepository).to(UserRepository).inSingletonScope()
    container.bind(TYPES.RefreshTokenRepository).to(RefreshTokenRepository).inSingletonScope()
    container.bind(TYPES.AuthService).to(AuthService).inSingletonScope()
    container.bind(TYPES.AuthValidator).to(AuthValidator).inSingletonScope()
    container.bind(TYPES.AuthController).to(AuthController).inSingletonScope()

    // Bind mock services for remaining service types
    // This allows gradual migration to DI
    container
      .bind(TYPES.YahooFinanceService)
      .toConstantValue(createMockService(TYPES.YahooFinanceService))
    container
      .bind(TYPES.IndicatorCalculationService)
      .toConstantValue(createMockService(TYPES.IndicatorCalculationService))
    container.bind(TYPES.LoggerService).toConstantValue(createMockService(TYPES.LoggerService))
    container.bind(TYPES.CacheService).toConstantValue(createMockService(TYPES.CacheService))
    container
      .bind(TYPES.WebSocketService)
      .toConstantValue(createMockService(TYPES.WebSocketService))
    container.bind(TYPES.DatabaseService).toConstantValue(createMockService(TYPES.DatabaseService))
    container
      .bind(TYPES.AuthorizationService)
      .toConstantValue(createMockService(TYPES.AuthorizationService))
    container
      .bind(TYPES.DrawingCleanupService)
      .toConstantValue(createMockService(TYPES.DrawingCleanupService))
  }

  /**
   * Bind a service dynamically
   */
  static bindService<T>(
    container: Container,
    serviceIdentifier: symbol,
    implementation: new (...args: any[]) => T
  ): void {
    if (!container.isBound(serviceIdentifier)) {
      container.bind<T>(serviceIdentifier).to(implementation).inSingletonScope()
    }
  }

  /**
   * Get service with lazy binding
   */
  static getServiceWithLazyBinding<T>(
    container: Container,
    serviceIdentifier: symbol,
    implementation?: new (...args: any[]) => T
  ): T {
    if (!container.isBound(serviceIdentifier) && implementation) {
      ApplicationContainer.bindService(container, serviceIdentifier, implementation)
    }
    return container.get<T>(serviceIdentifier)
  }

  /**
   * Check if running in test mode
   */
  static isTestMode(): boolean {
    return ApplicationContainer.testMode
  }
}

// Export container instance for global use
export { ApplicationContainer }

// Convenience function to get services
export function getService<T>(serviceIdentifier: symbol): T {
  const container = ApplicationContainer.getInstance()
  return container.get<T>(serviceIdentifier)
}

function createMockService(serviceIdentifier: symbol): any {
  if (serviceIdentifier === TYPES.YahooFinanceService) {
    return {
      getQuote: async () => null,
      getMultipleQuotes: async () => [],
      getCandles: async () => ({
        c: [],
        h: [],
        l: [],
        o: [],
        s: 'ok',
        t: [],
        v: [],
      }),
      getCandlesWithResolution: async () => ({
        c: [],
        h: [],
        l: [],
        o: [],
        s: 'ok',
        t: [],
        v: [],
      }),
      searchSymbols: async () => [],
      getNews: async () => [],
      getCategoryNews: async () => [],
    }
  }

  if (serviceIdentifier === TYPES.IndicatorCalculationService) {
    return {
      calculateSMA: () => [],
      calculateEMA: () => [],
      calculateRSI: () => [],
      calculateMACD: () => ({
        macd: [],
        signal: [],
        histogram: [],
      }),
      calculateBollingerBands: () => ({
        upper2: [],
        upper1: [],
        middle: [],
        lower1: [],
        lower2: [],
      }),
      calculateIndicator: () => ({
        type: 'test',
        name: 'test',
        parameters: {},
        values: [],
      }),
    }
  }

  if (serviceIdentifier === TYPES.LoggerService) {
    return {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      fatal: () => {},
      auth: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      api: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      database: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      websocket: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      security: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      performance: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      business: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      system: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
      audit: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    }
  }

  if (serviceIdentifier === TYPES.CacheService) {
    return {
      get: async () => null,
      set: async () => {},
      has: async () => false,
      delete: async () => false,
      clear: async () => {},
      getStats: () => ({ hits: 0, misses: 0, keys: 0, hitRate: 0 }),
    }
  }

  if (serviceIdentifier === TYPES.WebSocketService) {
    return {
      broadcast: () => {},
      broadcastToUser: () => {},
      sendToClient: () => {},
      getConnectedClientsCount: () => 0,
      getConnectedUserIds: () => [],
      isUserConnected: () => false,
    }
  }

  if (serviceIdentifier === TYPES.DatabaseService) {
    return {
      isHealthy: async () => true,
      ping: async () => true,
    }
  }

  if (serviceIdentifier === TYPES.AuthorizationService) {
    return {
      hasPermission: async () => true,
      hasRole: async () => true,
      getUserPermissions: async () => [],
      getUserRoles: async () => [],
    }
  }

  if (serviceIdentifier === TYPES.DrawingCleanupService) {
    return {
      cleanupOrphanedDrawings: async () => {},
      cleanupExpiredDrawings: async () => {},
      getCleanupStats: async () => ({
        orphanedCount: 0,
        expiredCount: 0,
        lastCleanup: new Date(),
      }),
    }
  }

  if (serviceIdentifier === TYPES.AuthService) {
    return {
      register: async () => ({ user: {}, token: '', refreshToken: '' }),
      login: async () => ({ user: {}, token: '', refreshToken: '' }),
      logout: async () => {},
      refreshToken: async () => ({ user: {}, token: '' }),
      changePassword: async () => {},
      updateProfile: async () => ({}),
      forgotPassword: async () => {},
      resetPassword: async () => {},
      getCurrentUser: async () => ({}),
    }
  }

  if (serviceIdentifier === TYPES.UserRepository) {
    return {
      findById: async () => null,
      findByEmail: async () => null,
      findByUsername: async () => null,
      findByResetToken: async () => null,
      create: async (user: any) => user,
      update: async (user: any) => user,
      delete: async () => {},
      findAll: async () => [],
      existsByEmail: async () => false,
      count: async () => 0,
    }
  }

  if (serviceIdentifier === TYPES.RefreshTokenRepository) {
    return {
      findByToken: async () => null,
      create: async (token: any) => token,
      update: async (id: string, data: any) => data,
      deleteByToken: async () => {},
      deleteByUserId: async () => {},
      findByUserId: async () => [],
      deleteExpired: async () => {},
    }
  }

  return null
}

// Export the default container instance
export const container = ApplicationContainer.getInstance()
