// New organized type exports
export * from './core'
export * from './api'
export * from './ui'
export * from './business'

// Legacy compatibility exports for gradual migration
// These will be deprecated in future versions

// From api/contracts.ts
export type { ApiResponse as ApiContractResponse, NormalizedSymbol, NormalizedQuote, NormalizedCandleResponse } from './api/contracts'
export type { ApiError } from './api-contract'

// From old repository.ts
export type {
  SymbolFilter as RepositorySymbolFilter,
  CandleFilter as RepositoryCandleFilter,
} from './business'

// From old domains structure (backward compatibility)
export type { UserIndicators } from './core'
export type { CreateDrawingToolRequest } from './api'

// Legacy re-exports from domains
export type { User, Symbol, Quote, Candle } from './core'
export type { DrawingObject, DrawingToolType } from './ui'
export type { Order, Position, Portfolio } from './business'

// Chart constants
export { TIMEFRAMES as CHART_TIMEFRAMES, POPULAR_SYMBOLS, TIMEZONES } from '../constants/chart'
