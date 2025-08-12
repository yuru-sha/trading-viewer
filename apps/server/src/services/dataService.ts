import { getDatabaseService } from './databaseService'
import { getCacheService } from './cacheService'
import { getFinnhubService } from './finnhubService'
import {
  NormalizedSymbol,
  NormalizedQuote,
  NormalizedCandleResponse,
  UserIndicators,
} from '@trading-viewer/shared'

export interface IDataService {
  // Symbol management with deduplication
  searchSymbols(query: string, limit?: number): Promise<NormalizedSymbol[]>
  getSymbol(symbol: string): Promise<NormalizedSymbol | null>
  syncSymbol(symbol: string): Promise<NormalizedSymbol>

  // Quote management with caching
  getQuote(symbol: string, useCache?: boolean): Promise<NormalizedQuote>
  refreshQuote(symbol: string): Promise<NormalizedQuote>

  // Candle data management with caching and deduplication
  getCandleData(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
    useCache?: boolean
  ): Promise<NormalizedCandleResponse>
  refreshCandleData(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<NormalizedCandleResponse>

  // User preferences management
  getUserPreferences(userId: string): Promise<UserPreferences | null>
  updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences>
  getUserIndicators(userId: string): Promise<UserIndicators>
  updateUserIndicators(userId: string, indicators: UserIndicators): Promise<void>
  addUserIndicator(userId: string, indicator: UserIndicators[0]): Promise<void>
  removeUserIndicator(userId: string, indicatorName: string): Promise<void>

  // Data management
  cleanupOldData(symbol: string, beforeTimestamp: number): Promise<number>
  invalidateCache(symbol?: string): Promise<void>
  getDataStats(): Promise<DataStats>
}

export interface UserPreferences {
  userId: string
  theme: string
  chartType: string
  timeframe: string
  indicators: UserIndicators
}

export interface DataStats {
  symbolsInDatabase: number
  candlesInDatabase: number
  userPreferencesCount: number
  cacheStats: {
    symbolsCount: number
    quotesCount: number
    candleDataCount: number
    memoryUsage?: number
  }
}

export class DataService implements IDataService {
  private dbService = getDatabaseService()
  private cacheService = getCacheService()
  private finnhubService = getFinnhubService()

  async searchSymbols(query: string, limit: number = 50): Promise<NormalizedSymbol[]> {
    // First, try to get from database cache
    const cachedSymbols = await this.dbService.symbols.search(query, limit)

    if (cachedSymbols && cachedSymbols.length > 0) {
      return cachedSymbols.map(symbol => ({
        symbol: symbol.symbol,
        description: symbol.description,
        displaySymbol: symbol.displaySymbol,
        type: symbol.type,
        currency: 'USD',
      }))
    }

    // If not found in cache, fetch from Finnhub and store
    const symbols = await this.finnhubService.searchSymbols({ q: query, limit })

    // Store in database for future searches (deduplication handled by upsert)
    for (const symbol of symbols) {
      await this.cacheService.setSymbol(symbol.symbol, symbol)
    }

    return symbols
  }

  async getSymbol(symbol: string): Promise<NormalizedSymbol | null> {
    return await this.cacheService.getSymbol(symbol)
  }

  async syncSymbol(symbol: string): Promise<NormalizedSymbol> {
    // Force refresh from API
    const symbols = await this.finnhubService.searchSymbols({ q: symbol, limit: 1 })

    if (!symbols || symbols.length === 0) {
      throw new Error(`Symbol ${symbol} not found`)
    }

    const symbolData = symbols[0]
    await this.cacheService.setSymbol(symbol, symbolData)

    return symbolData
  }

  async getQuote(symbol: string, useCache: boolean = true): Promise<NormalizedQuote> {
    if (useCache) {
      const cachedQuote = await this.cacheService.getQuote(symbol)
      if (cachedQuote) {
        return cachedQuote
      }
    }

    // Fetch fresh quote from API
    const quote = await this.finnhubService.getQuote({ symbol })
    await this.cacheService.setQuote(symbol, quote)

    return quote
  }

  async refreshQuote(symbol: string): Promise<NormalizedQuote> {
    return await this.getQuote(symbol, false)
  }

  async getCandleData(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
    useCache: boolean = true
  ): Promise<NormalizedCandleResponse> {
    if (useCache) {
      const cachedData = await this.cacheService.getCandleData(symbol, resolution, from, to)
      if (cachedData) {
        return cachedData
      }
    }

    // Fetch fresh data from API
    const candleData = await this.finnhubService.getCandleData({
      symbol,
      resolution,
      from,
      to,
    })

    await this.cacheService.setCandleData(symbol, resolution, from, to, candleData)

    return candleData
  }

  async refreshCandleData(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<NormalizedCandleResponse> {
    return await this.getCandleData(symbol, resolution, from, to, false)
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const prefs = await this.dbService.userPreferences.findByUserId(userId)

    if (!prefs) {
      return null
    }

    const indicators = await this.dbService.userPreferences.getIndicators(userId)

    return {
      userId: prefs.userId,
      theme: prefs.theme,
      chartType: prefs.chartType,
      timeframe: prefs.timeframe,
      indicators,
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const updateData: any = {}

    if (preferences.theme) updateData.theme = preferences.theme
    if (preferences.chartType) updateData.chartType = preferences.chartType
    if (preferences.timeframe) updateData.timeframe = preferences.timeframe
    if (preferences.indicators) {
      updateData.indicators = JSON.stringify(preferences.indicators)
    }

    const updatedPrefs = await this.dbService.userPreferences.upsertByUserId(userId, updateData)

    return (await this.getUserPreferences(userId)) as UserPreferences
  }

  async getUserIndicators(userId: string): Promise<UserIndicators> {
    return await this.dbService.userPreferences.getIndicators(userId)
  }

  async updateUserIndicators(userId: string, indicators: UserIndicators): Promise<void> {
    await this.dbService.userPreferences.updateIndicators(userId, indicators)
  }

  async addUserIndicator(userId: string, indicator: UserIndicators[0]): Promise<void> {
    await this.dbService.userPreferences.addIndicator(userId, indicator)
  }

  async removeUserIndicator(userId: string, indicatorName: string): Promise<void> {
    await this.dbService.userPreferences.removeIndicator(userId, indicatorName)
  }

  async cleanupOldData(symbol: string, beforeTimestamp: number): Promise<number> {
    // Clean up old candle data from database
    const deletedCount = await this.dbService.candles.deleteOldData(symbol, beforeTimestamp)

    // Invalidate cache for this symbol
    await this.cacheService.invalidateSymbol(symbol)

    return deletedCount
  }

  async invalidateCache(symbol?: string): Promise<void> {
    if (symbol) {
      await this.cacheService.invalidateSymbol(symbol)
    } else {
      await this.cacheService.invalidateAll()
    }
  }

  async getDataStats(): Promise<DataStats> {
    const [symbolsCount, candlesCount, userPreferencesCount, cacheStats] = await Promise.all([
      this.dbService.symbols.count(),
      this.dbService.candles.count(),
      this.dbService.userPreferences.count(),
      this.cacheService.getStats(),
    ])

    return {
      symbolsInDatabase: symbolsCount,
      candlesInDatabase: candlesCount,
      userPreferencesCount,
      cacheStats,
    }
  }
}

// Singleton instance
let dataService: IDataService | null = null

export function getDataService(): IDataService {
  if (!dataService) {
    dataService = new DataService()
  }
  return dataService
}

export function resetDataService(): void {
  dataService = null
}
