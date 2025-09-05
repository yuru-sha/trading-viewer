// Chart-related types
export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface ChartData extends CandleData {
  timestamp: number
}

export type ChartType = 'candlestick' | 'line' | 'bar' | 'candle' | 'area'
export type Timeframe = '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M'

export interface TechnicalIndicator {
  id: string
  name: string
  type: 'overlay' | 'oscillator'
  parameters: Record<string, unknown>
  visible: boolean
}

export interface ChartSettings {
  chartType: ChartType
  timeframe: Timeframe
  theme: 'light' | 'dark'
  indicators: TechnicalIndicator[]
}

export interface PriceScale {
  autoScale: boolean
  scaleMargins: {
    top: number
    bottom: number
  }
}

export interface TimeScale {
  timeVisible: boolean
  secondsVisible: boolean
  rightOffset: number
  barSpacing: number
}

export interface ApiCandleData {
  c: number[] // Close prices
  h: number[] // High prices
  l: number[] // Low prices
  o: number[] // Open prices
  s: string // Status
  t: number[] // Timestamps
  v: number[] // Volume
}

export interface DataSourceInfo {
  isMockData: boolean
  provider: string
  status: string
  description: string
}

export interface TimeframeOption {
  value: string
  label: string
}

export interface TimezoneOption {
  value: string
  label: string
  offset: string
}

// Chart API Request/Response types
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

// Chart Component Interfaces
export * from '../../chart/interfaces'
