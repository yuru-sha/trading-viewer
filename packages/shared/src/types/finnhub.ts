// Finnhub API response types

export interface FinnhubSymbol {
  currency: string
  description: string
  displaySymbol: string
  figi: string
  mic: string
  symbol: string
  type: string
}

export interface FinnhubSymbolSearchResponse {
  count: number
  result: FinnhubSymbol[]
}

export interface FinnhubQuote {
  c: number // Current price
  d: number // Change
  dp: number // Percent change
  h: number // High price of the day
  l: number // Low price of the day
  o: number // Open price of the day
  pc: number // Previous close price
  t: number // Timestamp
}

export interface FinnhubCandle {
  c: number[] // Close prices
  h: number[] // High prices
  l: number[] // Low prices
  o: number[] // Open prices
  s: string // Status
  t: number[] // Timestamps
  v: number[] // Volume data
}

export interface FinnhubErrorResponse {
  error: string
}

// Normalized API response types (what our API returns)
export interface NormalizedSymbol {
  symbol: string
  description: string
  displaySymbol: string
  type: string
  currency: string
}

export interface NormalizedQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  timestamp: number
}

export interface NormalizedCandle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface NormalizedCandleResponse {
  symbol: string
  resolution: string
  data: NormalizedCandle[]
  status: 'ok' | 'error'
}

// API request parameters
export interface SymbolSearchParams {
  q: string
  limit?: number
}

export interface CandleDataParams {
  symbol: string
  resolution: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M'
  from: number
  to: number
}

export interface QuoteParams {
  symbol: string
}

// Error types
export interface ApiError {
  code: string
  message: string
  statusCode: number
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number
  remaining: number
  resetTime: number
}
