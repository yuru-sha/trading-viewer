import { PrismaClient, UserPreferences, Prisma } from '@prisma/client'
import { BaseRepository, NotFoundError, FindManyOptions } from './BaseRepository'

export interface IUserPreferencesRepository {
  create(data: UserPreferencesCreateInput): Promise<UserPreferences>
  findById(id: string): Promise<UserPreferences | null>
  findByUserId(userId: string): Promise<UserPreferences | null>
  findMany(filter?: UserPreferencesFilter, options?: FindManyOptions): Promise<UserPreferences[]>
  update(id: string, data: UserPreferencesUpdateInput): Promise<UserPreferences>
  updateByUserId(userId: string, data: UserPreferencesUpdateInput): Promise<UserPreferences>
  delete(id: string): Promise<void>
  deleteByUserId(userId: string): Promise<void>
  count(filter?: UserPreferencesFilter): Promise<number>
  upsertByUserId(userId: string, data: UserPreferencesUpsertInput): Promise<UserPreferences>
}

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

export class UserPreferencesRepository
  extends BaseRepository<
    UserPreferences,
    UserPreferencesCreateInput,
    UserPreferencesUpdateInput,
    UserPreferencesFilter
  >
  implements IUserPreferencesRepository
{
  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  async create(data: UserPreferencesCreateInput): Promise<UserPreferences> {
    try {
      return await this.prisma.userPreferences.create({
        data: {
          userId: data.userId,
          theme: data.theme || 'dark',
          chartType: data.chartType || 'candlestick',
          timeframe: data.timeframe || '1D',
          indicators: data.indicators || '[]',
        },
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2002') {
          throw new Error(`User preferences for user ${data.userId} already exist`)
        }
      }
      throw error
    }
  }

  async findById(id: string): Promise<UserPreferences | null> {
    return await this.prisma.userPreferences.findUnique({
      where: { id },
    })
  }

  async findByUserId(userId: string): Promise<UserPreferences | null> {
    return await this.prisma.userPreferences.findUnique({
      where: { userId },
    })
  }

  async findMany(
    filter?: UserPreferencesFilter,
    options?: FindManyOptions
  ): Promise<UserPreferences[]> {
    const where: Prisma.UserPreferencesWhereInput = {}

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId
      }
      if (filter.theme) {
        where.theme = filter.theme
      }
      if (filter.chartType) {
        where.chartType = filter.chartType
      }
      if (filter.timeframe) {
        where.timeframe = filter.timeframe
      }
    }

    return await this.prisma.userPreferences.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ updatedAt: 'desc' }],
    })
  }

  async update(id: string, data: UserPreferencesUpdateInput): Promise<UserPreferences> {
    try {
      return await this.prisma.userPreferences.update({
        where: { id },
        data,
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2025') {
          throw new NotFoundError('UserPreferences', id)
        }
      }
      throw error
    }
  }

  async updateByUserId(userId: string, data: UserPreferencesUpdateInput): Promise<UserPreferences> {
    try {
      return await this.prisma.userPreferences.update({
        where: { userId },
        data,
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2025') {
          throw new NotFoundError('UserPreferences', `userId: ${userId}`)
        }
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.userPreferences.delete({
        where: { id },
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2025') {
          throw new NotFoundError('UserPreferences', id)
        }
      }
      throw error
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    try {
      await this.prisma.userPreferences.delete({
        where: { userId },
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2025') {
          throw new NotFoundError('UserPreferences', `userId: ${userId}`)
        }
      }
      throw error
    }
  }

  async count(filter?: UserPreferencesFilter): Promise<number> {
    const where: Prisma.UserPreferencesWhereInput = {}

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId
      }
      if (filter.theme) {
        where.theme = filter.theme
      }
      if (filter.chartType) {
        where.chartType = filter.chartType
      }
      if (filter.timeframe) {
        where.timeframe = filter.timeframe
      }
    }

    return await this.prisma.userPreferences.count({ where })
  }

  async upsertByUserId(userId: string, data: UserPreferencesUpsertInput): Promise<UserPreferences> {
    return await this.prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        theme: data.theme || 'dark',
        chartType: data.chartType || 'candlestick',
        timeframe: data.timeframe || '1D',
        indicators: data.indicators || '[]',
      },
    })
  }

  // Helper methods for indicator management
  async getIndicators(userId: string): Promise<UserIndicators> {
    const prefs = await this.findByUserId(userId)
    if (!prefs) {
      return []
    }

    try {
      return JSON.parse(prefs.indicators)
    } catch {
      return []
    }
  }

  async updateIndicators(userId: string, indicators: UserIndicators): Promise<UserPreferences> {
    const indicatorsJson = JSON.stringify(indicators)
    return await this.upsertByUserId(userId, { indicators: indicatorsJson })
  }

  async addIndicator(userId: string, indicator: UserIndicators[0]): Promise<UserPreferences> {
    const currentIndicators = await this.getIndicators(userId)
    const updatedIndicators = [...currentIndicators, indicator]
    return await this.updateIndicators(userId, updatedIndicators)
  }

  async removeIndicator(userId: string, indicatorName: string): Promise<UserPreferences> {
    const currentIndicators = await this.getIndicators(userId)
    const updatedIndicators = currentIndicators.filter(ind => ind.name !== indicatorName)
    return await this.updateIndicators(userId, updatedIndicators)
  }
}
