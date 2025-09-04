export type Symbol = {
  symbol: string
  name: string
  exchange: string
  type: 'stock' | 'crypto' | 'forex' | 'commodity'
  currency: string
  isActive: boolean
}

export type MarketPrice = {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: number
}

export type NewsItem = {
  id: string
  title: string
  summary: string
  url: string
  publishedAt: Date
  source: string
  symbols: string[]
}

export type Alert = {
  id: string
  symbol: string
  condition: AlertCondition
  targetPrice: number
  isActive: boolean
  createdAt: Date
  triggeredAt?: Date
}

export type AlertCondition = 'above' | 'below' | 'crosses_above' | 'crosses_below'
