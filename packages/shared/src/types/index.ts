// Re-export everything from domain-organized types
export * from './domains'

// Legacy compatibility exports for gradual migration
export type { ApiResponse as ApiContractResponse } from './api-contract'
export type {
  SymbolFilter as RepositorySymbolFilter,
  CandleFilter as RepositoryCandleFilter,
} from './repository'

// Re-export specific types that server needs
export type { 
  NormalizedSymbol, 
  NormalizedQuote, 
  NormalizedCandleResponse 
} from './domains/market'
export type { UserIndicators } from './domains/auth'
