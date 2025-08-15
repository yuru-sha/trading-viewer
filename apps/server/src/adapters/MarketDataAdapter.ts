import type {
  NormalizedSymbol,
  NormalizedQuote,
  NormalizedCandleResponse,
} from '@trading-viewer/shared'

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
    this.apiKey = apiKey
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
      throw new Error('Symbol is required')
    }
    if (symbol.length > 10) {
      throw new Error('Symbol is too long')
    }
  }

  protected validateTimeRange(from: number, to: number): void {
    if (from >= to) {
      throw new Error('Invalid time range: from must be less than to')
    }
    if (to > Date.now() / 1000) {
      throw new Error('Invalid time range: to cannot be in the future')
    }
  }
}


/**
 * Alpha Vantage API Adapter
 * Adapts Alpha Vantage API responses to our normalized format
 */
export class AlphaVantageAdapter extends BaseMarketDataAdapter {
  constructor(apiKey: string) {
    super('Alpha Vantage', 'https://www.alphavantage.co/query', apiKey)
  }

  async searchSymbols(query: string, limit = 10): Promise<NormalizedSymbol[]> {
    this.validateQuery(query)

    const url = `${this.baseUrl}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(
      query
    )}&apikey=${this.apiKey}`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`)
      }

      const data: any = await response.json()
      const matches = data['bestMatches'] || []

      return matches.slice(0, limit).map((item: any) => ({
        symbol: item['1. symbol'],
        description: item['2. name'],
        displaySymbol: item['1. symbol'],
        type: this.mapAlphaVantageType(item['3. type']),
        currency: 'USD',
      }))
    } catch (error) {
      throw new Error(`Failed to search symbols: ${error}`)
    }
  }

  async getQuote(symbol: string): Promise<NormalizedQuote> {
    this.validateSymbol(symbol)

    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`)
      }

      const data: any = await response.json()
      const quote = data['Global Quote']

      if (!quote) {
        throw new Error('No quote data available')
      }

      // Adapt Alpha Vantage response to our format
      const currentPrice = parseFloat(quote['05. price'])
      const change = parseFloat(quote['09. change'])
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''))

      return {
        symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        open: parseFloat(quote['02. open']),
        previousClose: parseFloat(quote['08. previous close']),
        timestamp: Math.floor(Date.now() / 1000), // Alpha Vantage doesn't provide timestamp
      }
    } catch (error) {
      throw new Error(`Failed to get quote: ${error}`)
    }
  }

  async getCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<NormalizedCandleResponse> {
    this.validateSymbol(symbol)
    this.validateTimeRange(from, to)

    const alphaFunction = this.getAlphaVantageFunction(resolution)
    const url = `${this.baseUrl}?function=${alphaFunction}&symbol=${symbol}&apikey=${this.apiKey}`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`)
      }

      const data: any = await response.json()
      const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'))

      if (!timeSeriesKey) {
        return {
          symbol,
          resolution,
          data: [],
          status: 'error' as const,
        }
      }

      const timeSeries = data[timeSeriesKey]
      const candles = this.processAlphaVantageCandles(timeSeries, from, to)

      return candles
    } catch (error) {
      throw new Error(`Failed to get candles: ${error}`)
    }
  }

  private validateQuery(query: string): void {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required')
    }
  }

  private mapAlphaVantageType(type: string): string {
    const typeMap: Record<string, string> = {
      Equity: 'stock',
      ETF: 'etf',
    }
    return typeMap[type] || 'stock'
  }

  private getAlphaVantageFunction(resolution: string): string {
    const functionMap: Record<string, string> = {
      '1': 'TIME_SERIES_INTRADAY',
      '5': 'TIME_SERIES_INTRADAY',
      '15': 'TIME_SERIES_INTRADAY',
      '30': 'TIME_SERIES_INTRADAY',
      '60': 'TIME_SERIES_INTRADAY',
      D: 'TIME_SERIES_DAILY',
      W: 'TIME_SERIES_WEEKLY',
      M: 'TIME_SERIES_MONTHLY',
    }
    return functionMap[resolution] || 'TIME_SERIES_DAILY'
  }

  private processAlphaVantageCandles(
    timeSeries: any,
    from: number,
    to: number
  ): NormalizedCandleResponse {
    const candles: Array<{
      timestamp: number
      open: number
      high: number
      low: number
      close: number
      volume: number
    }> = []

    Object.entries(timeSeries)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([dateString, data]: [string, any]) => {
        const timestamp = Math.floor(new Date(dateString).getTime() / 1000)

        if (timestamp >= from && timestamp <= to) {
          candles.push({
            timestamp,
            open: parseFloat(data['1. open']),
            high: parseFloat(data['2. high']),
            low: parseFloat(data['3. low']),
            close: parseFloat(data['4. close']),
            volume: parseFloat(data['5. volume'] || '0'),
          })
        }
      })

    return {
      symbol: '',
      resolution: '',
      data: candles,
      status: 'ok' as const,
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

  static {
    this.adapters.set('alphavantage', AlphaVantageAdapter)
  }

  static createAdapter(provider: string, apiKey: string): IMarketDataProvider {
    const AdapterClass = this.adapters.get(provider.toLowerCase())

    if (!AdapterClass) {
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
      console.warn(`Primary adapter ${this.primaryAdapter.getName()} failed:`, error)
    }

    // Try fallback adapters
    for (const adapter of this.fallbackAdapters) {
      try {
        const isAvailable = await adapter.isAvailable()
        if (isAvailable) {
          console.info(`Using fallback adapter: ${adapter.getName()}`)
          return await operation(adapter)
        }
      } catch (error) {
        console.warn(`Fallback adapter ${adapter.getName()} failed:`, error)
      }
    }

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
