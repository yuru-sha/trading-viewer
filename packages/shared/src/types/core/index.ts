// Core types - fundamental entities and data structures
export * from './user'
export * from './chart'

// Market types with specific exports to avoid conflicts
export type {
  Symbol,
  Quote,
  Candle,
  CompanyProfile as CoreCompanyProfile,
  NewsArticle,
} from './market'

// Common utility types
export interface BaseEntity {
  id: string
  createdAt: number
  updatedAt: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ErrorInfo {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: number
}

export type Status = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T = any> {
  status: Status
  data?: T
  error?: ErrorInfo
}
