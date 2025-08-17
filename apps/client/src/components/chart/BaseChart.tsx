import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { Loading } from '@trading-viewer/ui'
import { PriceData } from '../../utils/indicators'
import { DrawingToolType, UserIndicator } from '@trading-viewer/shared'

// Base chart configuration interface
export interface BaseChartConfig {
  symbol: string
  chartType?: 'candle' | 'line' | 'area'
  timeframe?: string
  showGridlines?: boolean
  showVolume?: boolean
  showDrawingTools?: boolean
  showPeriodHigh?: boolean
  showPeriodLow?: boolean
  periodWeeks?: number
  isRealTime?: boolean
}

// Technical indicators configuration
export interface TechnicalIndicators {
  sma?: { enabled: boolean; periods: number[] }
  ema?: { enabled: boolean; periods: number[] }
  rsi?: { enabled: boolean; period: number }
  macd?: { enabled: boolean; fastPeriod: number; slowPeriod: number; signalPeriod: number }
  bollingerBands?: { enabled: boolean; period: number; standardDeviations: number }
}

// Base chart props interface
export interface BaseChartProps extends BaseChartConfig {
  data: PriceData[]
  currentPrice?: number
  isLoading?: boolean
  onSymbolChange?: (symbol: string) => void
  className?: string
  indicators?: UserIndicator[]
}

// Chart ref interface
export interface ChartRef {
  takeScreenshot: (filename?: string) => void
  addIndicator: (indicator: UserIndicator) => void
  removeIndicator: (indicatorId: string) => void
  setDrawingTool: (tool: DrawingToolType) => void
}

// Default chart settings
export const DEFAULT_CHART_SETTINGS: Partial<BaseChartConfig> = {
  chartType: 'candle',
  showVolume: true,
  showDrawingTools: true,
  showGridlines: true,
  showPeriodHigh: true,
  showPeriodLow: true,
  isRealTime: false,
}

// Base chart hook interface
export interface UseBaseChart {
  chartRef: React.RefObject<ChartRef>
  isLoading: boolean
  error: string | null
  takeScreenshot: (filename?: string) => void
}

// Chart provider props for context
export interface ChartProviderProps {
  children: React.ReactNode
  config: BaseChartConfig
  data: PriceData[]
  indicators?: UserIndicator[]
}

// Chart component factory interface
export interface ChartComponentFactory {
  createChart: (type: 'optimized' | 'standard' | 'lazy') => React.ComponentType<BaseChartProps>
}