/**
 * リファクタリング済み Yahoo Finance プロバイダー
 * IMarketDataProvider インターフェースの完全実装
 */

import yahooFinance from 'yahoo-finance2'
import {
  IMarketDataProvider,
  QuoteResponse,
  HistoricalDataResponse,
  SymbolSearchResult,
  NewsItemResponse,
  MarketDataProviderConfig,
  MarketDataProviderError,
  RateLimitExceededError,
  SymbolNotFoundError,
  DataUnavailableError,
} from '../../domain/interfaces/IMarketDataProvider'
import { log } from '../../infrastructure/services/logger'

export class RefactoredYahooFinanceProvider implements IMarketDataProvider {
  private cache = new Map<string, { data: QuoteResponse; timestamp: number }>()
  private rateLimitMap = new Map<string, number>()
  private readonly config: MarketDataProviderConfig

  constructor(config: Partial<MarketDataProviderConfig> = {}) {
    this.config = {
      rateLimit: {
        requestsPerMinute: 60,
        burstSize: 10,
        ...config.rateLimit,
      },
      cache: {
        ttlSeconds: 30,
        maxEntries: 1000,
        ...config.cache,
      },
      timeout: {
        connectTimeoutMs: 5000,
        readTimeoutMs: 10000,
        ...config.timeout,
      },
      ...config,
    }
  }

  async getQuote(symbol: string): Promise<QuoteResponse> {
    // キャッシュ確認
    const cached = this.getCachedQuote(symbol)
    if (cached) {
      return cached
    }

    try {
      await this.waitForRateLimit(symbol)

      const quote = await yahooFinance.quote(symbol)

      if (!quote || typeof quote.regularMarketPrice !== 'number') {
        throw new SymbolNotFoundError(symbol, 'Yahoo Finance')
      }

      const result: QuoteResponse = {
        symbol: quote.symbol || symbol,
        currentPrice: quote.regularMarketPrice,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        high: quote.regularMarketDayHigh || quote.regularMarketPrice,
        low: quote.regularMarketDayLow || quote.regularMarketPrice,
        open: quote.regularMarketOpen || quote.regularMarketPrice,
        previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
        volume: quote.regularMarketVolume || 0,
        timestamp: Math.floor(Date.now() / 1000),
      }

      // オプションプロパティ
      if (quote.marketCap !== undefined) result.marketCap = quote.marketCap
      if (quote.currency !== undefined) result.currency = quote.currency
      if (quote.exchangeTimezoneName !== undefined)
        result.exchangeTimezoneName = quote.exchangeTimezoneName
      if (quote.fullExchangeName !== undefined) result.exchangeName = quote.fullExchangeName

      this.setCachedQuote(symbol, result)
      return result
    } catch (error) {
      if (error instanceof MarketDataProviderError) {
        throw error
      }
      throw new MarketDataProviderError(
        `Failed to fetch quote for ${symbol}: ${error}`,
        'QUOTE_FETCH_ERROR',
        'Yahoo Finance',
        true
      )
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<QuoteResponse[]> {
    try {
      await this.waitForRateLimit('bulk')

      const results = await yahooFinance.quote(symbols)
      const quotes = Array.isArray(results) ? results : [results]

      return quotes.map(quote => {
        const result: QuoteResponse = {
          symbol: quote.symbol || '',
          currentPrice: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          high: quote.regularMarketDayHigh || quote.regularMarketPrice || 0,
          low: quote.regularMarketDayLow || quote.regularMarketPrice || 0,
          open: quote.regularMarketOpen || quote.regularMarketPrice || 0,
          previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice || 0,
          volume: quote.regularMarketVolume || 0,
          timestamp: Math.floor(Date.now() / 1000),
        }

        if (quote.marketCap !== undefined) result.marketCap = quote.marketCap
        if (quote.currency !== undefined) result.currency = quote.currency
        if (quote.exchangeTimezoneName !== undefined)
          result.exchangeTimezoneName = quote.exchangeTimezoneName
        if (quote.fullExchangeName !== undefined) result.exchangeName = quote.fullExchangeName

        return result
      })
    } catch (error) {
      throw new MarketDataProviderError(
        `Failed to fetch multiple quotes: ${error}`,
        'BULK_QUOTE_ERROR',
        'Yahoo Finance',
        true
      )
    }
  }

  async getHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
    interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo'
  ): Promise<HistoricalDataResponse> {
    try {
      await this.waitForRateLimit(symbol)

      const result = await yahooFinance.chart(symbol, {
        period1: from,
        period2: to,
        interval,
      })

      if (!result || !result.quotes || result.quotes.length === 0) {
        throw new DataUnavailableError(symbol, 'Yahoo Finance', 'No historical data available')
      }

      const quotes = result.quotes

      return {
        symbol,
        candles: {
          open: quotes.map(q => q.open || 0),
          high: quotes.map(q => q.high || 0),
          low: quotes.map(q => q.low || 0),
          close: quotes.map(q => q.close || 0),
          volume: quotes.map(q => q.volume || 0),
          timestamps: quotes.map(q => Math.floor((q.date?.getTime() || 0) / 1000)),
        },
        status: 'ok',
      }
    } catch (error) {
      if (error instanceof MarketDataProviderError) {
        throw error
      }
      throw new MarketDataProviderError(
        `Failed to fetch historical data for ${symbol}: ${error}`,
        'HISTORICAL_DATA_ERROR',
        'Yahoo Finance',
        true
      )
    }
  }

  async searchSymbols(query: string, limit: number = 10): Promise<SymbolSearchResult[]> {
    try {
      await this.waitForRateLimit('search')

      const result = await yahooFinance.search(query)

      if (!result || !result.quotes) {
        return []
      }

      return result.quotes.slice(0, limit).map((quote: any) => ({
        symbol: quote.symbol,
        shortName: quote.shortname,
        longName: quote.longname || quote.shortname,
        exchange: quote.exchange,
        quoteType: quote.quoteType,
        typeDisp: quote.typeDisp,
      }))
    } catch (error) {
      throw new MarketDataProviderError(
        `Failed to search symbols for "${query}": ${error}`,
        'SYMBOL_SEARCH_ERROR',
        'Yahoo Finance',
        true
      )
    }
  }

  async getNews(query: string = '', count: number = 6): Promise<NewsItemResponse[]> {
    try {
      await this.waitForRateLimit('news')

      const result = await yahooFinance.search(query)

      if (!result.news || result.news.length === 0) {
        return []
      }

      const newsToProcess = result.news.slice(0, count)

      return newsToProcess.map((item: any) => {
        let timestamp: number
        if (typeof item.providerPublishTime === 'string') {
          timestamp = Math.floor(new Date(item.providerPublishTime).getTime() / 1000)
        } else if (typeof item.providerPublishTime === 'number') {
          timestamp = item.providerPublishTime
        } else {
          timestamp = Math.floor(Date.now() / 1000)
        }

        const result: NewsItemResponse = {
          id: item.uuid || '',
          title: item.title || '',
          publisher: item.publisher || '',
          link: item.link || '',
          publishedAt: timestamp,
          type: item.type || 'article',
          relatedTickers: item.relatedTickers || [],
        }

        if (item.thumbnail && item.thumbnail.resolutions?.[0]) {
          result.thumbnail = {
            url: item.thumbnail.resolutions[0].url || '',
            width: item.thumbnail.resolutions[0].width || 0,
            height: item.thumbnail.resolutions[0].height || 0,
          }
        }

        return result
      })
    } catch (error) {
      log.api.error(
        'Failed to fetch news',
        error instanceof Error ? error : new Error(String(error))
      )
      return []
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await yahooFinance.quote('AAPL')
      return true
    } catch (error) {
      return false
    }
  }

  async getRateLimitStatus(): Promise<{ requestsRemaining: number; resetTime: number }> {
    const now = Date.now()
    const requestsInLastMinute = Array.from(this.rateLimitMap.values()).filter(
      timestamp => now - timestamp < 60000
    ).length

    const requestsRemaining = Math.max(
      0,
      this.config.rateLimit!.requestsPerMinute! - requestsInLastMinute
    )
    const resetTime = now + 60000

    return { requestsRemaining, resetTime }
  }

  private async waitForRateLimit(key: string): Promise<void> {
    const now = Date.now()
    const lastRequest = this.rateLimitMap.get(key) || 0
    const minInterval = 60000 / this.config.rateLimit!.requestsPerMinute! // ms between requests

    if (now - lastRequest < minInterval) {
      const waitTime = minInterval - (now - lastRequest)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.rateLimitMap.set(key, Date.now())
  }

  private getCachedQuote(symbol: string): QuoteResponse | null {
    const cached = this.cache.get(symbol)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > this.config.cache!.ttlSeconds! * 1000) {
      this.cache.delete(symbol)
      return null
    }

    return cached.data
  }

  private setCachedQuote(symbol: string, data: QuoteResponse): void {
    // キャッシュサイズ制限
    if (this.cache.size >= this.config.cache!.maxEntries!) {
      // 最も古いエントリを削除
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(symbol, { data, timestamp: Date.now() })
  }
}

export const createRefactoredYahooFinanceProvider = (
  config?: Partial<MarketDataProviderConfig>
): RefactoredYahooFinanceProvider => {
  return new RefactoredYahooFinanceProvider(config)
}
