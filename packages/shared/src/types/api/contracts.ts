// API contract types for client-server communication
import type { User, UserPreferences } from '../core/user'
import type { ErrorInfo } from '../core'

// Normalized API response types
export interface NormalizedSymbol {
  symbol: string
  description: string
  displaySymbol: string
  type: string
  currency?: string
  exchange?: string
}

export interface NormalizedQuote {
  symbol: string
  currentPrice: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  timestamp: number
  currency?: string
  exchangeName?: string
}

export interface NormalizedCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface NormalizedCandleResponse {
  symbol: string
  resolution: string
  candles: NormalizedCandle[]
  nextTime?: number
}

// Generic API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ErrorInfo
  timestamp: number
}

// Authentication API types
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
  expiresAt: number
}

export interface RegisterRequest {
  email: string
  password: string
  username?: string
}

// Market data API types
export interface SymbolSearchRequest {
  query: string
  limit?: number
  exchange?: string
}

export interface QuoteRequest {
  symbol: string
}

export interface CandleRequest {
  symbol: string
  resolution: string
  from: number
  to: number
  limit?: number
}

export interface NewsRequest {
  category?: string
  minId?: string
  limit?: number
}

// Watchlist API types
export interface WatchlistItem {
  id: string
  symbol: string
  addedAt: number
  notes?: string
}

export interface AddToWatchlistRequest {
  symbol: string
  notes?: string
}

// User preferences API types
export interface UpdatePreferencesRequest {
  preferences: Partial<UserPreferences>
}

// WebSocket message types are defined in websocket.ts
