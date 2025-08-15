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
