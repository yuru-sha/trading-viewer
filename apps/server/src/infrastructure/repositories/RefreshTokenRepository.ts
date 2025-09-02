import { injectable } from 'inversify'
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository'
import { RefreshToken } from '../../domain/entities/RefreshToken'

@injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma = globalThis.prisma) {}

  async findByToken(token: string): Promise<RefreshToken | null> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    })

    if (!refreshToken || refreshToken.isRevoked) {
      return null
    }

    return this.toDomainEntity(refreshToken)
  }

  async create(refreshToken: RefreshToken): Promise<RefreshToken> {
    const created = await this.prisma.refreshToken.create({
      data: {
        id: refreshToken.id,
        token: refreshToken.token,
        userId: refreshToken.userId,
        expiresAt: refreshToken.expiresAt,
        isRevoked: false,
        createdAt: refreshToken.createdAt,
      },
    })

    return this.toDomainEntity(created)
  }

  async update(id: string, data: Partial<RefreshToken>): Promise<RefreshToken> {
    const updated = await this.prisma.refreshToken.update({
      where: { id },
      data: {
        ...(data.token && { token: data.token }),
        ...(data.expiresAt && { expiresAt: data.expiresAt }),
        // Note: lastUsedAt and updatedAt are not stored in the database
        // but are handled in the domain layer
      },
    })

    return this.toDomainEntity(updated)
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { isRevoked: true },
    })
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    })
  }

  async findByUserId(userId: string): Promise<RefreshToken[]> {
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
      },
    })

    return refreshTokens.map(token => this.toDomainEntity(token))
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
      data: { isRevoked: true },
    })
  }

  private toDomainEntity(dbToken: any): RefreshToken {
    return new RefreshToken(
      dbToken.id,
      dbToken.token,
      dbToken.userId,
      dbToken.expiresAt,
      undefined, // lastUsedAt not stored in DB
      dbToken.createdAt,
      dbToken.createdAt // updatedAt not stored in DB, use createdAt
    )
  }
}
