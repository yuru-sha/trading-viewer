import { PrismaClient, Candle, Prisma } from '@prisma/client'
import { BaseRepository, NotFoundError, FindManyOptions } from './BaseRepository'

export interface ICandleRepository {
  create(data: CandleCreateInput): Promise<Candle>
  findById(id: string): Promise<Candle | null>
  findBySymbolAndTimeRange(symbol: string, from: number, to: number): Promise<Candle[]>
  findLatestBySymbol(symbol: string, limit?: number): Promise<Candle[]>
  findMany(filter?: CandleFilter, options?: FindManyOptions): Promise<Candle[]>
  update(id: string, data: CandleUpdateInput): Promise<Candle>
  delete(id: string): Promise<void>
  count(filter?: CandleFilter): Promise<number>
  bulkCreate(data: CandleCreateInput[]): Promise<number>
  upsertCandle(data: CandleUpsertInput): Promise<Candle>
  deleteOldData(symbol: string, beforeTimestamp: number): Promise<number>
}

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

export class CandleRepository
  extends BaseRepository<Candle, CandleCreateInput, CandleUpdateInput, CandleFilter>
  implements ICandleRepository
{
  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  async create(data: CandleCreateInput): Promise<Candle> {
    try {
      return await this.prisma.candle.create({
        data,
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2002') {
          throw new Error(
            `Candle data for symbol ${data.symbol} at timestamp ${data.timestamp} already exists`
          )
        }
      }
      throw error
    }
  }

  async findById(id: string): Promise<Candle | null> {
    return await this.prisma.candle.findUnique({
      where: { id },
    })
  }

  async findBySymbolAndTimeRange(symbol: string, from: number, to: number): Promise<Candle[]> {
    return await this.prisma.candle.findMany({
      where: {
        symbol,
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    })
  }

  async findLatestBySymbol(symbol: string, limit = 100): Promise<Candle[]> {
    return await this.prisma.candle.findMany({
      where: { symbol },
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
    })
  }

  async findMany(filter?: CandleFilter, options?: FindManyOptions): Promise<Candle[]> {
    const where: Prisma.CandleWhereInput = {}

    if (filter) {
      if (filter.symbol) {
        where.symbol = filter.symbol
      }
      if (filter.fromTimestamp || filter.toTimestamp) {
        where.timestamp = {}
        if (filter.fromTimestamp) {
          where.timestamp.gte = filter.fromTimestamp
        }
        if (filter.toTimestamp) {
          where.timestamp.lte = filter.toTimestamp
        }
      }
    }

    return await this.prisma.candle.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ timestamp: 'asc' }],
    })
  }

  async update(id: string, data: CandleUpdateInput): Promise<Candle> {
    try {
      return await this.prisma.candle.update({
        where: { id },
        data,
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Candle', id)
        }
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.candle.delete({
        where: { id },
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2025') {
          throw new NotFoundError('Candle', id)
        }
      }
      throw error
    }
  }

  async count(filter?: CandleFilter): Promise<number> {
    const where: Prisma.CandleWhereInput = {}

    if (filter) {
      if (filter.symbol) {
        where.symbol = filter.symbol
      }
      if (filter.fromTimestamp || filter.toTimestamp) {
        where.timestamp = {}
        if (filter.fromTimestamp) {
          where.timestamp.gte = filter.fromTimestamp
        }
        if (filter.toTimestamp) {
          where.timestamp.lte = filter.toTimestamp
        }
      }
    }

    return await this.prisma.candle.count({ where })
  }

  async bulkCreate(data: CandleCreateInput[]): Promise<number> {
    const result = await this.prisma.candle.createMany({
      data,
      skipDuplicates: true,
    })
    return result.count
  }

  async upsertCandle(data: CandleUpsertInput): Promise<Candle> {
    return await this.prisma.candle.upsert({
      where: {
        symbol_timestamp: {
          symbol: data.symbol,
          timestamp: data.timestamp,
        },
      },
      update: {
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
      },
      create: data,
    })
  }

  async deleteOldData(symbol: string, beforeTimestamp: number): Promise<number> {
    const result = await this.prisma.candle.deleteMany({
      where: {
        symbol,
        timestamp: {
          lt: beforeTimestamp,
        },
      },
    })
    return result.count
  }
}
