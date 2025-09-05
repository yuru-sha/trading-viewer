import { RefreshToken } from '../entities/RefreshToken'

export interface IRefreshTokenRepository {
  findByToken(token: string): Promise<RefreshToken | null>
  create(refreshToken: RefreshToken): Promise<RefreshToken>
  update(id: string, data: Partial<RefreshToken>): Promise<RefreshToken>
  deleteByToken(token: string): Promise<void>
  deleteByUserId(userId: string): Promise<void>
  findByUserId(userId: string): Promise<RefreshToken[]>
  deleteExpired(): Promise<void>
}
