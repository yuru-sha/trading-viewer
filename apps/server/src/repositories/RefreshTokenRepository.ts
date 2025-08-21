import { RefreshToken } from '@prisma/client'
import { BaseRepository, NotFoundError, FindManyOptions } from './BaseRepository'

export interface IRefreshTokenRepository {
  findByToken(token: string): Promise<RefreshToken | null>
  findByUserId(userId: string, options?: FindManyOptions): Promise<RefreshToken[]>
  findValidByUserId(userId: string): Promise<RefreshToken[]>
  revokeToken(id: string): Promise<RefreshToken>
  revokeAllUserTokens(userId: string): Promise<number>
  cleanupExpiredTokens(): Promise<number>
  findExpiredTokens(): Promise<RefreshToken[]>
}

// Input types
export interface RefreshTokenCreateInput {
  token: string
  userId: string
  expiresAt: Date
}

export interface RefreshTokenUpdateInput {
  token?: string
  expiresAt?: Date
  isRevoked?: boolean
}

export interface RefreshTokenFilter {
  userId?: string
  token?: string
  isRevoked?: boolean
  expired?: boolean
}

export class RefreshTokenRepository
  extends BaseRepository<
    RefreshToken,
    RefreshTokenCreateInput,
    RefreshTokenUpdateInput,
    RefreshTokenFilter
  >
  implements IRefreshTokenRepository
{
  async create(data: RefreshTokenCreateInput): Promise<RefreshToken> {
    return await this.prisma.refreshToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        isRevoked: false,
      },
    })
  }

  async findById(id: string): Promise<RefreshToken | null> {
    return await this.prisma.refreshToken.findUnique({
      where: { id },
    })
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return await this.prisma.refreshToken.findUnique({
      where: { token },
    })
  }

  async findByUserId(userId: string, options?: FindManyOptions): Promise<RefreshToken[]> {
    return await this.prisma.refreshToken.findMany({
      where: { userId },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ createdAt: 'desc' }],
    })
  }

  async findValidByUserId(userId: string): Promise<RefreshToken[]> {
    return await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    })
  }

  async findMany(filter?: RefreshTokenFilter, options?: FindManyOptions): Promise<RefreshToken[]> {
    const where: any = {}

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId
      }
      if (filter.token) {
        where.token = filter.token
      }
      if (typeof filter.isRevoked === 'boolean') {
        where.isRevoked = filter.isRevoked
      }
      if (typeof filter.expired === 'boolean') {
        if (filter.expired) {
          where.expiresAt = { lte: new Date() }
        } else {
          where.expiresAt = { gt: new Date() }
        }
      }
    }

    return await this.prisma.refreshToken.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ createdAt: 'desc' }],
    })
  }

  async update(id: string, data: RefreshTokenUpdateInput): Promise<RefreshToken> {
    try {
      return await this.prisma.refreshToken.update({
        where: { id },
        data,
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('RefreshToken', id)
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.refreshToken.delete({
        where: { id },
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('RefreshToken', id)
      }
      throw error
    }
  }

  async count(filter?: RefreshTokenFilter): Promise<number> {
    const where: any = {}

    if (filter) {
      if (filter.userId) {
        where.userId = filter.userId
      }
      if (filter.token) {
        where.token = filter.token
      }
      if (typeof filter.isRevoked === 'boolean') {
        where.isRevoked = filter.isRevoked
      }
      if (typeof filter.expired === 'boolean') {
        if (filter.expired) {
          where.expiresAt = { lte: new Date() }
        } else {
          where.expiresAt = { gt: new Date() }
        }
      }
    }

    return await this.prisma.refreshToken.count({ where })
  }

  async revokeToken(id: string): Promise<RefreshToken> {
    return await this.update(id, { isRevoked: true })
  }

  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    })
    return result.count
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lte: new Date(),
            },
          },
          {
            isRevoked: true,
            createdAt: {
              lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Older than 7 days
            },
          },
        ],
      },
    })
    return result.count
  }

  async findExpiredTokens(): Promise<RefreshToken[]> {
    return await this.prisma.refreshToken.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
      orderBy: [{ expiresAt: 'asc' }],
    })
  }
}
