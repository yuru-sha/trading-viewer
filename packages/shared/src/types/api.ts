import type { CandleData, Timeframe } from './chart'
import type { DrawingTool } from './drawing'

export interface Symbol {
  symbol: string
  description: string
  displaySymbol: string
  type: string
}

export interface Quote {
  c: number // Current price
  d: number // Change
  dp: number // Percent change
  h: number // High price of the day
  l: number // Low price of the day
  o: number // Open price of the day
  pc: number // Previous close price
  t: number // Timestamp
}

export interface CompanyProfile {
  country: string
  currency: string
  exchange: string
  ipo: string
  marketCapitalization: number
  name: string
  phone: string
  shareOutstanding: number
  ticker: string
  weburl: string
  logo: string
  finnhubIndustry: string
}

// API Request/Response types
export interface SymbolSearchRequest {
  query: string
  limit?: number
}

export interface SymbolSearchResponse {
  data: Symbol[]
  status: 'success' | 'error'
  message?: string
}

export interface MarketDataRequest {
  symbol: string
  timeframe: Timeframe
  from?: number
  to?: number
}

export interface MarketDataResponse {
  symbol: string
  data: CandleData[]
  status: 'success' | 'error'
  message?: string
}

export interface QuoteRequest {
  symbol: string
}

export interface QuoteResponse {
  symbol: string
  quote: Quote
  status: 'success' | 'error'
  message?: string
}

// Error types
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export interface AppApiError {
  type: ErrorType
  message: string
  details?: any
  timestamp: number
}

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: AppApiError }

// Drawing Tools API Types
export interface CreateDrawingToolRequest {
  symbol: string
  tool: Omit<DrawingTool, 'id' | 'createdAt' | 'updatedAt'>
}

export interface CreateDrawingToolResponse {
  data: DrawingTool
  status: 'success' | 'error'
  message?: string
}

export interface GetDrawingToolsRequest {
  symbol: string
  userId?: string
}

export interface GetDrawingToolsResponse {
  data: DrawingTool[]
  status: 'success' | 'error' 
  message?: string
}

export interface UpdateDrawingToolRequest {
  id: string
  updates: Partial<Omit<DrawingTool, 'id' | 'createdAt' | 'updatedAt'>>
}

export interface UpdateDrawingToolResponse {
  data: DrawingTool
  status: 'success' | 'error'
  message?: string
}

export interface DeleteDrawingToolRequest {
  id: string
}

export interface DeleteDrawingToolResponse {
  status: 'success' | 'error'
  message?: string
}
