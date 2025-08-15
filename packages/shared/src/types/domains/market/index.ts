// Market-related types
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
  industry: string
}

export interface QuoteData {
  c: number // Current price
  d: number // Change
  dp: number // Percent change
  h: number // High price
  l: number // Low price
  o: number // Open price
  pc: number // Previous close price
  t: number // Timestamp
}

export interface SymbolInfo {
  symbol: string
  name: string
}

// Market API Request/Response types
export interface SymbolSearchRequest {
  query: string
  limit?: number
}

export interface SymbolSearchResponse {
  data: Symbol[]
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

// News types
export interface NewsItem {
  uuid: string
  title: string
  publisher: string
  link: string
  time: string
  logo: string
  thumbnail?: string
  relatedTickers?: string[]
}

export interface NewsApiResponse {
  success: boolean
  data: NewsItem[]
  category: string
  count: number
}

export type NewsCategory = 'japan' | 'world' | 'crypto' | 'general'

// Normalized types for server adapters
export interface NormalizedSymbol {
  symbol: string
  description: string
  displaySymbol: string
  type: string
  exchange?: string
  currency?: string
}

export interface NormalizedQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume?: number
  timestamp: number
}

export interface NormalizedCandleResponse {
  symbol: string
  timeframe: string
  data: Array<{
    time: number
    open: number
    high: number
    low: number
    close: number
    volume?: number
  }>
  success: boolean
  message?: string
}
