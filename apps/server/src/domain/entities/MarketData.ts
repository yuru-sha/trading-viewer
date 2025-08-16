/**
 * ドメインエンティティ: MarketData
 * 市場データの純粋なビジネスロジックを表現
 */

export interface PriceData {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

export interface QuoteData {
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

export class MarketDataEntity {
  constructor(
    public readonly symbol: string,
    public readonly priceData: PriceData,
    public readonly metadata: {
      source: string
      reliability: number
      updatedAt: Date
    }
  ) {}

  isStale(maxAgeInMinutes: number = 5): boolean {
    const ageInMinutes = (Date.now() - this.metadata.updatedAt.getTime()) / (1000 * 60)
    return ageInMinutes > maxAgeInMinutes
  }

  isReliable(minReliability: number = 0.8): boolean {
    return this.metadata.reliability >= minReliability
  }

  getPriceChange(): { absolute: number; percentage: number } {
    const absolute = this.priceData.close - this.priceData.open
    const percentage = (absolute / this.priceData.open) * 100
    return { absolute, percentage }
  }

  isValidPrice(): boolean {
    const { open, high, low, close, volume } = this.priceData
    return (
      open > 0 &&
      high > 0 &&
      low > 0 &&
      close > 0 &&
      volume >= 0 &&
      high >= Math.max(open, close) &&
      low <= Math.min(open, close)
    )
  }
}

export class TradingSymbolEntity {
  constructor(
    public readonly symbol: string,
    public readonly exchange: string,
    public readonly name: string,
    public readonly sector?: string,
    public readonly isActive: boolean = true
  ) {}

  getFullSymbol(): string {
    return `${this.symbol}.${this.exchange}`
  }

  isValidForTrading(): boolean {
    return this.isActive && this.symbol.length > 0 && this.exchange.length > 0
  }
}