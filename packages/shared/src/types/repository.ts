// Repository base types
export interface FindManyOptions {
  skip?: number
  take?: number
  orderBy?: Record<string, 'asc' | 'desc'>[]
}

export interface IBaseRepository<T, TCreate, TUpdate, TFilter = any> {
  create(data: TCreate): Promise<T>
  findById(id: string): Promise<T | null>
  findMany(filter?: TFilter, options?: FindManyOptions): Promise<T[]>
  update(id: string, data: TUpdate): Promise<T>
  delete(id: string): Promise<void>
  count(filter?: TFilter): Promise<number>
}

// Symbol repository types
export interface SymbolCreateInput {
  symbol: string
  description: string
  displaySymbol: string
  type: string
}

export interface SymbolUpdateInput {
  description?: string
  displaySymbol?: string
  type?: string
}

export interface SymbolUpsertInput {
  symbol: string
  description: string
  displaySymbol: string
  type: string
}

export interface SymbolFilter {
  symbol?: string
  type?: string
  description?: string
}

// Candle repository types
export interface CandleCreateInput {
  symbol: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface CandleUpdateInput {
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
}

export interface CandleUpsertInput {
  symbol: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface CandleFilter {
  symbol?: string
  fromTimestamp?: number
  toTimestamp?: number
}

// User preferences repository types
export interface UserPreferencesCreateInput {
  userId: string
  theme?: string
  chartType?: string
  timeframe?: string
  indicators?: string
}

export interface UserPreferencesUpdateInput {
  theme?: string
  chartType?: string
  timeframe?: string
  indicators?: string
}

export interface UserPreferencesUpsertInput {
  theme?: string
  chartType?: string
  timeframe?: string
  indicators?: string
}

export interface UserPreferencesFilter {
  userId?: string
  theme?: string
  chartType?: string
  timeframe?: string
}

export type UserIndicators = {
  name: string
  type: string
  parameters: Record<string, any>
  visible: boolean
}[]

// Repository error types
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 'NOT_FOUND', 404)
  }
}

export class DuplicateError extends RepositoryError {
  constructor(entity: string, field: string, value: string) {
    super(`${entity} with ${field} ${value} already exists`, 'DUPLICATE_ERROR', 409)
  }
}

export class ValidationError extends RepositoryError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}
