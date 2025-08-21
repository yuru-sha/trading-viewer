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
  passwordHash: string
  name: string | null
  avatar: string | null
  role: string
  isEmailVerified: boolean
  failedLoginCount: number
  lockedUntil: Date | null
  lastLoginAt: Date | null
  isActive: boolean
  resetToken: string | null
  resetTokenExpiry: Date | null
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

export interface DrawingTool {
  id: string
  userId: string
  symbol: string
  timeframe: string
  type: string
  points: string
  style: string
  text: string | null
  locked: boolean
  visible: boolean
  expiresAt: Date | null
  lastAccessedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface PriceAlert {
  id: string
  userId: string
  symbol: string
  type: string
  price: number
  percentageChange: number | null
  message: string | null
  enabled: boolean
  currency: string | null
  exchange: string | null
  timezone: string | null
  triggeredAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface RefreshToken {
  id: string
  token: string
  userId: string
  expiresAt: Date
  isRevoked: boolean
  createdAt: Date
}

export interface Watchlist {
  id: string
  userId: string
  symbol: string
  name: string
  position: number
  currency: string | null
  exchange: string | null
  timezone: string | null
  addedAt: Date
}

export interface UserIndicator {
  id: string
  userId: string
  symbol: string
  timeframe: string
  type: string
  name: string
  parameters: string
  visible: boolean
  style: string | null
  position: number
  createdAt: Date
  updatedAt: Date
}
