// Database entity types that mirror Prisma schema
export interface DatabaseSymbol {
  id: string
  symbol: string
  description: string
  displaySymbol: string
  type: string
  createdAt: Date
  updatedAt: Date
}

export interface Candle {
  id: string
  symbol: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number | null
  createdAt: Date
}

export interface UserPreferences {
  id: string
  userId: string
  theme: string
  chartType: string
  timeframe: string
  indicators: string // JSON string type
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name: string | null
  createdAt: Date
  updatedAt: Date
}

// Database query filter types
export interface SymbolFilter {
  symbol?: string
  type?: string
  search?: string
}

export interface CandleFilter {
  symbol: string
  from?: number
  to?: number
  limit?: number
}

export interface CandleInput {
  symbol: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface UserPreferencesInput {
  userId: string
  theme?: string
  chartType?: string
  timeframe?: string
  indicators?: string
}
