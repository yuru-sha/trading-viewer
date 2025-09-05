import type { Symbol, MarketPrice, NewsItem, Alert } from '@/domain/entities/MarketData'

export interface MarketDataRepository {
  searchSymbols(query: string): Promise<Symbol[]>
  getMarketPrice(symbol: string): Promise<MarketPrice | null>
  subscribeToMarketData(symbols: string[], callback: (data: MarketPrice) => void): () => void
  getNews(symbols?: string[], limit?: number): Promise<NewsItem[]>
  createAlert(userId: string, alert: Omit<Alert, 'id' | 'createdAt'>): Promise<Alert>
  getUserAlerts(userId: string): Promise<Alert[]>
  deleteAlert(alertId: string): Promise<void>
}
