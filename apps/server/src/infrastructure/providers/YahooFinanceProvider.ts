/**
 * インフラストラクチャ層: Yahoo Finance API プロバイダー
 * 外部 API との統合を担当、ドメインインターフェースを実装
 */

import yahooFinance from 'yahoo-finance2'
import { 
  IMarketDataProvider, 
  NewsItem 
} from '../../domain/interfaces/IMarketDataService'
import { 
  MarketDataEntity, 
  QuoteData, 
  TradingSymbolEntity 
} from '../../domain/entities/MarketData'

export class YahooFinanceProvider implements IMarketDataProvider {
  
  async getQuote(symbol: string): Promise<QuoteData> {
    try {
      const quote = await yahooFinance.quote(symbol)
      
      if (!quote || typeof quote.regularMarketPrice !== 'number') {
        throw new Error(`Invalid quote data for symbol: ${symbol}`)
      }

      return {
        symbol: quote.symbol || symbol,
        currentPrice: quote.regularMarketPrice,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        high: quote.regularMarketDayHigh || quote.regularMarketPrice,
        low: quote.regularMarketDayLow || quote.regularMarketPrice,
        open: quote.regularMarketOpen || quote.regularMarketPrice,
        previousClose: quote.regularMarketPreviousClose || quote.regularMarketPrice,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap,
        currency: quote.currency,
        exchangeTimezoneName: quote.exchangeTimezoneName,
        exchangeName: quote.fullExchangeName,
        timestamp: Math.floor(Date.now() / 1000)
      }
    } catch (error) {
      throw new Error(`Failed to fetch quote for ${symbol}: ${error}`)
    }
  }

  async getHistoricalData(
    symbol: string, 
    from: Date, 
    to: Date, 
    interval: string
  ): Promise<MarketDataEntity[]> {
    try {
      const validInterval = this.mapToYahooInterval(interval)
      
      const result = await yahooFinance.historical(symbol, {
        period1: from,
        period2: to,
        interval: validInterval
      })

      return result.map(item => new MarketDataEntity(
        symbol,
        {
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
          timestamp: Math.floor(item.date.getTime() / 1000)
        },
        {
          source: 'yahoo-finance',
          reliability: 0.9,
          updatedAt: new Date()
        }
      ))
    } catch (error) {
      throw new Error(`Failed to fetch historical data for ${symbol}: ${error}`)
    }
  }

  async searchSymbols(query: string): Promise<TradingSymbolEntity[]> {
    try {
      const searchResults = await yahooFinance.search(query)
      
      return searchResults.quotes
        .filter(quote => quote.symbol && quote.exchange)
        .slice(0, 20) // 結果を制限
        .map(quote => new TradingSymbolEntity(
          quote.symbol!,
          quote.exchange!,
          quote.shortname || quote.longname || quote.symbol!,
          quote.sector,
          true
        ))
    } catch (error) {
      throw new Error(`Failed to search symbols for query "${query}": ${error}`)
    }
  }

  async getNews(symbols?: string[]): Promise<NewsItem[]> {
    try {
      let newsItems: any[] = []

      if (symbols && symbols.length > 0) {
        // 特定シンボルのニュース
        for (const symbol of symbols.slice(0, 5)) { // 最大 5 シンボル
          try {
            const symbolNews = await yahooFinance.quoteSummary(symbol, {
              modules: ['summaryProfile']
            })
            
            if (symbolNews.quoteSummary?.result?.[0]?.summaryProfile) {
              // Yahoo Finance のニュース API は制限があるため、
              // 実際の実装では別のニュースプロバイダーを使用する
              newsItems.push({
                uuid: `${symbol}-${Date.now()}`,
                title: `Market update for ${symbol}`,
                publisher: 'Yahoo Finance',
                link: `https://finance.yahoo.com/quote/${symbol}`,
                providerPublishTime: Math.floor(Date.now() / 1000),
                type: 'story',
                relatedTickers: [symbol]
              })
            }
          } catch (symbolError) {
            console.warn(`Failed to get news for ${symbol}:`, symbolError)
          }
        }
      } else {
        // 一般的な市場ニュース (モックデータ)
        newsItems = [
          {
            uuid: `general-${Date.now()}`,
            title: 'Market Overview',
            publisher: 'Yahoo Finance',
            link: 'https://finance.yahoo.com',
            providerPublishTime: Math.floor(Date.now() / 1000),
            type: 'story',
            relatedTickers: []
          }
        ]
      }

      return newsItems.map(item => ({
        id: item.uuid,
        title: item.title,
        content: item.summary || '',
        source: item.publisher,
        publishedAt: new Date(item.providerPublishTime * 1000),
        symbols: item.relatedTickers || [],
        sentiment: undefined
      }))
    } catch (error) {
      console.error('Failed to fetch news:', error)
      return []
    }
  }

  private mapToYahooInterval(interval: string): string {
    const intervalMap: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '1d': '1d',
      '1w': '1wk',
      '1M': '1mo'
    }

    return intervalMap[interval] || '1d'
  }
}

export const createYahooFinanceProvider = (): YahooFinanceProvider => {
  return new YahooFinanceProvider()
}