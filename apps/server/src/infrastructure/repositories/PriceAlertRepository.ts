import { PriceAlert } from '@prisma/client'
import { BaseRepository, NotFoundError, FindManyOptions } from './BaseRepository'

export interface IPriceAlertRepository {
  findByUserId(userId: string, options?: FindManyOptions): Promise<PriceAlert[]>
  findByUserIdAndSymbol(
    userId: string,
    symbol: string,
    options?: FindManyOptions
  ): Promise<PriceAlert[]>
  findEnabledAlerts(options?: FindManyOptions): Promise<PriceAlert[]>
  findTriggeredAlerts(options?: FindManyOptions): Promise<PriceAlert[]>
  findByType(type: string, options?: FindManyOptions): Promise<PriceAlert[]>
  trigger(id: string): Promise<PriceAlert>
  enable(id: string): Promise<PriceAlert>
  disable(id: string): Promise<PriceAlert>
  bulkUpdateStatus(ids: string[], enabled: boolean): Promise<number>
}

// Input types
export interface PriceAlertCreateInput {
  userId: string
  symbol: string
  type: string // 'above', 'below', 'crosses'
  price: number
  percentageChange?: number
  message?: string
  enabled?: boolean
  currency?: string
  exchange?: string
  timezone?: string
}

export interface PriceAlertUpdateInput {
  symbol?: string
  type?: string
  price?: number
  percentageChange?: number
  message?: string
  enabled?: boolean
  currency?: string
  exchange?: string
  timezone?: string
  triggeredAt?: Date
}

export interface PriceAlertFilter {
  userId?: string
  symbol?: string
  type?: string
  enabled?: boolean
  triggered?: boolean
  priceRange?: {
    min?: number
    max?: number
  }
  currency?: string
  exchange?: string
}

export class PriceAlertRepository
  extends BaseRepository<PriceAlert, PriceAlertCreateInput, PriceAlertUpdateInput, PriceAlertFilter>
  implements IPriceAlertRepository
{
  async create(data: PriceAlertCreateInput): Promise<PriceAlert> {
    return await this.prisma.priceAlert.create({
      data: {
        userId: data.userId,
        symbol: data.symbol,
        type: data.type,
        price: data.price,
        percentageChange: data.percentageChange,
        message: data.message,
        enabled: data.enabled !== false,
        currency: data.currency || 'USD',
        exchange: data.exchange,
        timezone: data.timezone,
      },
    })
  }

  async findById(id: string): Promise<PriceAlert | null> {
    return await this.prisma.priceAlert.findUnique({
      where: { id },
    })
  }

  async findByUserId(userId: string, options?: FindManyOptions): Promise<PriceAlert[]> {
    return await this.prisma.priceAlert.findMany({
      where: { userId },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ createdAt: 'desc' }],
    })
  }

  async findByUserIdAndSymbol(
    userId: string,
    symbol: string,
    options?: FindManyOptions
  ): Promise<PriceAlert[]> {
    return await this.prisma.priceAlert.findMany({
      where: {
        userId,
        symbol,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ createdAt: 'desc' }],
    })
  }

  async findEnabledAlerts(options?: FindManyOptions): Promise<PriceAlert[]> {
    return await this.prisma.priceAlert.findMany({
      where: {
        enabled: true,
        triggeredAt: null,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ createdAt: 'asc' }],
    })
  }

  async findTriggeredAlerts(options?: FindManyOptions): Promise<PriceAlert[]> {
    return await this.prisma.priceAlert.findMany({
      where: {
        triggeredAt: {
          not: null,
        },
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ triggeredAt: 'desc' }],
    })
  }

  async findByType(type: string, options?: FindManyOptions): Promise<PriceAlert[]> {
    return await this.prisma.priceAlert.findMany({
      where: {
        type,
        enabled: true,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ createdAt: 'desc' }],
    })
  }

  async findMany(filter?: PriceAlertFilter, options?: FindManyOptions): Promise<PriceAlert[]> {
    const where: any = {}

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId
      }
      if (filter.symbol) {
        where.symbol = filter.symbol
      }
      if (filter.type) {
        where.type = filter.type
      }
      if (typeof filter.enabled === 'boolean') {
        where.enabled = filter.enabled
      }
      if (typeof filter.triggered === 'boolean') {
        where.triggeredAt = filter.triggered ? { not: null } : null
      }
      if (filter.priceRange) {
        where.price = {}
        if (filter.priceRange.min !== undefined) {
          where.price.gte = filter.priceRange.min
        }
        if (filter.priceRange.max !== undefined) {
          where.price.lte = filter.priceRange.max
        }
      }
      if (filter.currency) {
        where.currency = filter.currency
      }
      if (filter.exchange) {
        where.exchange = filter.exchange
      }
    }

    return await this.prisma.priceAlert.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ createdAt: 'desc' }],
    })
  }

  async update(id: string, data: PriceAlertUpdateInput): Promise<PriceAlert> {
    try {
      return await this.prisma.priceAlert.update({
        where: { id },
        data,
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('PriceAlert', id)
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.priceAlert.delete({
        where: { id },
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('PriceAlert', id)
      }
      throw error
    }
  }

  async count(filter?: PriceAlertFilter): Promise<number> {
    const where: any = {}

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId
      }
      if (filter.symbol) {
        where.symbol = filter.symbol
      }
      if (filter.type) {
        where.type = filter.type
      }
      if (typeof filter.enabled === 'boolean') {
        where.enabled = filter.enabled
      }
      if (typeof filter.triggered === 'boolean') {
        where.triggeredAt = filter.triggered ? { not: null } : null
      }
      if (filter.priceRange) {
        where.price = {}
        if (filter.priceRange.min !== undefined) {
          where.price.gte = filter.priceRange.min
        }
        if (filter.priceRange.max !== undefined) {
          where.price.lte = filter.priceRange.max
        }
      }
      if (filter.currency) {
        where.currency = filter.currency
      }
      if (filter.exchange) {
        where.exchange = filter.exchange
      }
    }

    return await this.prisma.priceAlert.count({ where })
  }

  async trigger(id: string): Promise<PriceAlert> {
    return await this.update(id, {
      triggeredAt: new Date(),
      enabled: false, // Disable after triggering
    })
  }

  async enable(id: string): Promise<PriceAlert> {
    return await this.update(id, {
      enabled: true,
      triggeredAt: null, // Clear trigger status
    })
  }

  async disable(id: string): Promise<PriceAlert> {
    return await this.update(id, { enabled: false })
  }

  async bulkUpdateStatus(ids: string[], enabled: boolean): Promise<number> {
    const result = await this.prisma.priceAlert.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        enabled,
        ...(enabled && { triggeredAt: null }), // Clear trigger status if enabling
      },
    })
    return result.count
  }
}
