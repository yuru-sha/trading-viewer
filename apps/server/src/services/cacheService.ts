import { getDatabaseService } from './databaseService'
import { NormalizedSymbol, NormalizedQuote, NormalizedCandleResponse } from '@trading-viewer/shared'

export interface ICacheService {
  // Symbol caching
  getSymbol(symbol: string): Promise<NormalizedSymbol | null>
  setSymbol(symbol: string, data: NormalizedSymbol): Promise<void>
  deleteSymbol(symbol: string): Promise<void>

  // Quote caching
  getQuote(symbol: string): Promise<NormalizedQuote | null>
  setQuote(symbol: string, data: NormalizedQuote, ttl?: number): Promise<void>
  deleteQuote(symbol: string): Promise<void>

  // Candle data caching
  getCandleData(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<NormalizedCandleResponse | null>
  setCandleData(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
    data: NormalizedCandleResponse,
    ttl?: number
  ): Promise<void>
  deleteCandleData(symbol: string, resolution?: string): Promise<void>

  // Cache invalidation
  invalidateSymbol(symbol: string): Promise<void>
  invalidateAll(): Promise<void>

  // Cache statistics
  getStats(): Promise<CacheStats>
}

export interface CacheStats {
  symbolsCount: number
  quotesCount: number
  candleDataCount: number
  memoryUsage?: number
}

// In-memory cache implementation
export class MemoryCacheService implements ICacheService {
  private symbolCache = new Map<string, NormalizedSymbol>()
  private quoteCache = new Map<string, { data: NormalizedQuote; expires: number }>()
  private candleCache = new Map<string, { data: NormalizedCandleResponse; expires: number }>()

  private createCandleKey(symbol: string, resolution: string, from: number, to: number): string {
    return `${symbol}:${resolution}:${from}:${to}`
  }

  async getSymbol(symbol: string): Promise<NormalizedSymbol | null> {
    const cached = this.symbolCache.get(symbol)
    if (cached) {
      return cached
    }

    // Fallback to database
    const dbService = getDatabaseService()
    const dbSymbol = await dbService.symbols.findBySymbol(symbol)
    if (dbSymbol) {
      const normalized: NormalizedSymbol = {
        symbol: dbSymbol.symbol,
        description: dbSymbol.description,
        displaySymbol: dbSymbol.displaySymbol,
        type: dbSymbol.type,
        currency: 'USD', // Default currency
      }
      await this.setSymbol(symbol, normalized)
      return normalized
    }

    return null
  }

  async setSymbol(symbol: string, data: NormalizedSymbol): Promise<void> {
    this.symbolCache.set(symbol, data)

    // Also save to database for persistence
    const dbService = getDatabaseService()
    await dbService.symbols.upsertBySymbol({
      symbol: data.symbol,
      description: data.description,
      displaySymbol: data.displaySymbol,
      type: data.type,
    })
  }

  async deleteSymbol(symbol: string): Promise<void> {
    this.symbolCache.delete(symbol)
  }

  async getQuote(symbol: string): Promise<NormalizedQuote | null> {
    const cached = this.quoteCache.get(symbol)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }

    if (cached) {
      this.quoteCache.delete(symbol)
    }

    return null
  }

  async setQuote(symbol: string, data: NormalizedQuote, ttl: number = 30000): Promise<void> {
    this.quoteCache.set(symbol, {
      data,
      expires: Date.now() + ttl,
    })
  }

  async deleteQuote(symbol: string): Promise<void> {
    this.quoteCache.delete(symbol)
  }

  async getCandleData(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<NormalizedCandleResponse | null> {
    const key = this.createCandleKey(symbol, resolution, from, to)
    const cached = this.candleCache.get(key)

    if (cached && cached.expires > Date.now()) {
      return cached.data
    }

    if (cached) {
      this.candleCache.delete(key)
    }

    // Fallback to database for historical data
    const dbService = getDatabaseService()
    const dbCandles = await dbService.candles.findBySymbolAndTimeRange(symbol, from, to)

    if (dbCandles && dbCandles.length > 0) {
      const normalized: any = {
        symbol,
        resolution,
        data: dbCandles.map(candle => ({
          timestamp: candle.timestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume || 0,
        })),
      }

      await this.setCandleData(symbol, resolution, from, to, normalized, 300000) // 5 minutes TTL
      return normalized
    }

    return null
  }

  async setCandleData(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
    data: NormalizedCandleResponse,
    ttl: number = 300000
  ): Promise<void> {
    const key = this.createCandleKey(symbol, resolution, from, to)
    this.candleCache.set(key, {
      data,
      expires: Date.now() + ttl,
    })

    // Store candles in database for persistence
    const dbService = getDatabaseService()
    const candlesToStore = (data as any).data.map(candle => ({
      symbol,
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }))

    await dbService.candles.bulkCreate(candlesToStore)
  }

  async deleteCandleData(symbol: string, resolution?: string): Promise<void> {
    if (resolution) {
      // Delete specific resolution
      const keysToDelete = Array.from(this.candleCache.keys()).filter(key =>
        key.startsWith(`${symbol}:${resolution}:`)
      )
      keysToDelete.forEach(key => this.candleCache.delete(key))
    } else {
      // Delete all resolutions for symbol
      const keysToDelete = Array.from(this.candleCache.keys()).filter(key =>
        key.startsWith(`${symbol}:`)
      )
      keysToDelete.forEach(key => this.candleCache.delete(key))
    }
  }

  async invalidateSymbol(symbol: string): Promise<void> {
    await this.deleteSymbol(symbol)
    await this.deleteQuote(symbol)
    await this.deleteCandleData(symbol)
  }

  async invalidateAll(): Promise<void> {
    this.symbolCache.clear()
    this.quoteCache.clear()
    this.candleCache.clear()
  }

  async getStats(): Promise<CacheStats> {
    // Clean expired entries first
    const now = Date.now()

    // Clean expired quotes
    for (const [key, value] of this.quoteCache.entries()) {
      if (value.expires <= now) {
        this.quoteCache.delete(key)
      }
    }

    // Clean expired candle data
    for (const [key, value] of this.candleCache.entries()) {
      if (value.expires <= now) {
        this.candleCache.delete(key)
      }
    }

    return {
      symbolsCount: this.symbolCache.size,
      quotesCount: this.quoteCache.size,
      candleDataCount: this.candleCache.size,
      memoryUsage: process.memoryUsage().heapUsed,
    }
  }
}

// Singleton instance
let cacheService: ICacheService | null = null

export function getCacheService(): ICacheService {
  if (!cacheService) {
    cacheService = new MemoryCacheService()
  }
  return cacheService
}

export function resetCacheService(): void {
  cacheService = null
}
