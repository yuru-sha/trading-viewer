import type {
  NormalizedSymbol,
  NormalizedQuote,
  NormalizedCandleResponse,
} from '@trading-viewer/shared'
import { log } from '../infrastructure/services/logger'

/**
 * Generic Market Data Provider Interface
 * Defines the contract that all market data adapters must implement
 */
export interface IMarketDataProvider {
  /**
   * Search for symbols
   */
  searchSymbols(query: string, limit?: number): Promise<NormalizedSymbol[]>

  /**
   * Get current quote for a symbol
   */
  getQuote(symbol: string): Promise<NormalizedQuote>

  /**
   * Get historical candle data
   */
  getCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<NormalizedCandleResponse>

  /**
   * Get provider name
   */
  getName(): string

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>
}

/**
 * Base Market Data Adapter
 * Provides common functionality for all market data adapters
 */
export abstract class BaseMarketDataAdapter implements IMarketDataProvider {
  protected name: string
  protected baseUrl: string
  protected apiKey?: string
  protected rateLimiter?: any

  constructor(name: string, baseUrl: string, apiKey?: string) {
    this.name = name
    this.baseUrl = baseUrl
    if (apiKey !== undefined) {
      this.apiKey = apiKey
    }
  }

  abstract searchSymbols(query: string, limit?: number): Promise<NormalizedSymbol[]>
  abstract getQuote(symbol: string): Promise<NormalizedQuote>
  abstract getCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<NormalizedCandleResponse>

  getName(): string {
    return this.name
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'HEAD',
        timeout: 5000,
      } as any)
      return response.ok
    } catch {
      return false
    }
  }

  // Common utility methods
  protected validateSymbol(symbol: string): void {
    if (!symbol || symbol.length === 0) {
      log.api.error('Symbol validation failed: Symbol is required')
      throw new Error('Symbol is required')
    }
    if (symbol.length > 10) {
      log.api.error(
        `Symbol validation failed: Symbol is too long (${symbol.length} chars): ${symbol}`
      )
      throw new Error('Symbol is too long')
    }
  }

  protected validateTimeRange(from: number, to: number): void {
    if (from >= to) {
      log.api.error(`Time range validation failed: from (${from}) must be less than to (${to})`)
      throw new Error('Invalid time range: from must be less than to')
    }
    if (to > Date.now() / 1000) {
      log.api.error(
        `Time range validation failed: to (${to}) cannot be in the future (current: ${Date.now() / 1000})`
      )
      throw new Error('Invalid time range: to cannot be in the future')
    }
  }
}

/**
 * Market Data Adapter Factory
 * Creates appropriate adapter based on provider name
 */
/**
 * Market Data Adapter Factory
 * Creates appropriate adapter based on provider name
 */
export class MarketDataAdapterFactory {
  private static adapters: Map<string, new (apiKey: string) => IMarketDataProvider> = new Map()

  static createAdapter(provider: string, apiKey: string): IMarketDataProvider {
    const AdapterClass = this.adapters.get(provider.toLowerCase())

    if (!AdapterClass) {
      log.api.error(`Adapter creation failed: Unsupported market data provider: ${provider}`)
      throw new Error(`Unsupported market data provider: ${provider}`)
    }

    return new AdapterClass(apiKey)
  }

  static getSupportedProviders(): string[] {
    return Array.from(this.adapters.keys())
  }

  static registerAdapter(
    name: string,
    adapterClass: new (apiKey: string) => IMarketDataProvider
  ): void {
    this.adapters.set(name.toLowerCase(), adapterClass)
  }
}

/**
 * Unified Market Data Service - Uses Strategy Pattern with Adapters
 * Provides failover and load balancing across multiple providers
 */
export class UnifiedMarketDataService {
  private primaryAdapter: IMarketDataProvider
  private fallbackAdapters: IMarketDataProvider[]

  constructor(primaryAdapter: IMarketDataProvider, fallbackAdapters: IMarketDataProvider[] = []) {
    this.primaryAdapter = primaryAdapter
    this.fallbackAdapters = fallbackAdapters
  }

  async searchSymbols(query: string, limit?: number): Promise<NormalizedSymbol[]> {
    return this.executeWithFallback(adapter => adapter.searchSymbols(query, limit))
  }

  async getQuote(symbol: string): Promise<NormalizedQuote> {
    return this.executeWithFallback(adapter => adapter.getQuote(symbol))
  }

  async getCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<NormalizedCandleResponse> {
    return this.executeWithFallback(adapter => adapter.getCandles(symbol, resolution, from, to))
  }

  private async executeWithFallback<T>(
    operation: (adapter: IMarketDataProvider) => Promise<T>
  ): Promise<T> {
    // Try primary adapter first
    try {
      const isAvailable = await this.primaryAdapter.isAvailable()
      if (isAvailable) {
        return await operation(this.primaryAdapter)
      }
    } catch (error) {
      log.api.warn(`Primary adapter ${this.primaryAdapter.getName()} failed:`, error)
    }

    // Try fallback adapters
    for (const adapter of this.fallbackAdapters) {
      try {
        const isAvailable = await adapter.isAvailable()
        if (isAvailable) {
          log.api.info(`Using fallback adapter: ${adapter.getName()}`)
          return await operation(adapter)
        }
      } catch (error) {
        log.api.warn(`Fallback adapter ${adapter.getName()} failed:`, error)
      }
    }

    log.api.error('Market data fallback failed: All market data providers are unavailable')
    throw new Error('All market data providers are unavailable')
  }

  getPrimaryProvider(): string {
    return this.primaryAdapter.getName()
  }

  getFallbackProviders(): string[] {
    return this.fallbackAdapters.map(adapter => adapter.getName())
  }
}

export default MarketDataAdapterFactory
