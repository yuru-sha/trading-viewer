/**
 * Dependency Injection System
 *
 * Evidence-First DI Architecture:
 * - Lazy service binding to avoid circular dependencies
 * - Type-safe service resolution
 * - Test-friendly mock injection
 * - Clear separation of concerns
 */

import 'reflect-metadata'

// Export core DI components
export { TYPES } from './types.js'
export { ApplicationContainer, getService, container } from './container.js'
export type {
  IYahooFinanceService,
  IIndicatorCalculationService,
  IWebSocketService,
  ILoggerService,
  ICacheService,
  IDatabaseService,
  IAuthorizationService,
  IDrawingCleanupService,
} from './interfaces.js'

// Export testing utilities
export {
  TestContainerManager,
  createMockedTestContainer,
  setupTestContainer,
  teardownTestContainer,
  createMockYahooFinanceService,
  createMockIndicatorCalculationService,
  createMockWebSocketService,
  createMockLoggerService,
  createMockCacheService,
  createMockDatabaseService,
  createMockAuthorizationService,
  createMockDrawingCleanupService,
} from './testing.js'

// Service factory functions for gradual migration
export function createYahooFinanceService(): any {
  // During migration, this can return the original service
  // Later, it will use the DI container
  return null // Placeholder
}

export function createIndicatorCalculationService(): any {
  return null // Placeholder
}

// Initialization function for DI system
export function initializeDI(): void {
  // Initialize reflect-metadata and container
  // This should be called early in the application startup
}

/**
 * Service Locator Pattern (for gradual migration)
 *
 * This provides a bridge during the migration from direct instantiation
 * to full dependency injection. Use sparingly and prefer constructor injection.
 */
class ServiceLocator {
  private static services = new Map<symbol, any>()

  static register<T>(serviceType: symbol, instance: T): void {
    ServiceLocator.services.set(serviceType, instance)
  }

  static get<T>(serviceType: symbol): T {
    const service = ServiceLocator.services.get(serviceType)
    if (!service) {
      throw new Error(`Service ${serviceType.toString()} not registered`)
    }
    return service
  }

  static clear(): void {
    ServiceLocator.services.clear()
  }
}

export { ServiceLocator }
