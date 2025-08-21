import { User } from '@prisma/client'
import { BaseRepository, NotFoundError, DuplicateError, FindManyOptions } from './BaseRepository'

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>
  findByResetToken(token: string): Promise<User | null>
  updatePassword(id: string, passwordHash: string): Promise<User>
  updateLoginCount(id: string, increment: boolean): Promise<User>
  lockUser(id: string, until: Date): Promise<User>
  unlockUser(id: string): Promise<User>
  setResetToken(id: string, token: string, expiry: Date): Promise<User>
  clearResetToken(id: string): Promise<User>
  updateLastLogin(id: string): Promise<User>
  findActiveUsers(options?: FindManyOptions): Promise<User[]>
}

// Input types
export interface UserCreateInput {
  email: string
  passwordHash: string
  name?: string
  avatar?: string
  role?: string
  isEmailVerified?: boolean
}

export interface UserUpdateInput {
  email?: string
  passwordHash?: string
  name?: string
  avatar?: string
  role?: string
  isEmailVerified?: boolean
  failedLoginCount?: number
  lockedUntil?: Date | null
  lastLoginAt?: Date | null
  isActive?: boolean
  resetToken?: string | null
  resetTokenExpiry?: Date | null
}

export interface UserFilter {
  email?: string
  role?: string
  isActive?: boolean
  isEmailVerified?: boolean
  search?: string
}

export class UserRepository
  extends BaseRepository<User, UserCreateInput, UserUpdateInput, UserFilter>
  implements IUserRepository
{
  async create(data: UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          name: data.name,
          avatar: data.avatar,
          role: data.role || 'user',
          isEmailVerified: data.isEmailVerified || false,
        },
      })
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new DuplicateError('User', 'email', data.email)
      }
      throw error
    }
  }

  async findById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id },
    })
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email },
    })
  }

  async findByResetToken(token: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    })
  }

  async findMany(filter?: UserFilter, options?: FindManyOptions): Promise<User[]> {
    const where: any = {}

    if (filter) {
      if (filter.email) {
        where.email = { contains: filter.email, mode: 'insensitive' }
      }
      if (filter.role) {
        where.role = filter.role
      }
      if (typeof filter.isActive === 'boolean') {
        where.isActive = filter.isActive
      }
      if (typeof filter.isEmailVerified === 'boolean') {
        where.isEmailVerified = filter.isEmailVerified
      }
      if (filter.search) {
        where.OR = [
          { email: { contains: filter.search, mode: 'insensitive' } },
          { name: { contains: filter.search, mode: 'insensitive' } },
        ]
      }
    }

    return await this.prisma.user.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || [{ createdAt: 'desc' }],
    })
  }

  async update(id: string, data: UserUpdateInput): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('User', id)
      }
      if (error.code === 'P2002') {
        throw new DuplicateError('User', 'email', data.email || '')
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id },
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('User', id)
      }
      throw error
    }
  }

  async count(filter?: UserFilter): Promise<number> {
    const where: any = {}

    if (filter) {
      if (filter.email) {
        where.email = { contains: filter.email, mode: 'insensitive' }
      }
      if (filter.role) {
        where.role = filter.role
      }
      if (typeof filter.isActive === 'boolean') {
        where.isActive = filter.isActive
      }
      if (typeof filter.isEmailVerified === 'boolean') {
        where.isEmailVerified = filter.isEmailVerified
      }
      if (filter.search) {
        where.OR = [
          { email: { contains: filter.search, mode: 'insensitive' } },
          { name: { contains: filter.search, mode: 'insensitive' } },
        ]
      }
    }

    return await this.prisma.user.count({ where })
  }

  async updatePassword(id: string, passwordHash: string): Promise<User> {
    return await this.update(id, { passwordHash })
  }

  async updateLoginCount(id: string, increment: boolean): Promise<User> {
    const user = await this.findById(id)
    if (!user) {
      throw new NotFoundError('User', id)
    }

    return await this.update(id, {
      failedLoginCount: increment ? user.failedLoginCount + 1 : 0,
    })
  }

  async lockUser(id: string, until: Date): Promise<User> {
    return await this.update(id, { lockedUntil: until })
  }

  async unlockUser(id: string): Promise<User> {
    return await this.update(id, {
      lockedUntil: null,
      failedLoginCount: 0,
    })
  }

  async setResetToken(id: string, token: string, expiry: Date): Promise<User> {
    return await this.update(id, {
      resetToken: token,
      resetTokenExpiry: expiry,
    })
  }

  async clearResetToken(id: string): Promise<User> {
    return await this.update(id, {
      resetToken: null,
      resetTokenExpiry: null,
    })
  }

  async updateLastLogin(id: string): Promise<User> {
    return await this.update(id, { lastLoginAt: new Date() })
  }

  async findActiveUsers(options?: FindManyOptions): Promise<User[]> {
    return await this.findMany({ isActive: true }, options)
  }
}
