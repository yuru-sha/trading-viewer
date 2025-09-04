export type ChartData = {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type ChartConfig = {
  symbol: string
  interval: string
  chartType: 'candlestick' | 'line' | 'area'
  indicators: ChartIndicator[]
  drawings: ChartDrawing[]
}

export type ChartIndicator = {
  id: string
  type: 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger'
  parameters: Record<string, unknown>
  isVisible: boolean
}

export type ChartDrawing = {
  id: string
  type: 'line' | 'rectangle' | 'arrow' | 'text'
  coordinates: ChartCoordinate[]
  style: DrawingStyle
}

export type ChartCoordinate = {
  x: number
  y: number
}

export type DrawingStyle = {
  color: string
  lineWidth: number
  opacity: number
}
