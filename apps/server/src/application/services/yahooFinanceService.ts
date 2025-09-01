import yahooFinance from 'yahoo-finance2'
import { injectable, inject } from 'inversify'
import { TYPES } from '../../infrastructure/di/types.js'
import type { ILoggerService, IYahooFinanceService } from '../../infrastructure/di/interfaces.js'

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
  currency?: string
  exchangeTimezoneName?: string
  exchangeName?: string
  timestamp: number
}

export interface YahooCandleData {
  c: number[] // 終値
  h: number[] // 高値
  l: number[] // 安値
  o: number[] // 始値
  s: string // ステータス
  t: number[] // タイムスタンプ
  v: number[] // 出来高
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

@injectable()
export class YahooFinanceService implements IYahooFinanceService {
  private static instance: YahooFinanceService
  private cache = new Map<string, { data: YahooQuoteData; timestamp: number }>()
  private rateLimitMap = new Map<string, number>()
  private readonly CACHE_TTL = 30 * 1000 // 30秒キャッシュ
  private readonly RATE_LIMIT_DELAY = 100 // 銘柄ごとにリクエスト間隔を100ms空ける

  constructor(@inject(TYPES.LoggerService) private logger: ILoggerService) {}

  static getInstance(): YahooFinanceService {
    if (!YahooFinanceService.instance) {
      // This is now deprecated in favor of DI container
      throw new Error('Use DI container to get YahooFinanceService instance')
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
   * 銘柄のリアルタイム株価データを取得します。
   */
  async getQuote(symbol: string): Promise<YahooQuoteData> {
    // まずキャッシュを確認
    const cached = this.getCachedQuote(symbol)
    if (cached) {
      // キャッシュデータを使用
      return cached
    }

    try {
      // レート制限を適用
      await this.waitForRateLimit(symbol)

      const result = await yahooFinance.quote(symbol)

      if (!result) {
        throw new Error(`銘柄が見つかりません: ${symbol}`)
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
        timestamp: Date.now(),
      }

      // オプショナルなプロパティは値が存在する場合のみ設定
      if (quote.marketCap !== undefined) {
        quoteData.marketCap = quote.marketCap
      }
      if (quote.currency !== undefined) {
        quoteData.currency = quote.currency
      }
      if (quote.exchangeTimezoneName !== undefined) {
        quoteData.exchangeTimezoneName = quote.exchangeTimezoneName
      }
      if (quote.fullExchangeName !== undefined) {
        quoteData.exchangeName = quote.fullExchangeName
      } else if (quote.exchange !== undefined) {
        quoteData.exchangeName = quote.exchange
      }

      // 結果をキャッシュ
      this.setCachedQuote(symbol, quoteData)

      return quoteData
    } catch (error) {
      this.logger.api.error(`Yahoo Finance API error (${symbol}):`, error)
      throw new Error(
        `株価の取得に失敗しました (${symbol}): ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * 過去の価格データ（ローソク足）を取得します。
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
        interval,
      })

      if (!result || !result.quotes || result.quotes.length === 0) {
        throw new Error(`過去データが見つかりません: ${symbol}`)
      }

      const quotes = result.quotes

      return {
        c: quotes.map(q => q.close || 0),
        h: quotes.map(q => q.high || 0),
        l: quotes.map(q => q.low || 0),
        o: quotes.map(q => q.open || 0),
        s: 'ok',
        t: quotes.map(q => Math.floor((q.date?.getTime() || 0) / 1000)),
        v: quotes.map(q => q.volume || 0),
      }
    } catch (error) {
      this.logger.api.error(`Yahoo Finance chart API error (${symbol}):`, error)
      throw new Error(
        `過去データの取得に失敗しました (${symbol}): ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * 銘柄を検索します。
   */
  async searchSymbols(query: string, limit: number = 10): Promise<YahooSearchResult[]> {
    try {
      const result = await yahooFinance.search(query)

      if (!result || !result.quotes) {
        return []
      }

      return result.quotes.slice(0, limit).map((quote: any) => ({
        symbol: quote.symbol,
        shortname: quote.shortname,
        longname: quote.longname || quote.shortname,
        exchange: quote.exchange,
        quoteType: quote.quoteType,
        typeDisp: quote.typeDisp,
      }))
    } catch (error) {
      this.logger.api.error(`Yahoo Finance search API error ("${query}"):`, error)
      throw new Error(
        `銘柄の検索に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * 複数の株価を一度に取得します。
   */
  async getMultipleQuotes(symbols: string[]): Promise<YahooQuoteData[]> {
    try {
      const results = await yahooFinance.quote(symbols)

      if (!Array.isArray(results)) {
        return [await this.getQuote(symbols[0])]
      }

      return results.map(quote => {
        const quoteData: YahooQuoteData = {
          symbol: quote.symbol || '',
          currentPrice: quote.regularMarketPrice || 0,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          high: quote.regularMarketDayHigh || quote.regularMarketPrice || 0,
          low: quote.regularMarketDayLow || quote.regularMarketPrice || 0,
          open: quote.regularMarketOpen || quote.regularMarketPrice || 0,
          previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice || 0,
          volume: quote.regularMarketVolume || 0,
          timestamp: Date.now(),
        }

        // オプショナルなプロパティは値が存在する場合のみ設定
        if (quote.marketCap !== undefined) {
          quoteData.marketCap = quote.marketCap
        }
        if (quote.currency !== undefined) {
          quoteData.currency = quote.currency
        }
        if (quote.exchangeTimezoneName !== undefined) {
          quoteData.exchangeTimezoneName = quote.exchangeTimezoneName
        }
        if (quote.fullExchangeName !== undefined) {
          quoteData.exchangeName = quote.fullExchangeName
        } else if (quote.exchange !== undefined) {
          quoteData.exchangeName = quote.exchange
        }

        return quoteData
      })
    } catch (error) {
      this.logger.api.error(`Yahoo Finance multiple quotes API error:`, error)
      throw new Error(
        `複数株価の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * 解像度をYahoo Financeのインターバルに変換します。
   */
  private convertResolutionToInterval(
    resolution: string
  ): '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo' {
    switch (resolution) {
      case '1':
        return '1m'
      case '5':
        return '5m'
      case '15':
        return '15m'
      case '60':
        return '1h'
      case 'D':
        return '1d'
      case 'W':
        return '1wk'
      case 'M':
        return '1mo'
      default:
        return '1d'
    }
  }

  /**
   * 解像度パラメータを使用してローソク足を取得します。
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
   * 指定されたカテゴリ/クエリのニュース記事を取得します。
   */
  async getNews(query: string = '', count: number = 6): Promise<YahooNewsItem[]> {
    try {
      // 基本的なニュース検索を試みる
      let result: any

      try {
        result = await yahooFinance.search(query)
      } catch (error) {
        // 検索が失敗した場合は空の配列を返す
        return []
      }

      // ニュースの検索結果があるか確認
      if (!result.news || result.news.length === 0) {
        return []
      }

      // 結果を要求された件数に制限
      const newsToProcess = result.news.slice(0, count)

      const newsItems: YahooNewsItem[] = newsToProcess.map((item: any) => {
        // タイムスタンプの処理 - ISO文字列またはUnixタイムスタンプの可能性がある
        let timestamp: number

        if (typeof item.providerPublishTime === 'string') {
          // ISO文字列の場合はUnixタイムスタンプに変換
          timestamp = Math.floor(new Date(item.providerPublishTime).getTime() / 1000)
        } else if (typeof item.providerPublishTime === 'number') {
          // すでに数値の場合はそのまま使用
          timestamp = item.providerPublishTime
        } else {
          // フォールバックとして現在の時刻を使用
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
          relatedTickers: item.relatedTickers || [],
        }
      })

      return newsItems
    } catch (error) {
      // ニュースの取得に失敗
      return []
    }
  }

  /**
   * カテゴリ別のニュースを取得します。
   */
  async getCategoryNews(
    category: 'japan' | 'world' | 'crypto' | 'general'
  ): Promise<YahooNewsItem[]> {
    // より良い結果を得るために複数のクエリ戦略を試す
    const queryStrategies = {
      japan: ['トヨタ', 'ソニー', '任天堂', '日本', '日経', '東京'],
      world: ['Apple', 'Microsoft', 'Tesla', 'NASDAQ', 'S&P 500', '株式市場'],
      crypto: ['ビットコイン', 'イーサリアム', '暗号資産', '仮想通貨', 'BTC', 'ETH'],
      general: ['市場', '株', '金融', '経済', '取引', '投資'],
    }

    const queries = queryStrategies[category] || queryStrategies.general

    // 結果が得られるまで各クエリを試す
    for (const query of queries) {
      const newsItems = await this.getNews(query, 6)
      if (newsItems.length > 0) {
        return newsItems
      }
    }
    return []
  }
}

