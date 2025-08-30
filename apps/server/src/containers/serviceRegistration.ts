import { container, registerService } from './ServiceContainer'

/**
 * Service registration configuration
 * This file configures the DI container with all application services
 */

// Service name constants to avoid magic strings
export const SERVICE_NAMES = {
  // Database and ORM
  PRISMA_CLIENT: 'PrismaClient',
  DATABASE_SERVICE: 'DatabaseService',

  // External API adapters
  MARKET_DATA_ADAPTER: 'MarketDataAdapter',

  // Core business services
  SYMBOL_SERVICE: 'SymbolService',
  QUOTE_SERVICE: 'QuoteService',
  CANDLE_DATA_SERVICE: 'CandleDataService',
  USER_PREFERENCES_SERVICE: 'UserPreferencesService',
  DATA_MANAGEMENT_SERVICE: 'DataManagementService',

  // Caching services
  CACHE_SERVICE: 'CacheService',
  REDIS_CLIENT: 'RedisClient',

  // WebSocket services
  WEBSOCKET_SERVICE: 'WebSocketService',

  // Security services
  ENCRYPTION_SERVICE: 'EncryptionService',
  RATE_LIMIT_SERVICE: 'RateLimitService',

  // Repositories
  SYMBOL_REPOSITORY: 'SymbolRepository',
  CANDLE_REPOSITORY: 'CandleRepository',
  USER_PREFERENCES_REPOSITORY: 'UserPreferencesRepository',
  USER_INDICATOR_REPOSITORY: 'UserIndicatorRepository',
  MARKET_DATA_REPOSITORY: 'MarketDataRepository',
  PRISMA_MARKET_DATA_REPOSITORY: 'PrismaMarketDataRepository',

  // Market Data Provider
  MARKET_DATA_PROVIDER: 'MarketDataProvider',

  // Utilities
  LOGGER: 'Logger',
  CONFIG: 'Config',
} as const

/**
 * Register all application services
 */
export function registerApplicationServices(): void {
  // Configuration services (Singleton)
  registerService.singleton(SERVICE_NAMES.CONFIG, () => {
    const { Environment } = require('../config/environment')
    return new Environment()
  })

  registerService.singleton(SERVICE_NAMES.LOGGER, () => {
    const { Logger } = require('../utils/logger')
    return new Logger()
  })

  // Database services (Singleton)
  registerService.singleton(SERVICE_NAMES.PRISMA_CLIENT, () => {
    const { PrismaClient } = require('@prisma/client')
    return new PrismaClient()
  })

  registerService.singleton(
    SERVICE_NAMES.DATABASE_SERVICE,
    prisma => {
      const { DatabaseService } = require('../services/databaseService')
      return new DatabaseService(prisma)
    },
    [SERVICE_NAMES.PRISMA_CLIENT]
  )

  // Repository services (Singleton - they maintain connections)
  registerService.singleton(
    SERVICE_NAMES.SYMBOL_REPOSITORY,
    prisma => {
      const { SymbolRepository } = require('../repositories/SymbolRepository')
      return new SymbolRepository(prisma)
    },
    [SERVICE_NAMES.PRISMA_CLIENT]
  )

  registerService.singleton(
    SERVICE_NAMES.CANDLE_REPOSITORY,
    prisma => {
      const { CandleRepository } = require('../repositories/CandleRepository')
      return new CandleRepository(prisma)
    },
    [SERVICE_NAMES.PRISMA_CLIENT]
  )

  registerService.singleton(
    SERVICE_NAMES.USER_PREFERENCES_REPOSITORY,
    prisma => {
      const { UserPreferencesRepository } = require('../repositories/UserPreferencesRepository')
      return new UserPreferencesRepository(prisma)
    },
    [SERVICE_NAMES.PRISMA_CLIENT]
  )

  registerService.singleton(
    SERVICE_NAMES.USER_INDICATOR_REPOSITORY,
    prisma => {
      const { UserIndicatorRepository } = require('../repositories/UserIndicatorRepository')
      return new UserIndicatorRepository(prisma)
    },
    [SERVICE_NAMES.PRISMA_CLIENT]
  )

  // Market Data Provider (Singleton)
  registerService.singleton(SERVICE_NAMES.MARKET_DATA_PROVIDER, () => {
    const {
      RefactoredYahooFinanceProvider,
    } = require('../infrastructure/providers/RefactoredYahooFinanceProvider')
    return new RefactoredYahooFinanceProvider({
      rateLimit: {
        requestsPerMinute: 60,
        burstSize: 10,
      },
      cache: {
        ttlSeconds: 30,
        maxEntries: 1000,
      },
      timeout: {
        connectTimeoutMs: 5000,
        readTimeoutMs: 10000,
      },
    })
  })

  // Prisma Market Data Repository (Singleton)
  registerService.singleton(
    SERVICE_NAMES.PRISMA_MARKET_DATA_REPOSITORY,
    prisma => {
      const {
        PrismaMarketDataRepository,
      } = require('../infrastructure/repositories/PrismaMarketDataRepository')
      return new PrismaMarketDataRepository(prisma)
    },
    [SERVICE_NAMES.PRISMA_CLIENT]
  )

  // Enhanced Market Data Repository (Singleton)
  registerService.singleton(
    SERVICE_NAMES.MARKET_DATA_REPOSITORY,
    (prisma, provider) => {
      const { MarketDataRepository } = require('../repositories/MarketDataRepository')
      return new MarketDataRepository(prisma, provider)
    },
    [SERVICE_NAMES.PRISMA_CLIENT, SERVICE_NAMES.MARKET_DATA_PROVIDER]
  )

  // Cache services (Singleton)
  registerService.singleton(
    SERVICE_NAMES.CACHE_SERVICE,
    _config => {
      const { getCacheService } = require('../services/cacheService')
      return getCacheService()
    },
    [SERVICE_NAMES.CONFIG]
  )

  registerService.singleton(
    SERVICE_NAMES.MARKET_DATA_ADAPTER,
    _config => {
      const { getYahooFinanceService } = require('../services/yahooFinanceService')
      return getYahooFinanceService()
    },
    [SERVICE_NAMES.CONFIG]
  )

  // Business logic services (Scoped - per request/operation)
  registerService.scoped(
    SERVICE_NAMES.SYMBOL_SERVICE,
    (symbolRepo, marketDataAdapter, cacheService, logger) => {
      // Example implementation - actual service classes would be imported
      return {
        searchSymbols: async (query: string, limit?: number) => {
          logger.info(`Searching symbols for query: ${query}`)
          // Implementation would use repositories and adapters
          return marketDataAdapter.searchSymbols(query, limit)
        },
        getSymbol: async (symbol: string) => {
          const cached = await cacheService.getSymbol(symbol)
          if (cached) return cached

          return symbolRepo.findBySymbol(symbol)
        },
        syncSymbol: async (symbol: string) => {
          const externalData = await marketDataAdapter.searchSymbols(symbol, 1)
          if (externalData.length > 0) {
            return symbolRepo.upsertBySymbol(externalData[0])
          }
          throw new Error(`Symbol ${symbol} not found`)
        },
        validateSymbol: (symbol: string) => {
          return /^[A-Z]{1,5}$/.test(symbol)
        },
        getMultipleSymbols: async (symbols: string[]) => {
          return Promise.all(symbols.map(s => symbolRepo.findBySymbol(s)))
        },
      }
    },
    [
      SERVICE_NAMES.SYMBOL_REPOSITORY,
      SERVICE_NAMES.MARKET_DATA_ADAPTER,
      SERVICE_NAMES.CACHE_SERVICE,
      SERVICE_NAMES.LOGGER,
    ]
  )

  registerService.scoped(
    SERVICE_NAMES.QUOTE_SERVICE,
    (marketDataAdapter, cacheService, _logger) => {
      return {
        getQuote: async (symbol: string, useCache: boolean = true) => {
          if (useCache) {
            const cached = await cacheService.getQuote(symbol)
            if (cached) return cached
          }

          const quote = await marketDataAdapter.getQuote(symbol)
          await cacheService.setQuote(symbol, quote)
          return quote
        },
        refreshQuote: async (symbol: string) => {
          const quote = await marketDataAdapter.getQuote(symbol)
          await cacheService.setQuote(symbol, quote)
          return quote
        },
        getMultipleQuotes: async (symbols: string[], _useCache: boolean = true) => {
          return Promise.all(symbols.map(s => marketDataAdapter.getQuote(s)))
        },
        subscribeToQuote: (_symbol: string, _callback: (quote: any) => void) => {
          // WebSocket subscription logic
          return () => {} // Unsubscribe function
        },
        isQuoteStale: async (_symbol: string) => {
          // Check if cached quote is older than threshold
          return false // Simplified implementation
        },
      }
    },
    [SERVICE_NAMES.MARKET_DATA_ADAPTER, SERVICE_NAMES.CACHE_SERVICE, SERVICE_NAMES.LOGGER]
  )

  registerService.scoped(
    SERVICE_NAMES.CANDLE_DATA_SERVICE,
    (candleRepo, marketDataAdapter, cacheService, _logger) => {
      return {
        getCandleData: async (
          symbol: string,
          resolution: string,
          from: number,
          to: number,
          useCache: boolean = true
        ) => {
          if (useCache) {
            const cached = await cacheService.getCandleData(symbol, resolution, from, to)
            if (cached) return cached
          }

          const data = await marketDataAdapter.getCandles(symbol, resolution, from, to)
          await cacheService.setCandleData(symbol, resolution, from, to, data)
          return data
        },
        refreshCandleData: async (symbol: string, resolution: string, from: number, to: number) => {
          const data = await marketDataAdapter.getCandles(symbol, resolution, from, to)
          await cacheService.setCandleData(symbol, resolution, from, to, data)
          return data
        },
        getLatestCandles: async (symbol: string, resolution: string, count: number) => {
          const to = Math.floor(Date.now() / 1000)
          const timeframes: Record<string, number> = {
            '1': 60,
            '5': 300,
            '15': 900,
            '30': 1800,
            '60': 3600,
            D: 86400,
            W: 604800,
            M: 2592000,
          }
          const from = to - count * (timeframes[resolution] || 3600)
          return marketDataAdapter.getCandles(symbol, resolution, from, to)
        },
        cleanupOldData: async (symbol: string, beforeTimestamp: number) => {
          return candleRepo.deleteOldData(symbol, beforeTimestamp)
        },
        isDataAvailable: async (symbol: string, resolution: string, from: number, to: number) => {
          const data = await cacheService.getCandleData(symbol, resolution, from, to)
          return data !== null && data.t.length > 0
        },
      }
    },
    [
      SERVICE_NAMES.CANDLE_REPOSITORY,
      SERVICE_NAMES.MARKET_DATA_ADAPTER,
      SERVICE_NAMES.CACHE_SERVICE,
      SERVICE_NAMES.LOGGER,
    ]
  )

  // WebSocket services (Singleton - maintain connections)
  registerService.singleton(
    SERVICE_NAMES.WEBSOCKET_SERVICE,
    _logger => {
      const { getWebSocketService } = require('../services/websocketService')
      return getWebSocketService()
    },
    [SERVICE_NAMES.LOGGER]
  )
}

/**
 * Helper function to get service from container
 */
export function getService<T>(serviceName: string, scopeId?: string): T {
  return container.resolve<T>(serviceName, scopeId)
}

/**
 * Helper function to create request scope
 */
export function createRequestScope() {
  return container.createScope()
}

/**
 * Express middleware for request scoping
 */
export function requestScopingMiddleware() {
  return (req: any, res: any, next: any) => {
    const scope = createRequestScope()
    req.serviceScope = scope.scopeId

    // Clean up scope when response finishes
    res.on('finish', () => {
      container.disposeScope(scope.scopeId)
    })

    next()
  }
}

/**
 * Initialize the DI container with all services
 * Call this at application startup
 */
export function initializeServices(): void {
  console.log('Initializing dependency injection container...')

  try {
    registerApplicationServices()
    console.log('✅ All services registered successfully')
    console.log(`📦 Registered services: ${container.getRegisteredServices().join(', ')}`)
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
    throw error
  }
}

export default container
