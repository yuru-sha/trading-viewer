/**
 * ドメインサービス実装
 * ビジネスロジックの中核、インフラストラクチャ層に依存しない
 */

import {
  IMarketDataService,
  IMarketDataProvider,
  IMarketDataCache,
  IMarketDataRepository,
  IDataQualityService,
  NewsItem,
} from '../interfaces/IMarketDataService'
import { MarketDataEntity, QuoteData, TradingSymbolEntity } from '../entities/MarketData'
import { log } from '../../infrastructure/services/logger.js'

export class MarketDataService implements IMarketDataService {
  constructor(
    private readonly marketDataProvider: IMarketDataProvider,
    private readonly marketDataCache: IMarketDataCache,
    private readonly marketDataRepository: IMarketDataRepository,
    private readonly dataQualityService: IDataQualityService
  ) {}

  async getRealtimeQuote(symbol: string): Promise<QuoteData> {
    // 1. キャッシュから取得を試行
    const cachedData = await this.marketDataCache.get(`quote:${symbol}`)
    if (cachedData && !cachedData.isStale(1)) {
      // 1 分以内なら有効
      return this.convertToQuoteData(cachedData)
    }

    // 2. 外部プロバイダーから取得
    const quote = await this.marketDataProvider.getQuote(symbol)

    // 3. データ品質チェック
    const marketData = this.createMarketDataEntity(symbol, quote)
    const isValid = await this.dataQualityService.validateMarketData(marketData)

    if (!isValid) {
      throw new Error(`Invalid market data received for symbol: ${symbol}`)
    }

    // 4. キャッシュと永続化
    await this.marketDataCache.set(`quote:${symbol}`, marketData, 60) // 1 分キャッシュ
    await this.marketDataRepository.saveMarketData(marketData)

    return quote
  }

  async getHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
    interval: string
  ): Promise<MarketDataEntity[]> {
    // 1. リポジトリから既存データを取得
    const existingData = await this.marketDataRepository.getMarketData(symbol, from, to)

    // 2. データギャップを特定
    const gaps = this.identifyDataGaps(existingData, from, to, interval)

    // 3. 不足データを外部から取得
    let newData: MarketDataEntity[] = []
    for (const gap of gaps) {
      const gapData = await this.marketDataProvider.getHistoricalData(
        symbol,
        gap.from,
        gap.to,
        interval
      )
      newData = newData.concat(gapData)
    }

    // 4. データ品質チェックと保存
    if (newData.length > 0) {
      const validData: MarketDataEntity[] = []
      for (const data of newData) {
        if (await this.dataQualityService.validateMarketData(data)) {
          validData.push(data)
        }
      }
      await this.marketDataRepository.bulkSaveMarketData(validData)
    }

    // 5. 完全なデータセットを返す
    return await this.marketDataRepository.getMarketData(symbol, from, to)
  }

  async searchSymbols(query: string): Promise<TradingSymbolEntity[]> {
    const cacheKey = `search:${query.toLowerCase()}`

    // キャッシュから検索
    const cachedResult = await this.marketDataCache.get(cacheKey)
    if (cachedResult) {
      return JSON.parse(cachedResult.toString())
    }

    // 外部プロバイダーから検索
    const symbols = await this.marketDataProvider.searchSymbols(query)

    // 結果をキャッシュ（検索結果は 30 分キャッシュ）
    await this.marketDataCache.set(cacheKey, symbols as any, 1800)

    return symbols
  }

  async getMarketNews(symbols?: string[]): Promise<NewsItem[]> {
    const cacheKey = symbols ? `news:${symbols.join(',')}` : 'news:general'

    // キャッシュから取得
    const cachedNews = await this.marketDataCache.get(cacheKey)
    if (cachedNews) {
      return JSON.parse(cachedNews.toString())
    }

    // 外部プロバイダーから取得
    const news = await this.marketDataProvider.getNews(symbols)

    // ニュースは 5 分キャッシュ
    await this.marketDataCache.set(cacheKey, news as any, 300)

    return news
  }

  async validateSymbol(symbol: string): Promise<boolean> {
    try {
      const quote = await this.marketDataProvider.getQuote(symbol)
      return quote.currentPrice > 0
    } catch (error) {
      return false
    }
  }

  async refreshMarketData(symbols: string[]): Promise<void> {
    const promises = symbols.map(async symbol => {
      try {
        // キャッシュを無効化
        await this.marketDataCache.invalidate(`quote:${symbol}`)

        // 新しいデータを取得
        await this.getRealtimeQuote(symbol)
      } catch (error) {
        log.api.error(`Failed to refresh data for ${symbol}:`, error)
      }
    })

    await Promise.allSettled(promises)
  }

  private convertToQuoteData(marketData: MarketDataEntity): QuoteData {
    const priceChange = marketData.getPriceChange()
    return {
      symbol: marketData.symbol,
      currentPrice: marketData.priceData.close,
      change: priceChange.absolute,
      changePercent: priceChange.percentage,
      high: marketData.priceData.high,
      low: marketData.priceData.low,
      open: marketData.priceData.open,
      previousClose: marketData.priceData.open, // 簡略化
      volume: marketData.priceData.volume,
      timestamp: marketData.priceData.timestamp,
    }
  }

  private createMarketDataEntity(symbol: string, quote: QuoteData): MarketDataEntity {
    return new MarketDataEntity(
      symbol,
      {
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.currentPrice,
        volume: quote.volume,
        timestamp: quote.timestamp,
      },
      {
        source: 'yahoo-finance',
        reliability: 0.9,
        updatedAt: new Date(),
      }
    )
  }

  private identifyDataGaps(
    existingData: MarketDataEntity[],
    from: Date,
    to: Date,
    interval: string
  ): { from: Date; to: Date }[] {
    // データギャップ特定のロジック（簡略化）
    if (existingData.length === 0) {
      return [{ from, to }]
    }

    // 実際の実装では、より詳細なギャップ分析が必要
    return []
  }
}
