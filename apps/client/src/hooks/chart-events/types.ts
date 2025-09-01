import { ECElementEvent } from 'echarts'

export type ChartEventsConfig = {
  data: Array<{
    timestamp: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }>
  enableDrawingTools: boolean
  onChartClick?: () => void
  onCrosshairMove?: (price: number, timestamp: number) => void
}

export type ChartEventHandlers = {
  handleChartClick: (params: ECElementEvent) => void
  handleChartMouseMove: (params: ECElementEvent) => void
  handleChartMouseDown: (params: ECElementEvent) => void
  handleChartMouseUp: (params: ECElementEvent) => void
  handleChartRightClick: (params: ECElementEvent) => void
}

export type ChartEventPoint = {
  timestamp: number
  price: number
  x: number
  y: number
}
