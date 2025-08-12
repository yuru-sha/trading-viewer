import { PrismaClient } from '@prisma/client'

// Base repository interface for common CRUD operations
export interface IBaseRepository<T, TCreate, TUpdate, TFilter = any> {
  create(data: TCreate): Promise<T>
  findById(id: string): Promise<T | null>
  findMany(filter?: TFilter, options?: FindManyOptions): Promise<T[]>
  update(id: string, data: TUpdate): Promise<T>
  delete(id: string): Promise<void>
  count(filter?: TFilter): Promise<number>
}

export interface FindManyOptions {
  skip?: number
  take?: number
  orderBy?: Record<string, 'asc' | 'desc'>[]
}

// Abstract base repository implementation
export abstract class BaseRepository<T, TCreate, TUpdate, TFilter = any>
  implements IBaseRepository<T, TCreate, TUpdate, TFilter>
{
  constructor(protected readonly prisma: PrismaClient) {}

  abstract create(data: TCreate): Promise<T>
  abstract findById(id: string): Promise<T | null>
  abstract findMany(filter?: TFilter, options?: FindManyOptions): Promise<T[]>
  abstract update(id: string, data: TUpdate): Promise<T>
  abstract delete(id: string): Promise<void>
  abstract count(filter?: TFilter): Promise<number>
}

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
