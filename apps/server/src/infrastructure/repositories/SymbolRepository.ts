import { PrismaClient, Symbol, Prisma } from '@prisma/client'
import { BaseRepository, NotFoundError, DuplicateError, FindManyOptions } from './BaseRepository'

export interface ISymbolRepository {
  create(data: SymbolCreateInput): Promise<Symbol>
  findById(id: string): Promise<Symbol | null>
  findBySymbol(symbol: string): Promise<Symbol | null>
  findMany(filter?: SymbolFilter, options?: FindManyOptions): Promise<Symbol[]>
  search(query: string, limit?: number): Promise<Symbol[]>
  update(id: string, data: SymbolUpdateInput): Promise<Symbol>
  delete(id: string): Promise<void>
  count(filter?: SymbolFilter): Promise<number>
  upsertBySymbol(data: SymbolUpsertInput): Promise<Symbol>
}

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

export class SymbolRepository
  extends BaseRepository<Symbol, SymbolCreateInput, SymbolUpdateInput, SymbolFilter>
  implements ISymbolRepository
{
  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  async create(data: SymbolCreateInput): Promise<Symbol> {
    try {
      return await this.prisma.symbol.create({
        data,
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2002') {
          throw new DuplicateError('Symbol', 'symbol', data.symbol)
        }
      }
      throw error
    }
  }

  async findById(id: string): Promise<Symbol | null> {
    return await this.prisma.symbol.findUnique({
      where: { id },
    })
  }

  async findBySymbol(symbol: string): Promise<Symbol | null> {
    return await this.prisma.symbol.findUnique({
      where: { symbol },
    })
  }

  async findMany(filter?: SymbolFilter, options?: FindManyOptions): Promise<Symbol[]> {
    const where: Prisma.SymbolWhereInput = {}

    if (filter) {
      if (filter.symbol) {
        where.symbol = { contains: filter.symbol }
      }
      if (filter.type) {
        where.type = filter.type
      }
      if (filter.description) {
        where.description = { contains: filter.description }
      }
    }

    return await this.prisma.symbol.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy,
    })
  }

  async search(query: string, limit = 50): Promise<Symbol[]> {
    return await this.prisma.symbol.findMany({
      where: {
        OR: [
          { symbol: { contains: query } },
          { description: { contains: query } },
          { displaySymbol: { contains: query } },
        ],
      },
      take: limit,
      orderBy: [{ symbol: 'asc' }, { description: 'asc' }],
    })
  }

  async update(id: string, data: SymbolUpdateInput): Promise<Symbol> {
    try {
      return await this.prisma.symbol.update({
        where: { id },
        data,
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Symbol', id)
        }
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.symbol.delete({
        where: { id },
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Symbol', id)
        }
      }
      throw error
    }
  }

  async count(filter?: SymbolFilter): Promise<number> {
    const where: Prisma.SymbolWhereInput = {}

    if (filter) {
      if (filter.symbol) {
        where.symbol = { contains: filter.symbol }
      }
      if (filter.type) {
        where.type = filter.type
      }
      if (filter.description) {
        where.description = { contains: filter.description }
      }
    }

    return await this.prisma.symbol.count({ where })
  }

  async upsertBySymbol(data: SymbolUpsertInput): Promise<Symbol> {
    return await this.prisma.symbol.upsert({
      where: { symbol: data.symbol },
      update: {
        description: data.description,
        displaySymbol: data.displaySymbol,
        type: data.type,
      },
      create: data,
    })
  }
}
