import { DrawingTool } from '@prisma/client'
import { BaseRepository, NotFoundError, FindManyOptions } from './BaseRepository'

export interface IDrawingToolRepository {
  findByUserId(userId: string, options?: FindManyOptions): Promise<DrawingTool[]>
  findByUserIdAndSymbol(
    userId: string,
    symbol: string,
    options?: FindManyOptions
  ): Promise<DrawingTool[]>
  findByUserIdSymbolAndTimeframe(
    userId: string,
    symbol: string,
    timeframe: string,
    options?: FindManyOptions
  ): Promise<DrawingTool[]>
  deleteExpired(): Promise<number>
  updateLastAccessed(id: string): Promise<DrawingTool>
  findExpired(before: Date): Promise<DrawingTool[]>
  bulkDelete(ids: string[]): Promise<number>
}

// Input types
export interface DrawingToolCreateInput {
  userId: string
  symbol: string
  timeframe?: string
  type: string
  points: string
  style: string
  text?: string
  locked?: boolean
  visible?: boolean
  expiresAt?: Date
}

export interface DrawingToolUpdateInput {
  symbol?: string
  timeframe?: string
  type?: string
  points?: string
  style?: string
  text?: string
  locked?: boolean
  visible?: boolean
  expiresAt?: Date
}

export interface DrawingToolFilter {
  userId?: string
  symbol?: string
  timeframe?: string
  type?: string
  locked?: boolean
  visible?: boolean
  expiresAt?: {
    before?: Date
    after?: Date
  }
}

export class DrawingToolRepository
  extends BaseRepository<
    DrawingTool,
    DrawingToolCreateInput,
    DrawingToolUpdateInput,
    DrawingToolFilter
  >
  implements IDrawingToolRepository
{
  async create(data: DrawingToolCreateInput): Promise<DrawingTool> {
    return await this.prisma.drawingTool.create({
      data: {
        userId: data.userId,
        symbol: data.symbol,
        timeframe: data.timeframe || '1D',
        type: data.type,
        points: data.points,
        style: data.style,
        text: data.text,
        locked: data.locked || false,
        visible: data.visible !== false,
        expiresAt: data.expiresAt,
      },
    })
  }

  async findById(id: string): Promise<DrawingTool | null> {
    const drawingTool = await this.prisma.drawingTool.findUnique({
      where: { id },
    })

    if (drawingTool) {
      await this.updateLastAccessed(id)
    }

    return drawingTool
  }

  async findByUserId(userId: string, options?: FindManyOptions): Promise<DrawingTool[]> {
    return await this.prisma.drawingTool.findMany({
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
  ): Promise<DrawingTool[]> {
    return await this.prisma.drawingTool.findMany({
      where: {
        userId,
        symbol,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ createdAt: 'desc' }],
    })
  }

  async findByUserIdSymbolAndTimeframe(
    userId: string,
    symbol: string,
    timeframe: string,
    options?: FindManyOptions
  ): Promise<DrawingTool[]> {
    return await this.prisma.drawingTool.findMany({
      where: {
        userId,
        symbol,
        timeframe,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ createdAt: 'desc' }],
    })
  }

  async findMany(filter?: DrawingToolFilter, options?: FindManyOptions): Promise<DrawingTool[]> {
    const where: any = {}

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId
      }
      if (filter.symbol) {
        where.symbol = filter.symbol
      }
      if (filter.timeframe) {
        where.timeframe = filter.timeframe
      }
      if (filter.type) {
        where.type = filter.type
      }
      if (typeof filter.locked === 'boolean') {
        where.locked = filter.locked
      }
      if (typeof filter.visible === 'boolean') {
        where.visible = filter.visible
      }
      if (filter.expiresAt) {
        where.expiresAt = {}
        if (filter.expiresAt.before) {
          where.expiresAt.lt = filter.expiresAt.before
        }
        if (filter.expiresAt.after) {
          where.expiresAt.gt = filter.expiresAt.after
        }
      }
    }

    return await this.prisma.drawingTool.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ lastAccessedAt: 'desc' }],
    })
  }

  async update(id: string, data: DrawingToolUpdateInput): Promise<DrawingTool> {
    try {
      const result = await this.prisma.drawingTool.update({
        where: { id },
        data,
      })

      await this.updateLastAccessed(id)
      return result
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('DrawingTool', id)
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.drawingTool.delete({
        where: { id },
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('DrawingTool', id)
      }
      throw error
    }
  }

  async count(filter?: DrawingToolFilter): Promise<number> {
    const where: any = {}

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId
      }
      if (filter.symbol) {
        where.symbol = filter.symbol
      }
      if (filter.timeframe) {
        where.timeframe = filter.timeframe
      }
      if (filter.type) {
        where.type = filter.type
      }
      if (typeof filter.locked === 'boolean') {
        where.locked = filter.locked
      }
      if (typeof filter.visible === 'boolean') {
        where.visible = filter.visible
      }
      if (filter.expiresAt) {
        where.expiresAt = {}
        if (filter.expiresAt.before) {
          where.expiresAt.lt = filter.expiresAt.before
        }
        if (filter.expiresAt.after) {
          where.expiresAt.gt = filter.expiresAt.after
        }
      }
    }

    return await this.prisma.drawingTool.count({ where })
  }

  async updateLastAccessed(id: string): Promise<DrawingTool> {
    return await this.prisma.drawingTool.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
    })
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.drawingTool.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    })
    return result.count
  }

  async findExpired(before: Date): Promise<DrawingTool[]> {
    return await this.prisma.drawingTool.findMany({
      where: {
        expiresAt: {
          lte: before,
        },
      },
    })
  }

  async bulkDelete(ids: string[]): Promise<number> {
    const result = await this.prisma.drawingTool.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })
    return result.count
  }
}
