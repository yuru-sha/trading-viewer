// Market analysis and technical analysis types
import type { Candle } from '../core/market'

// Technical indicator types
export type IndicatorType =
  | 'sma'
  | 'ema'
  | 'rsi'
  | 'macd'
  | 'bollinger'
  | 'stochastic'
  | 'williams_r'

export interface IndicatorConfig {
  type: IndicatorType
  name: string
  period: number
  parameters: Record<string, number | string | boolean>
  color?: string
  visible: boolean
}

export interface IndicatorValue {
  timestamp: number
  value: number | number[] | null
}

export interface IndicatorResult {
  config: IndicatorConfig
  values: IndicatorValue[]
  metadata: {
    lastUpdate: number
    dataPoints: number
    status: 'calculating' | 'ready' | 'error'
  }
}

// Moving averages
export interface MovingAverageConfig extends IndicatorConfig {
  type: 'sma' | 'ema'
  period: number
  source: 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4'
}

// RSI (Relative Strength Index)
export interface RSIConfig extends IndicatorConfig {
  type: 'rsi'
  period: number
  overbought: number
  oversold: number
}

export interface RSIValue extends IndicatorValue {
  value: number
  signal?: 'overbought' | 'oversold' | 'neutral'
}

// MACD (Moving Average Convergence Divergence)
export interface MACDConfig extends IndicatorConfig {
  type: 'macd'
  fastPeriod: number
  slowPeriod: number
  signalPeriod: number
}

export interface MACDValue {
  timestamp: number
  value: {
    macd: number
    signal: number
    histogram: number
  }
}

// Bollinger Bands
export interface BollingerConfig extends IndicatorConfig {
  type: 'bollinger'
  period: number
  stdDev: number
}

export interface BollingerValue {
  timestamp: number
  value: {
    upper: number
    middle: number
    lower: number
    percentB?: number
    bandwidth?: number
  }
}

// Pattern recognition types
export type CandlestickPattern =
  | 'doji'
  | 'hammer'
  | 'hanging_man'
  | 'inverted_hammer'
  | 'shooting_star'
  | 'engulfing_bullish'
  | 'engulfing_bearish'
  | 'harami_bullish'
  | 'harami_bearish'
  | 'morning_star'
  | 'evening_star'

export interface PatternDetection {
  pattern: CandlestickPattern
  timestamp: number
  confidence: number
  candles: Candle[]
  signal: 'bullish' | 'bearish' | 'neutral'
  description: string
}

// Chart pattern types
export type ChartPattern =
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'double_top'
  | 'double_bottom'
  | 'triangle_ascending'
  | 'triangle_descending'
  | 'triangle_symmetrical'
  | 'wedge_rising'
  | 'wedge_falling'
  | 'channel_ascending'
  | 'channel_descending'
  | 'flag'
  | 'pennant'

export interface ChartPatternDetection {
  pattern: ChartPattern
  startTime: number
  endTime: number
  confidence: number
  breakoutTarget?: number
  stopLoss?: number
  signal: 'bullish' | 'bearish' | 'neutral'
  points: Array<{
    time: number
    price: number
    role: 'support' | 'resistance' | 'breakout' | 'confirmation'
  }>
}

// Support and resistance levels
export interface SupportResistanceLevel {
  price: number
  strength: number
  touches: number
  firstTouch: number
  lastTouch: number
  type: 'support' | 'resistance'
  status: 'active' | 'broken' | 'confirmed'
}

// Market analysis results
export interface MarketAnalysis {
  symbol: string
  timeframe: string
  timestamp: number
  trend: {
    direction: 'bullish' | 'bearish' | 'sideways'
    strength: number
    confidence: number
  }
  indicators: IndicatorResult[]
  patterns: {
    candlestick: PatternDetection[]
    chart: ChartPatternDetection[]
  }
  levels: {
    support: SupportResistanceLevel[]
    resistance: SupportResistanceLevel[]
  }
  signals: Array<{
    type: 'buy' | 'sell' | 'hold'
    source: string
    confidence: number
    message: string
    timestamp: number
  }>
  score: {
    technical: number
    momentum: number
    trend: number
    overall: number
  }
}

// User Indicator Management Types
export interface UserIndicator {
  id: string
  userId: string
  symbol: string
  type: IndicatorType
  name: string
  parameters: Record<string, any>
  visible: boolean
  style?: Record<string, any>
  position: number
  createdAt: string
  updatedAt: string
}

// API Request/Response Types
export interface CreateIndicatorRequest {
  symbol: string
  type: IndicatorType
  name: string
  parameters: Record<string, any>
  visible?: boolean
  style?: Record<string, any>
  position?: number
}

export interface UpdateIndicatorRequest {
  name?: string
  parameters?: Record<string, any>
  visible?: boolean
  style?: Record<string, any>
  position?: number
}

export interface CalculateIndicatorRequest {
  symbol: string
  type: IndicatorType
  parameters: Record<string, any>
}

export interface UpdatePositionsRequest {
  positions: Array<{
    id: string
    position: number
  }>
}

export interface IndicatorResponse {
  success: boolean
  data?: UserIndicator
  error?: string
}

export interface IndicatorsResponse {
  success: boolean
  data?: UserIndicator[]
  error?: string
}

export interface CalculateIndicatorResponse {
  success: boolean
  data?: IndicatorResult
  error?: string
}

// Style configuration
export interface IndicatorStyle {
  color?: string
  lineWidth?: number
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  opacity?: number
}

// Indicator configuration for charts
export interface ChartIndicatorConfig {
  id: string
  type: IndicatorType
  name: string
  parameters: Record<string, any>
  style: IndicatorStyle
  visible: boolean
}

// Predefined indicator configurations
export const DEFAULT_INDICATOR_CONFIGS: Record<IndicatorType, Record<string, any>> = {
  sma: {
    period: 20,
  },
  ema: {
    period: 20,
  },
  rsi: {
    period: 14,
  },
  macd: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  },
  bollinger: {
    period: 20,
    standardDeviations: 2,
  },
  stochastic: {
    kPeriod: 14,
    dPeriod: 3,
    smooth: 3,
  },
  williams_r: {
    period: 14,
  },
}

export const DEFAULT_INDICATOR_STYLES: Record<IndicatorType, IndicatorStyle> = {
  sma: {
    color: '#2196F3',
    lineWidth: 2,
    lineStyle: 'solid',
    opacity: 1,
  },
  ema: {
    color: '#FF9800',
    lineWidth: 2,
    lineStyle: 'solid',
    opacity: 1,
  },
  rsi: {
    color: '#9C27B0',
    lineWidth: 2,
    lineStyle: 'solid',
    opacity: 1,
  },
  macd: {
    color: '#4CAF50',
    lineWidth: 2,
    lineStyle: 'solid',
    opacity: 1,
  },
  bollinger: {
    color: '#F44336',
    lineWidth: 1,
    lineStyle: 'solid',
    opacity: 0.7,
  },
  stochastic: {
    color: '#E91E63',
    lineWidth: 2,
    lineStyle: 'solid',
    opacity: 1,
  },
  williams_r: {
    color: '#795548',
    lineWidth: 2,
    lineStyle: 'solid',
    opacity: 1,
  },
}

// Indicator metadata for UI
export interface IndicatorMetadata {
  name: string
  description: string
  category: 'trend' | 'momentum' | 'volatility' | 'volume'
  parameters: Array<{
    key: string
    label: string
    type: 'number' | 'select'
    default: any
    min?: number
    max?: number
    options?: Array<{ value: any; label: string }>
  }>
}

export const INDICATOR_METADATA: Record<IndicatorType, IndicatorMetadata> = {
  sma: {
    name: 'Simple Moving Average',
    description: 'Average price over a specified period',
    category: 'trend',
    parameters: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 200,
      },
    ],
  },
  ema: {
    name: 'Exponential Moving Average',
    description: 'Weighted moving average giving more weight to recent prices',
    category: 'trend',
    parameters: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 200,
      },
    ],
  },
  rsi: {
    name: 'Relative Strength Index',
    description: 'Momentum oscillator measuring speed and magnitude of price changes',
    category: 'momentum',
    parameters: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 14,
        min: 2,
        max: 50,
      },
    ],
  },
  macd: {
    name: 'MACD',
    description: 'Moving Average Convergence Divergence',
    category: 'momentum',
    parameters: [
      {
        key: 'fastPeriod',
        label: 'Fast Period',
        type: 'number',
        default: 12,
        min: 1,
        max: 50,
      },
      {
        key: 'slowPeriod',
        label: 'Slow Period',
        type: 'number',
        default: 26,
        min: 1,
        max: 100,
      },
      {
        key: 'signalPeriod',
        label: 'Signal Period',
        type: 'number',
        default: 9,
        min: 1,
        max: 50,
      },
    ],
  },
  bollinger: {
    name: 'Bollinger Bands',
    description: 'Volatility bands around a moving average',
    category: 'volatility',
    parameters: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 20,
        min: 2,
        max: 100,
      },
      {
        key: 'standardDeviations',
        label: 'Standard Deviations',
        type: 'number',
        default: 2,
        min: 0.1,
        max: 5,
      },
    ],
  },
  stochastic: {
    name: 'Stochastic',
    description: 'Momentum indicator comparing closing price to price range',
    category: 'momentum',
    parameters: [
      {
        key: 'kPeriod',
        label: 'K Period',
        type: 'number',
        default: 14,
        min: 1,
        max: 50,
      },
      {
        key: 'dPeriod',
        label: 'D Period',
        type: 'number',
        default: 3,
        min: 1,
        max: 20,
      },
      {
        key: 'smooth',
        label: 'Smooth',
        type: 'number',
        default: 3,
        min: 1,
        max: 20,
      },
    ],
  },
  williams_r: {
    name: 'Williams %R',
    description: 'Momentum indicator measuring overbought/oversold levels',
    category: 'momentum',
    parameters: [
      {
        key: 'period',
        label: 'Period',
        type: 'number',
        default: 14,
        min: 1,
        max: 50,
      },
    ],
  },
}
