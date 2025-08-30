// Chart component interfaces and types

export type ChartLibraryType = 'candle' | 'line' | 'area' | 'bars'

export interface ChartConfig {
  type: ChartLibraryType
  symbol: string
  timeframe?: string
  showVolume?: boolean
  showGridlines?: boolean
  theme?: 'light' | 'dark'
  indicators?: string[]
  drawingTools?: any[]
}

export interface ChartState {
  isLoading: boolean
  data: any[]
  error?: string | null
  lastUpdate?: Date | null
  hasData?: boolean
}

export interface MarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume?: number
  timestamp: Date | number
  open?: number
  high?: number
  low?: number
  close?: number
}

export interface IChartComponent {
  config: ChartConfig
  state: ChartState
  render(): any
  updateData(data: MarketData | any[]): void
  setConfig(config: Partial<ChartConfig>): void
}

export interface IChartFactory {
  createChart(type: ChartLibraryType, config: ChartConfig): IChartComponent
  getSupportedTypes(): ChartLibraryType[]
}

// Chart bounds for drawing tools
export interface ChartBounds {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  startTimestamp: number
  endTimestamp: number
  minPrice: number
  maxPrice: number
}

// Data source info
export interface DataSourceInfo {
  name: string
  provider: string
  lastUpdate: Date
  delay?: number
  currency?: string
}

// Chart annotation types
export type AnnotationType = 'text' | 'arrow' | 'circle' | 'rectangle' | 'line'

export interface ChartAnnotation {
  id: string
  type: AnnotationType
  x: number
  y: number
  width?: number
  height?: number
  text?: string
  color: string
  backgroundColor?: string
  fontSize?: number
  visible: boolean
  timestamp: number
  price?: number
  createdAt: number
  updatedAt: number
}

export interface AnnotationFilter {
  type?: AnnotationType
  visible?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface AnnotationTemplate {
  id: string
  name: string
  type: AnnotationType
  defaultProps: Partial<ChartAnnotation>
}

export const ANNOTATION_PRESETS: AnnotationTemplate[] = [
  {
    id: 'text-note',
    name: 'Text Note',
    type: 'text',
    defaultProps: {
      color: '#333',
      backgroundColor: '#fff',
      fontSize: 12,
    },
  },
  {
    id: 'buy-arrow',
    name: 'Buy Arrow',
    type: 'arrow',
    defaultProps: {
      color: '#22c55e',
    },
  },
  {
    id: 'sell-arrow',
    name: 'Sell Arrow',
    type: 'arrow',
    defaultProps: {
      color: '#ef4444',
    },
  },
]
