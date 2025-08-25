// Market data core types
export interface Symbol {
  symbol: string
  description: string
  displaySymbol: string
  type: string
  currency?: string
  exchange?: string
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

export interface Candle {
  o: number // Open
  h: number // High
  l: number // Low
  c: number // Close
  v: number // Volume
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

export interface NewsArticle {
  category: string
  datetime: number
  headline: string
  id: number
  image: string
  related: string
  source: string
  summary: string
  url: string
}
