import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { inject, injectable } from 'inversify'
import type { User } from '@prisma/client'
import type {
  User as SharedUser,
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  ResetPasswordRequest,
} from '@trading-viewer/shared'
import type { UserRepository } from '../../infrastructure/repositories/UserRepository'
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository'
import { RefreshToken } from '../../domain/entities/RefreshToken'
import { log } from '../../infrastructure/services/logger'
import { TYPES } from '../../infrastructure/di/types'

export interface AuthResult {
  user: SharedUser
  token: string
  refreshToken: string
}

export interface RefreshResult {
  user: SharedUser
  token: string
}

@injectable()
export class AuthService {
  private readonly JWT_SECRET: string
  private readonly JWT_REFRESH_SECRET: string
  private readonly JWT_EXPIRES_IN = '24h'
  private readonly REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000 // 7 days
  private readonly MAX_LOGIN_ATTEMPTS = 5
  private readonly LOCK_TIME = 15 * 60 * 1000 // 15 minutes
  private readonly BCRYPT_ROUNDS = 12

  constructor(
    @inject(TYPES.UserRepository) private userRepository: UserRepository,
    @inject(TYPES.RefreshTokenRepository) private refreshTokenRepository: IRefreshTokenRepository
  ) {
    this.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key'

    if (
      this.JWT_SECRET === 'fallback-secret-key' ||
      this.JWT_REFRESH_SECRET === 'fallback-refresh-secret-key'
    ) {
      log.auth.warn('Using fallback JWT secrets - this is not secure for production!')
    }
  }

  async register(data: RegisterRequest): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(data.email)
      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, this.BCRYPT_ROUNDS)

      // Create user
      const user = await this.userRepository.create({
        email: data.email,
        passwordHash: hashedPassword,
        name: data.name,
        role: 'user',
        isEmailVerified: false,
      })

      // Generate tokens
      const token = this.generateAccessToken(user)
      const refreshToken = await this.generateRefreshToken(user.id)

      log.auth.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        name: user.name,
      })

      return {
        user: this.toApiFormat(user),
        token,
        refreshToken,
      }
    } catch (error) {
      log.auth.error('Registration failed', error)
      throw error
    }
  }

  async login(data: LoginRequest): Promise<AuthResult> {
    try {
      // Find user
      const user = await this.userRepository.findByEmail(data.email)
      if (!user) {
        // Perform dummy bcrypt to prevent timing attacks
        await bcrypt.compare('dummy-password', '$2b$12$dummy.hash.to.prevent.timing.attacks')
        throw new Error('Invalid credentials')
      }

      // Check if account is locked
      if (this.isAccountLocked(user)) {
        throw new Error('Account locked due to too many failed login attempts')
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash)
      if (!isPasswordValid) {
        await this.incrementFailedLoginAttempts(user.id)
        throw new Error('Invalid credentials')
      }

      // Reset failed login attempts on successful login
      await this.resetFailedLoginAttempts(user.id)

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated')
      }

      // Update last login
      const updatedUser = await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
      })

      // Generate tokens
      const token = this.generateAccessToken(updatedUser)
      const refreshToken = await this.generateRefreshToken(updatedUser.id)

      log.auth.info('User logged in successfully', {
        userId: updatedUser.id,
        email: updatedUser.email,
      })

      return {
        user: this.toApiFormat(updatedUser),
        token,
        refreshToken,
      }
    } catch (error) {
      log.auth.error('Login failed', error)
      throw error
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await this.refreshTokenRepository.deleteByToken(refreshToken)
      log.auth.info('User logged out successfully')
    } catch (error) {
      log.auth.error('Logout failed', error)
      throw error
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    try {
      // Find and validate refresh token
      const tokenRecord = await this.refreshTokenRepository.findByToken(refreshToken)
      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        throw new Error('Invalid or expired refresh token')
      }

      // Get user
      const user = await this.userRepository.findById(tokenRecord.userId)
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive')
      }

      // Generate new access token
      const newAccessToken = this.generateAccessToken(user)

      // Update token last used time
      await this.refreshTokenRepository.update(tokenRecord.id, {
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })

      log.auth.info('Token refreshed successfully', { userId: user.id })

      return {
        user: this.toApiFormat(user),
        token: newAccessToken,
      }
    } catch (error) {
      log.auth.error('Token refresh failed', error)
      throw error
    }
  }

  async changePassword(userId: string, data: ChangePasswordRequest): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.passwordHash)
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect')
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.newPassword, this.BCRYPT_ROUNDS)

      // Update password
      await this.userRepository.update(userId, { passwordHash: hashedPassword })

      // Invalidate all refresh tokens for security
      await this.refreshTokenRepository.deleteByUserId(userId)

      log.auth.info('Password changed successfully', { userId })
    } catch (error) {
      log.auth.error('Password change failed', error)
      throw error
    }
  }

  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<SharedUser> {
    try {
      const user = await this.userRepository.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Check if email is taken (if changing email)
      if (data.email && data.email !== user.email) {
        const existingEmail = await this.userRepository.findByEmail(data.email)
        if (existingEmail) {
          throw new Error('Email is already taken')
        }
      }

      // Update user
      const updatedUser = await this.userRepository.update(userId, {
        email: data.email || user.email,
        name: data.name || user.name,
        avatar: data.avatar || user.avatar,
      })

      log.auth.info('Profile updated successfully', { userId })

      return this.toApiFormat(updatedUser)
    } catch (error) {
      log.auth.error('Profile update failed', error)
      throw error
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await this.userRepository.findByEmail(email)
      if (!user) {
        // Don't reveal whether email exists for security
        return
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex')
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Save reset token
      await this.userRepository.update(user.id, {
        resetToken,
        resetTokenExpiry,
      })

      // TODO: Send email with reset link
      log.auth.info('Password reset token generated', { email, userId: user.id })
    } catch (error) {
      log.auth.error('Forgot password failed', error)
      throw error
    }
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    try {
      const user = await this.userRepository.findByResetToken(data.token)
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        throw new Error('Invalid or expired reset token')
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(data.password, this.BCRYPT_ROUNDS)

      // Update password and clear reset token
      await this.userRepository.update(user.id, {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      })

      // Invalidate all refresh tokens for security
      await this.refreshTokenRepository.deleteByUserId(user.id)

      log.auth.info('Password reset successfully', { userId: user.id })
    } catch (error) {
      log.auth.error('Password reset failed', error)
      throw error
    }
  }

  async getCurrentUser(userId: string): Promise<SharedUser> {
    try {
      const user = await this.userRepository.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      return this.toApiFormat(user)
    } catch (error) {
      log.auth.error('Get current user failed', error)
      throw error
    }
  }

  private generateAccessToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    )
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_IN)
    const id = this.generateId()

    const refreshToken = new RefreshToken(
      id,
      token,
      userId,
      expiresAt,
      undefined, // lastUsedAt
      new Date(), // createdAt
      new Date() // updatedAt
    )

    await this.refreshTokenRepository.create(refreshToken)

    return token
  }

  private async incrementFailedLoginAttempts(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId)
    if (!user) return

    const newFailedCount = user.failedLoginCount + 1
    const updateData: { failedLoginCount: number; lockedUntil?: Date } = {
      failedLoginCount: newFailedCount,
    }

    if (newFailedCount >= this.MAX_LOGIN_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + this.LOCK_TIME)
    }

    await this.userRepository.update(userId, updateData)
  }

  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      failedLoginCount: 0,
      lockedUntil: null,
    })
  }

  private isAccountLocked(user: User): boolean {
    return user.lockedUntil ? user.lockedUntil > new Date() : false
  }

  private toApiFormat(user: User): SharedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      role: user.role as 'user' | 'admin',
    }
  }

  private generateId(): string {
    return randomBytes(16).toString('hex')
  }
}
