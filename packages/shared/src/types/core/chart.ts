// Chart core types
export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1D' | '1W' | '1M'

export type ChartType = 'candlestick' | 'line' | 'area' | 'bars'

export interface ChartSettings {
  timeframe: TimeFrame
  chartType: ChartType
  theme: 'light' | 'dark'
  showVolume: boolean
  showGrid: boolean
  timezone: string
}

export interface TimeframePeriod {
  value: string
  label: string
  seconds: number
}

export interface ChartData {
  symbol: string
  timeframe: TimeFrame
  candles: Array<{
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
}

export interface TechnicalIndicator {
  id: string
  name: string
  type: 'overlay' | 'oscillator'
  parameters: Record<string, number | string | boolean>
  visible: boolean
  color?: string
}

export type Timezone =
  | 'UTC'
  | 'America/New_York'
  | 'America/Chicago'
  | 'America/Los_Angeles'
  | 'Europe/London'
  | 'Europe/Berlin'
  | 'Asia/Tokyo'
  | 'Asia/Shanghai'
  | 'Asia/Kolkata'

// UI component interfaces for chart constants
export interface TimeframeOption {
  value: string
  label: string
}

export interface SymbolInfo {
  symbol: string
  name: string
}

export interface TimezoneOption {
  value: string
  label: string
  offset: string
}
