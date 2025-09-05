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

export interface SymbolInfo {
  symbol: string
  name: string
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

// Chart saving/loading types
export interface SavedChart {
  id: string
  symbol: string
  timeframe: string
  name: string
  createdAt: string
  updatedAt: string
  chartData: ChartSaveData
}

export interface ChartSaveData {
  chartType: ChartType
  indicators: TechnicalIndicator[]
  drawingObjects: DrawingObject[]
  chartSettings: {
    showVolume: boolean
    showGridlines: boolean
    showPeriodHigh: boolean
    showPeriodLow: boolean
    periodWeeks: number
    colors: {
      bullish: string
      bearish: string
      volume: string
      grid: string
      background: string
    }
  }
}

export interface DrawingObject {
  id: string
  type: 'line' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'fibonacci'
  points: { x: number; y: number }[]
  properties: {
    color: string
    lineWidth: number
    fillColor?: string
    text?: string
    fontSize?: number
  }
}
