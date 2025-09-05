export type ChartDataDTO = {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type ChartConfigDTO = {
  symbol: string
  interval: string
  chartType: 'candlestick' | 'line' | 'area'
  indicators: ChartIndicatorDTO[]
}

export type ChartIndicatorDTO = {
  type: 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger'
  parameters: Record<string, unknown>
  isVisible: boolean
}

export type ChartDrawingDTO = {
  id: string
  type: 'line' | 'rectangle' | 'arrow' | 'text'
  coordinates: { x: number; y: number }[]
  style: {
    color: string
    lineWidth: number
    opacity: number
  }
}
