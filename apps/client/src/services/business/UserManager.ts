// Business logic layer for user-related operations

import { authService } from '../AuthService'
import { errorRecoveryManager } from '../../utils/errorRecovery'
import type { User, UpdateProfileData, ChangePasswordData } from '../../contexts/AuthContext'

export interface UserValidationResult {
  isValid: boolean
  errors: string[]
}

export interface ProfileUpdateRequest extends UpdateProfileData {
  validateOnly?: boolean
}

export class UserManager {
  // Validation methods
  validateEmail(email: string): UserValidationResult {
    const errors: string[] = []

    if (!email) {
      errors.push('メールアドレスが必要です')
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        errors.push('有効なメールアドレスを入力してください')
      }
      if (email.length > 320) {
        errors.push('メールアドレスが長すぎます')
      }
    }

    return { isValid: errors.length === 0, errors }
  }

  validatePassword(password: string): UserValidationResult {
    const errors: string[] = []

    if (!password) {
      errors.push('パスワードが必要です')
    } else {
      if (password.length < 8) {
        errors.push('パスワードは 8 文字以上で入力してください')
      }
      if (password.length > 128) {
        errors.push('パスワードは 128 文字以下で入力してください')
      }
      if (!/(?=.*[a-z])/.test(password)) {
        errors.push('パスワードには小文字を含めてください')
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('パスワードには大文字を含めてください')
      }
      if (!/(?=.*\d)/.test(password)) {
        errors.push('パスワードには数字を含めてください')
      }
      if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
        errors.push('パスワードには特殊文字を含めてください')
      }

      // Check for common weak passwords
      const commonPasswords = [
        'password',
        'password123',
        '12345678',
        'qwerty',
        'abc123',
        'admin',
        'letmein',
        'welcome',
        'monkey',
        '1234567890',
      ]
      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('より安全なパスワードを設定してください')
      }
    }

    return { isValid: errors.length === 0, errors }
  }

  validateProfileData(data: UpdateProfileData): UserValidationResult {
    const errors: string[] = []

    if (data.name !== undefined) {
      if (data.name.length === 0) {
        errors.push('名前を入力してください')
      } else if (data.name.length > 100) {
        errors.push('名前は 100 文字以下で入力してください')
      }
    }

    if (data.avatar !== undefined) {
      if (data.avatar && !this.isValidURL(data.avatar)) {
        errors.push('有効なアバター画像 URL を入力してください')
      }
    }

    return { isValid: errors.length === 0, errors }
  }

  private isValidURL(string: string): boolean {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  // Business logic methods
  async updateUserProfile(data: ProfileUpdateRequest): Promise<User> {
    // Validation
    const validation = this.validateProfileData(data)
    if (!validation.isValid) {
      throw new Error(`入力エラー: ${validation.errors.join(', ')}`)
    }

    // If validation only, return early
    if (data.validateOnly) {
      throw new Error('Validation only mode - no actual update performed')
    }

    // Data transformation/sanitization
    const sanitizedData: UpdateProfileData = {
      name: data.name?.trim(),
      avatar: data.avatar?.trim(),
    }

    // Remove undefined values
    Object.keys(sanitizedData).forEach(key => {
      const value = sanitizedData[key as keyof UpdateProfileData]
      if (value === undefined || value === '') {
        delete sanitizedData[key as keyof UpdateProfileData]
      }
    })

    try {
      return await authService.updateProfile(sanitizedData)
    } catch {
      // Business logic for handling update errors
      console.error('Operation failed')

      // Attempt recovery if possible
      try {
        await errorRecoveryManager.attemptRecovery(error, 'profile update')
        // Retry once after recovery
        return await authService.updateProfile(sanitizedData)
      } catch (recoveryError) {
        throw error // Re-throw original error if recovery fails
      }
    }
  }

  async changeUserPassword(data: ChangePasswordData): Promise<void> {
    // Validation
    const currentPasswordValidation = this.validatePassword(data.currentPassword)
    if (!currentPasswordValidation.isValid) {
      throw new Error(`現在のパスワードが無効です: ${currentPasswordValidation.errors.join(', ')}`)
    }

    const newPasswordValidation = this.validatePassword(data.newPassword)
    if (!newPasswordValidation.isValid) {
      throw new Error(`新しいパスワードが無効です: ${newPasswordValidation.errors.join(', ')}`)
    }

    // Business rules
    if (data.currentPassword === data.newPassword) {
      throw new Error('新しいパスワードは現在のパスワードと異なる必要があります')
    }

    // Security: Check for similar passwords
    if (this.isSimilarPassword(data.currentPassword, data.newPassword)) {
      throw new Error('新しいパスワードは現在のパスワードとより大きく異なる必要があります')
    }

    try {
      await authService.changePassword(data)
    } catch {
      console.error('Operation failed')
      throw new Error('Operation failed')
    }
  }

  private isSimilarPassword(current: string, newPassword: string): boolean {
    // Simple similarity check - could be enhanced with more sophisticated algorithms
    const similarity = this.calculateSimilarity(current.toLowerCase(), newPassword.toLowerCase())
    return similarity > 0.7 // 70% similarity threshold
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  // User analytics and insights
  async getUserInsights(user: User): Promise<{
    accountAge: number
    profileCompleteness: number
    securityScore: number
    recommendations: string[]
  }> {
    const now = new Date()
    const createdAt = new Date(user.createdAt)
    const accountAge = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate profile completeness
    let completeness = 0
    const fields = ['email', 'name', 'avatar']
    const weight = 100 / fields.length

    if (user.email) completeness += weight
    if (user.name) completeness += weight
    if (user.avatar) completeness += weight

    // Calculate security score (simplified)
    let securityScore = 0
    if (user.isEmailVerified) securityScore += 40
    if (user.name) securityScore += 20 // Display name provided
    securityScore += 40 // Base score for having an account

    // Generate recommendations
    const recommendations: string[] = []
    if (!user.isEmailVerified) {
      recommendations.push('メールアドレスを認証してセキュリティを向上させましょう')
    }
    if (completeness < 75) {
      recommendations.push('プロフィールを完成させて体験を向上させましょう')
    }
    if (accountAge > 90) {
      recommendations.push('定期的にパスワードを変更することをお勧めします')
    }

    return {
      accountAge,
      profileCompleteness: Math.round(completeness),
      securityScore: Math.round(securityScore),
      recommendations,
    }
  }
}

// Singleton instance
export const userManager = new UserManager()
