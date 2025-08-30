// Business logic types - domain logic, calculations, rules
export * from './trading'
export * from './analysis'
export * from './alerts'
export * from './commands'

// Watchlist business logic
export interface WatchlistEntry {
  id: string
  userId: string
  symbol: string
  notes?: string
  tags: string[]
  addedAt: number
  lastViewedAt?: number
  alertsEnabled: boolean
  priceTarget?: number
  stopLoss?: number
}

export interface Watchlist {
  id: string
  userId: string
  name: string
  description?: string
  entries: WatchlistEntry[]
  isDefault: boolean
  isPublic: boolean
  createdAt: number
  updatedAt: number
}

// Market session types
export interface MarketSession {
  name: string
  start: string // HH:mm format
  end: string // HH:mm format
  timezone: string
  isOpen: boolean
  nextOpen?: number
  nextClose?: number
}

export interface MarketHours {
  market: string
  timezone: string
  sessions: {
    premarket?: MarketSession
    regular: MarketSession
    postmarket?: MarketSession
  }
  holidays: number[]
  isOpen: boolean
  nextOpen?: number
  nextClose?: number
}

// Data feed types
export interface DataFeedStatus {
  provider: string
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting'
  lastUpdate: number
  latency: number
  subscribedSymbols: number
  errorCount: number
  uptime: number
}

// Search and filtering
export interface SymbolSearchCriteria {
  query?: string
  type?: 'stock' | 'crypto' | 'forex' | 'commodity' | 'index'
  exchange?: string
  currency?: string
  marketCap?: {
    min?: number
    max?: number
  }
  volume?: {
    min?: number
    max?: number
  }
  price?: {
    min?: number
    max?: number
  }
  sector?: string
  industry?: string
  country?: string
}

export interface SymbolFilter {
  sortBy?: 'symbol' | 'price' | 'change' | 'volume' | 'marketCap'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// For backward compatibility
export interface CandleFilter {
  symbol: string
  from: number
  to: number
  resolution: string
}
