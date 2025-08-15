import yahooFinance from 'yahoo-finance2'

export interface YahooQuoteData {
  symbol: string
  currentPrice: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
  marketCap?: number
  timestamp: number
}

export interface YahooCandleData {
  c: number[] // close prices
  h: number[] // high prices
  l: number[] // low prices
  o: number[] // open prices
  s: string   // status
  t: number[] // timestamps
  v: number[] // volumes
}

export interface YahooSearchResult {
  symbol: string
  shortname?: string
  longname?: string
  exchange?: string
  quoteType?: string
  typeDisp?: string
}

export interface YahooNewsItem {
  uuid: string
  title: string
  publisher: string
  link: string
  providerPublishTime: number
  type: string
  thumbnail?: {
    resolutions: Array<{
      url: string
      width: number
      height: number
      tag: string
    }>
  }
  relatedTickers?: string[]
}

export class YahooFinanceService {
  private static instance: YahooFinanceService
  private cache = new Map<string, { data: YahooQuoteData; timestamp: number }>()
  private rateLimitMap = new Map<string, number>()
  private readonly CACHE_TTL = 30 * 1000 // 30 seconds cache
  private readonly RATE_LIMIT_DELAY = 100 // 100ms between requests per symbol
  
  static getInstance(): YahooFinanceService {
    if (!YahooFinanceService.instance) {
      YahooFinanceService.instance = new YahooFinanceService()
    }
    return YahooFinanceService.instance
  }

  private async waitForRateLimit(symbol: string): Promise<void> {
    const lastRequest = this.rateLimitMap.get(symbol) || 0
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequest
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.rateLimitMap.set(symbol, Date.now())
  }

  private getCachedQuote(symbol: string): YahooQuoteData | null {
    const cached = this.cache.get(symbol)
    if (!cached) return null
    
    const now = Date.now()
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(symbol)
      return null
    }
    
    return cached.data
  }

  private setCachedQuote(symbol: string, data: YahooQuoteData): void {
    this.cache.set(symbol, { data, timestamp: Date.now() })
  }

  /**
   * Get real-time quote data for a symbol
   */
  async getQuote(symbol: string): Promise<YahooQuoteData> {
    // Check cache first
    const cached = this.getCachedQuote(symbol)
    if (cached) {
      console.log(`📋 Using cached data for ${symbol}`)
      return cached
    }

    try {
      // Apply rate limiting
      await this.waitForRateLimit(symbol)
      
      const result = await yahooFinance.quote(symbol)
      
      if (!result) {
        throw new Error(`No data found for symbol: ${symbol}`)
      }

      const quote = result
      
      const quoteData: YahooQuoteData = {
        symbol: quote.symbol || symbol,
        currentPrice: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        high: quote.regularMarketDayHigh || quote.regularMarketPrice || 0,
        low: quote.regularMarketDayLow || quote.regularMarketPrice || 0,
        open: quote.regularMarketOpen || quote.regularMarketPrice || 0,
        previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice || 0,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap,
        timestamp: Date.now()
      }

      // Cache the result
      this.setCachedQuote(symbol, quoteData)
      
      return quoteData
    } catch (error) {
      console.error(`Yahoo Finance API error for ${symbol}:`, error)
      throw new Error(`Failed to fetch quote for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get historical price data (candles)
   */
  async getCandles(
    symbol: string,
    period1: Date,
    period2: Date,
    interval: '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo' = '1d'
  ): Promise<YahooCandleData> {
    try {
      const result = await yahooFinance.chart(symbol, {
        period1,
        period2,
        interval
      })

      if (!result || !result.quotes || result.quotes.length === 0) {
        throw new Error(`No historical data found for symbol: ${symbol}`)
      }

      const quotes = result.quotes
      
      return {
        c: quotes.map(q => q.close || 0),
        h: quotes.map(q => q.high || 0),
        l: quotes.map(q => q.low || 0),
        o: quotes.map(q => q.open || 0),
        s: 'ok',
        t: quotes.map(q => Math.floor((q.date?.getTime() || 0) / 1000)),
        v: quotes.map(q => q.volume || 0)
      }
    } catch (error) {
      console.error(`Yahoo Finance chart API error for ${symbol}:`, error)
      throw new Error(`Failed to fetch historical data for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search for symbols
   */
  async searchSymbols(query: string, limit: number = 10): Promise<YahooSearchResult[]> {
    try {
      const result = await yahooFinance.search(query)
      
      if (!result || !result.quotes) {
        return []
      }

      return result.quotes
        .slice(0, limit)
        .map((quote: any) => ({
          symbol: quote.symbol,
          shortname: quote.shortname,
          longname: quote.longname || quote.shortname,
          exchange: quote.exchange,
          quoteType: quote.quoteType,
          typeDisp: quote.typeDisp
        }))
    } catch (error) {
      console.error(`Yahoo Finance search API error for "${query}":`, error)
      throw new Error(`Failed to search symbols: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get multiple quotes at once
   */
  async getMultipleQuotes(symbols: string[]): Promise<YahooQuoteData[]> {
    try {
      const results = await yahooFinance.quote(symbols)
      
      if (!Array.isArray(results)) {
        return [await this.getQuote(symbols[0])]
      }

      return results.map(quote => ({
        symbol: quote.symbol || '',
        currentPrice: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        high: quote.regularMarketDayHigh || quote.regularMarketPrice || 0,
        low: quote.regularMarketDayLow || quote.regularMarketPrice || 0,
        open: quote.regularMarketOpen || quote.regularMarketPrice || 0,
        previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice || 0,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error(`Yahoo Finance multiple quotes API error:`, error)
      throw new Error(`Failed to fetch multiple quotes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert Finnhub resolution to Yahoo Finance interval
   */
  private convertResolutionToInterval(resolution: string): '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo' {
    switch (resolution) {
      case '1': return '1m'
      case '5': return '5m'  
      case '15': return '15m'
      case '60': return '1h'
      case 'D': return '1d'
      case 'W': return '1wk'
      case 'M': return '1mo'
      default: return '1d'
    }
  }

  /**
   * Get candles with Finnhub-compatible resolution parameter
   */
  async getCandlesWithResolution(
    symbol: string, 
    resolution: string,
    from: number,
    to: number
  ): Promise<YahooCandleData> {
    const interval = this.convertResolutionToInterval(resolution)
    const period1 = new Date(from * 1000)
    const period2 = new Date(to * 1000)
    
    return this.getCandles(symbol, period1, period2, interval)
  }

  /**
   * Get news articles for a given category/query
   */
  async getNews(query: string = '', count: number = 6): Promise<YahooNewsItem[]> {
    try {
      console.log(`🗞️ Fetching news for query: "${query}"`)
      
      // Try different approaches for Yahoo Finance search API
      let result: any
      
      // First, try basic search to see what we get
      try {
        result = await yahooFinance.search(query)
        console.log('🔍 Search result structure:', Object.keys(result))
        
        if (result.news && result.news.length > 0) {
          console.log(`✅ Found ${result.news.length} news articles via basic search`)
        } else {
          console.log('No news in basic search result')
        }
      } catch (basicError) {
        console.error('Basic search failed:', basicError)
        return []
      }

      // Check if we have news results
      if (!result.news || result.news.length === 0) {
        console.log(`No news found for query: "${query}"`)
        return []
      }

      // Limit results to requested count
      const newsToProcess = result.news.slice(0, count)

      const newsItems: YahooNewsItem[] = newsToProcess.map((item: any) => {
        // Handle timestamp - can be ISO string or Unix timestamp
        let timestamp: number
        
        if (typeof item.providerPublishTime === 'string') {
          // It's an ISO string, convert to Unix timestamp
          timestamp = Math.floor(new Date(item.providerPublishTime).getTime() / 1000)
        } else if (typeof item.providerPublishTime === 'number') {
          // It's already a number, use as is
          timestamp = item.providerPublishTime
        } else {
          // Fallback to current time
          timestamp = Math.floor(Date.now() / 1000)
        }
        
        return {
          uuid: item.uuid || '',
          title: item.title || '',
          publisher: item.publisher || '',
          link: item.link || '',
          providerPublishTime: timestamp,
          type: item.type || 'article',
          thumbnail: item.thumbnail,
          relatedTickers: item.relatedTickers || []
        }
      })

      console.log(`✅ Found ${newsItems.length} news articles`)
      return newsItems

    } catch (error) {
      console.error(`Failed to fetch news for query "${query}":`, error)
      return []
    }
  }

  /**
   * Get category-specific news
   */
  async getCategoryNews(category: 'japan' | 'world' | 'crypto' | 'general'): Promise<YahooNewsItem[]> {
    // Try multiple query approaches for better results
    const queryStrategies = {
      japan: [
        'Toyota',
        'Sony', 
        'Nintendo',
        'Japan',
        'Nikkei',
        'Tokyo'
      ],
      world: [
        'Apple',
        'Microsoft',
        'Tesla',
        'NASDAQ',
        'S&P 500',
        'stock market'
      ],
      crypto: [
        'Bitcoin',
        'Ethereum',
        'cryptocurrency',
        'crypto',
        'BTC',
        'ETH'
      ],
      general: [
        'market',
        'stocks',
        'finance',
        'economy',
        'trading',
        'investment'
      ]
    }

    const queries = queryStrategies[category] || queryStrategies.general
    
    // Try each query until we get results
    for (const query of queries) {
      console.log(`🔍 Trying query: "${query}" for category: ${category}`)
      const newsItems = await this.getNews(query, 6)
      if (newsItems.length > 0) {
        console.log(`✅ Got ${newsItems.length} news items with query: "${query}"`)
        return newsItems
      }
    }
    
    console.log(`⚠️ No news found for any query in category: ${category}`)
    return []
  }
}

export const getYahooFinanceService = (): YahooFinanceService => {
  return YahooFinanceService.getInstance()
}