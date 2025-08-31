/**
 * Service Identifiers for Dependency Injection
 *
 * Evidence-First Design Principles:
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: High-level modules don't depend on low-level modules
 * - Type Safety: Strong typing with TypeScript
 */

// Core Service Identifiers
export const TYPES = {
  // Application Services
  YahooFinanceService: Symbol.for('YahooFinanceService'),
  IndicatorCalculationService: Symbol.for('IndicatorCalculationService'),
  WebSocketService: Symbol.for('WebSocketService'),
  DrawingCleanupService: Symbol.for('DrawingCleanupService'),

  // Infrastructure Services
  LoggerService: Symbol.for('LoggerService'),
  CacheService: Symbol.for('CacheService'),
  DatabaseService: Symbol.for('DatabaseService'),

  // Security Services
  AuthorizationService: Symbol.for('AuthorizationService'),

  // Configuration
  Config: Symbol.for('Config'),
} as const

// Type for service identifiers
export type ServiceType = (typeof TYPES)[keyof typeof TYPES]
