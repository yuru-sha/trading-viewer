// Market analysis and visualization types

export interface PriceAlert {
  id: string
  userId: string
  symbol: string
  condition: 'above' | 'below' | 'crosses'
  targetPrice: number
  message?: string
  isActive: boolean
  triggeredAt?: number
  createdAt: number
  expiresAt?: number
}

export interface MarketAnalysis {
  symbol: string
  timestamp: number
  trend: 'bullish' | 'bearish' | 'neutral'
  support: number[]
  resistance: number[]
  volume: VolumeAnalysis
  momentum: MomentumIndicators
  volatility: VolatilityMetrics
}

export interface VolumeAnalysis {
  current: number
  average: number
  trend: 'increasing' | 'decreasing' | 'stable'
  buyVolume: number
  sellVolume: number
  volumeRatio: number
}

export interface MomentumIndicators {
  rsi: number
  macd: {
    value: number
    signal: number
    histogram: number
  }
  stochastic: {
    k: number
    d: number
  }
  momentum: number
  roc: number // Rate of Change
}

export interface VolatilityMetrics {
  atr: number // Average True Range
  standardDeviation: number
  historicalVolatility: number
  impliedVolatility?: number
  bollingerBands: {
    upper: number
    middle: number
    lower: number
    width: number
  }
}

export interface TechnicalPattern {
  type: PatternType
  confidence: number
  startTime: number
  endTime?: number
  priceTarget?: number
  stopLoss?: number
  description: string
}

export type PatternType =
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'double_top'
  | 'double_bottom'
  | 'triangle_ascending'
  | 'triangle_descending'
  | 'triangle_symmetrical'
  | 'wedge_rising'
  | 'wedge_falling'
  | 'flag'
  | 'pennant'
  | 'channel'
  | 'cup_and_handle'

export interface MarketSentiment {
  symbol: string
  timestamp: number
  overall: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish'
  scores: {
    technical: number // -100 to 100
    volume: number
    momentum: number
    volatility: number
  }
  signals: TradingSignal[]
}

export interface TradingSignal {
  type: 'buy' | 'sell' | 'hold'
  strength: 'strong' | 'moderate' | 'weak'
  indicator: string
  reason: string
  timestamp: number
}
