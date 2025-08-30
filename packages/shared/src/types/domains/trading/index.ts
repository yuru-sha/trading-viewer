// Trading domain types - Organized for analysis and simulation only
// This system is for market analysis and does not support actual trading

// Note: Order types are for simulation/paper trading only
export * from './orders'
export * from './portfolio'
export * from './simulation'
export * from './analysis'

// Re-export commonly used types at top level for convenience
export type { Order, OrderType, OrderSide, OrderStatus } from './orders'

export type { Position, Portfolio } from './portfolio'

export type { TradingSimulation, SimulationSettings, SimulationResults } from './simulation'

export type {
  PriceAlert,
  MarketAnalysis,
  TechnicalPattern,
  MarketSentiment,
  TradingSignal,
} from './analysis'
