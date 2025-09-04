import type { MarketDataRepository } from '@/domain/repositories/MarketDataRepository'
import type { Symbol, MarketPrice, NewsItem, Alert } from '@/domain/entities/MarketData'
import type { TradingViewerApiClient } from '@/infrastructure/api/TradingViewerApiClient'

export class ApiMarketDataRepository implements MarketDataRepository {
  constructor(private apiClient: TradingViewerApiClient) {}

  async searchSymbols(query: string): Promise<Symbol[]> {
    const results = await this.apiClient.market.searchSymbols(query)
    return results.map(result => ({
      symbol: result.symbol,
      name: result.description,
      exchange: 'UNKNOWN', // API doesn't provide exchange info
      type: result.type as 'stock' | 'crypto' | 'forex' | 'commodity',
      currency: 'USD', // Default currency
      isActive: true,
    }))
  }

  async getMarketPrice(symbol: string): Promise<MarketPrice | null> {
    try {
      const quote = await this.apiClient.market.getQuote(symbol)
      return {
        symbol: quote.symbol,
        price: quote.currentPrice,
        change: quote.change,
        changePercent: quote.changePercent,
        volume: quote.volume,
        timestamp: quote.timestamp,
      }
    } catch {
      return null
    }
  }

  subscribeToMarketData(symbols: string[], callback: (data: MarketPrice) => void): () => void {
    // TODO: Implement WebSocket subscription for real-time data
    // For now, return a dummy unsubscribe function
    const intervalId = setInterval(async () => {
      for (const symbol of symbols) {
        const price = await this.getMarketPrice(symbol)
        if (price) {
          callback(price)
        }
      }
    }, 5000) // Poll every 5 seconds as fallback

    return () => {
      clearInterval(intervalId)
    }
  }

  async getNews(symbols?: string[], _limit?: number): Promise<NewsItem[]> {
    try {
      // TODO: Implement news API when available
      return await this.apiClient.market.getMarketNews(symbols)
    } catch {
      return []
    }
  }

  async createAlert(userId: string, alert: Omit<Alert, 'id' | 'createdAt'>): Promise<Alert> {
    // TODO: Implement alert creation API
    const newAlert: Alert = {
      id: crypto.randomUUID(),
      ...alert,
      createdAt: new Date(),
    }

    // Store alert locally for now
    const alerts = this.getStoredAlerts(userId)
    alerts.push(newAlert)
    localStorage.setItem(`alerts_${userId}`, JSON.stringify(alerts))

    return newAlert
  }

  async getUserAlerts(userId: string): Promise<Alert[]> {
    return this.getStoredAlerts(userId)
  }

  async deleteAlert(alertId: string): Promise<void> {
    // TODO: Get userId from context/auth service
    const userId = 'current_user' // Temporary
    const alerts = this.getStoredAlerts(userId)
    const updatedAlerts = alerts.filter(alert => alert.id !== alertId)
    localStorage.setItem(`alerts_${userId}`, JSON.stringify(updatedAlerts))
  }

  private getStoredAlerts(userId: string): Alert[] {
    try {
      const stored = localStorage.getItem(`alerts_${userId}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
}
