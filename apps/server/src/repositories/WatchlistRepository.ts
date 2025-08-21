import { Watchlist } from '@prisma/client'
import { BaseRepository, NotFoundError, DuplicateError, FindManyOptions } from './BaseRepository'

export interface IWatchlistRepository {
  findByUserId(userId: string, options?: FindManyOptions): Promise<Watchlist[]>
  findByUserIdAndSymbol(userId: string, symbol: string): Promise<Watchlist | null>
  addSymbolToWatchlist(userId: string, symbol: string, name: string): Promise<Watchlist>
  removeSymbolFromWatchlist(userId: string, symbol: string): Promise<void>
  updatePosition(id: string, position: number): Promise<Watchlist>
  reorderWatchlist(
    userId: string,
    symbolPositions: Array<{ symbol: string; position: number }>
  ): Promise<number>
  getUserSymbols(userId: string): Promise<string[]>
}

// Input types
export interface WatchlistCreateInput {
  userId: string
  symbol: string
  name: string
  position?: number
  currency?: string
  exchange?: string
  timezone?: string
}

export interface WatchlistUpdateInput {
  symbol?: string
  name?: string
  position?: number
  currency?: string
  exchange?: string
  timezone?: string
}

export interface WatchlistFilter {
  userId?: string
  symbol?: string
  name?: string
  currency?: string
  exchange?: string
  symbols?: string[]
}

export class WatchlistRepository
  extends BaseRepository<Watchlist, WatchlistCreateInput, WatchlistUpdateInput, WatchlistFilter>
  implements IWatchlistRepository
{
  async create(data: WatchlistCreateInput): Promise<Watchlist> {
    try {
      // Get the next position if not provided
      let position = data.position
      if (position === undefined) {
        const maxPosition = await this.prisma.watchlist.aggregate({
          _max: {
            position: true,
          },
          where: {
            userId: data.userId,
          },
        })
        position = (maxPosition._max.position || 0) + 1
      }

      return await this.prisma.watchlist.create({
        data: {
          userId: data.userId,
          symbol: data.symbol,
          name: data.name,
          position,
          currency: data.currency || 'USD',
          exchange: data.exchange,
          timezone: data.timezone,
        },
      })
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new DuplicateError('Watchlist', 'symbol', `${data.userId}-${data.symbol}`)
      }
      throw error
    }
  }

  async findById(id: string): Promise<Watchlist | null> {
    return await this.prisma.watchlist.findUnique({
      where: { id },
    })
  }

  async findByUserId(userId: string, options?: FindManyOptions): Promise<Watchlist[]> {
    return await this.prisma.watchlist.findMany({
      where: { userId },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ position: 'asc' }],
    })
  }

  async findByUserIdAndSymbol(userId: string, symbol: string): Promise<Watchlist | null> {
    return await this.prisma.watchlist.findUnique({
      where: {
        userId_symbol: {
          userId,
          symbol,
        },
      },
    })
  }

  async findMany(filter?: WatchlistFilter, options?: FindManyOptions): Promise<Watchlist[]> {
    const where: any = {}

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId
      }
      if (filter.symbol) {
        where.symbol = filter.symbol
      }
      if (filter.name) {
        where.name = { contains: filter.name, mode: 'insensitive' }
      }
      if (filter.currency) {
        where.currency = filter.currency
      }
      if (filter.exchange) {
        where.exchange = filter.exchange
      }
      if (filter.symbols && filter.symbols.length > 0) {
        where.symbol = { in: filter.symbols }
      }
    }

    return await this.prisma.watchlist.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ position: 'asc' }],
    })
  }

  async update(id: string, data: WatchlistUpdateInput): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.update({
        where: { id },
        data,
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Watchlist', id)
      }
      if (error.code === 'P2002') {
        throw new DuplicateError('Watchlist', 'symbol', data.symbol || '')
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.watchlist.delete({
        where: { id },
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('Watchlist', id)
      }
      throw error
    }
  }

  async count(filter?: WatchlistFilter): Promise<number> {
    const where: any = {}

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId
      }
      if (filter.symbol) {
        where.symbol = filter.symbol
      }
      if (filter.name) {
        where.name = { contains: filter.name, mode: 'insensitive' }
      }
      if (filter.currency) {
        where.currency = filter.currency
      }
      if (filter.exchange) {
        where.exchange = filter.exchange
      }
      if (filter.symbols && filter.symbols.length > 0) {
        where.symbol = { in: filter.symbols }
      }
    }

    return await this.prisma.watchlist.count({ where })
  }

  async addSymbolToWatchlist(userId: string, symbol: string, name: string): Promise<Watchlist> {
    return await this.create({
      userId,
      symbol,
      name,
    })
  }

  async removeSymbolFromWatchlist(userId: string, symbol: string): Promise<void> {
    const watchlistItem = await this.findByUserIdAndSymbol(userId, symbol)
    if (!watchlistItem) {
      throw new NotFoundError('Watchlist', `${userId}-${symbol}`)
    }
    await this.delete(watchlistItem.id)
  }

  async updatePosition(id: string, position: number): Promise<Watchlist> {
    return await this.update(id, { position })
  }

  async reorderWatchlist(
    userId: string,
    symbolPositions: Array<{ symbol: string; position: number }>
  ): Promise<number> {
    let updateCount = 0

    // Use transaction to ensure consistency
    await this.prisma.$transaction(async tx => {
      for (const { symbol, position } of symbolPositions) {
        await tx.watchlist.updateMany({
          where: {
            userId,
            symbol,
          },
          data: {
            position,
          },
        })
        updateCount++
      }
    })

    return updateCount
  }

  async getUserSymbols(userId: string): Promise<string[]> {
    const watchlistItems = await this.prisma.watchlist.findMany({
      where: { userId },
      select: { symbol: true },
      orderBy: [{ position: 'asc' }],
    })

    return watchlistItems.map(item => item.symbol)
  }
}
