import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { UserManager } from '../UserManager'
import { authService } from '../../AuthService'
import { errorRecoveryManager } from '../../../utils/errorRecovery'
import type { User, UpdateProfileData, ChangePasswordData } from '../../../contexts/AuthContext'

// Mock dependencies
vi.mock('../../AuthService', () => ({
  authService: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}))

vi.mock('../../../utils/errorRecovery', () => ({
  errorRecoveryManager: {
    attemptRecovery: vi.fn(),
  },
}))

describe('UserManager', () => {
  let userManager: UserManager

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    isEmailVerified: true,
    role: 'user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    userManager = new UserManager()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user+label@domain.co.uk',
        'first.last@subdomain.example.org',
        'a@b.co',
      ]

      validEmails.forEach(email => {
        const result = userManager.validateEmail(email)
        expect(result.isValid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@.com',
        'user..double.dot@domain.com',
        'user@domain',
        'user name@domain.com', // space in local part
      ]

      invalidEmails.forEach(email => {
        const result = userManager.validateEmail(email)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('有効なメールアドレスを入力してください')
      })
    })

    it('should reject empty email', () => {
      const result = userManager.validateEmail('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('メールアドレスが必要です')
    })

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(310) + '@example.com' // 322 characters total
      const result = userManager.validateEmail(longEmail)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('メールアドレスが長すぎます')
    })

    it('should handle null and undefined email', () => {
      expect(userManager.validateEmail(null as any).isValid).toBe(false)
      expect(userManager.validateEmail(undefined as any).isValid).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MyStr0ng@P@ssw0rd',
        'C0mplex!Password#2024',
        'Secure$Pass1',
      ]

      strongPasswords.forEach(password => {
        const result = userManager.validatePassword(password)
        expect(result.isValid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })

    it('should reject passwords that are too short', () => {
      const result = userManager.validatePassword('Short1!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('パスワードは 8 文字以上で入力してください')
    })

    it('should reject passwords that are too long', () => {
      const longPassword = 'P'.repeat(125) + 'ass1!' // 131 characters
      const result = userManager.validatePassword(longPassword)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('パスワードは 128 文字以下で入力してください')
    })

    it('should require lowercase letters', () => {
      const result = userManager.validatePassword('PASSWORD123!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('パスワードには小文字を含めてください')
    })

    it('should require uppercase letters', () => {
      const result = userManager.validatePassword('password123!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('パスワードには大文字を含めてください')
    })

    it('should require digits', () => {
      const result = userManager.validatePassword('Password!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('パスワードには数字を含めてください')
    })

    it('should require special characters', () => {
      const result = userManager.validatePassword('Password123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('パスワードには特殊文字を含めてください')
    })

    it('should reject common weak passwords', () => {
      const weakPasswords = [
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

      weakPasswords.forEach(password => {
        // Add required complexity to bypass other rules
        const complexWeakPassword = password.toUpperCase() + '1!'
        const result = userManager.validatePassword(complexWeakPassword)

        // These should still fail because they're based on common weak passwords
        if (password === 'password' || password === '12345678') {
          expect(result.isValid).toBe(false)
          expect(result.errors).toContain('より安全なパスワードを設定してください')
        }
      })
    })

    it('should reject empty password', () => {
      const result = userManager.validatePassword('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('パスワードが必要です')
    })

    it('should handle multiple validation errors', () => {
      const result = userManager.validatePassword('weak')
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('パスワードは 8 文字以上で入力してください')
      expect(result.errors).toContain('パスワードには大文字を含めてください')
    })
  })

  describe('validateProfileData', () => {
    it('should validate valid profile data', () => {
      const validData: UpdateProfileData = {
        name: 'John Doe',
        avatar: 'https://example.com/avatar.jpg',
      }

      const result = userManager.validateProfileData(validData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should allow partial profile updates', () => {
      const partialData: UpdateProfileData = {
        name: 'Updated Name',
        // avatar is undefined - should be allowed
      }

      const result = userManager.validateProfileData(partialData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject empty name when provided', () => {
      const result = userManager.validateProfileData({ name: '' })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('名前を入力してください')
    })

    it('should reject name that is too long', () => {
      const longName = 'A'.repeat(101)
      const result = userManager.validateProfileData({ name: longName })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('名前は 100 文字以下で入力してください')
    })

    it('should reject invalid avatar URL', () => {
      const result = userManager.validateProfileData({
        name: 'Valid Name',
        avatar: 'invalid-url',
      })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('有効なアバター画像 URL を入力してください')
    })

    it('should allow empty avatar URL', () => {
      const result = userManager.validateProfileData({
        name: 'Valid Name',
        avatar: '',
      })
      expect(result.isValid).toBe(true)
    })

    it('should allow undefined fields', () => {
      const result = userManager.validateProfileData({})
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })

  describe('updateUserProfile', () => {
    const validProfileData: UpdateProfileData = {
      name: 'Updated Name',
      avatar: 'https://example.com/new-avatar.jpg',
    }

    it('should update profile successfully', async () => {
      const updatedUser = { ...mockUser, ...validProfileData }
      vi.mocked(authService.updateProfile).mockResolvedValue(updatedUser)

      const result = await userManager.updateUserProfile(validProfileData)

      expect(authService.updateProfile).toHaveBeenCalledWith({
        name: 'Updated Name',
        avatar: 'https://example.com/new-avatar.jpg',
      })
      expect(result).toEqual(updatedUser)
    })

    it('should throw validation error for invalid data', async () => {
      const invalidData = { name: '' }

      await expect(userManager.updateUserProfile(invalidData)).rejects.toThrow(
        '入力エラー: 名前を入力してください'
      )

      expect(authService.updateProfile).not.toHaveBeenCalled()
    })

    it('should handle validation only mode', async () => {
      await expect(
        userManager.updateUserProfile({
          ...validProfileData,
          validateOnly: true,
        })
      ).rejects.toThrow('Validation only mode - no actual update performed')
    })

    it('should sanitize data before update', async () => {
      const dataWithWhitespace = {
        name: '  Trimmed Name  ',
        avatar: '  https://example.com/avatar.jpg  ',
      }

      const updatedUser = { ...mockUser, name: 'Trimmed Name' }
      vi.mocked(authService.updateProfile).mockResolvedValue(updatedUser)

      await userManager.updateUserProfile(dataWithWhitespace)

      expect(authService.updateProfile).toHaveBeenCalledWith({
        name: 'Trimmed Name',
        avatar: 'https://example.com/avatar.jpg',
      })
    })

    it('should remove empty values from sanitized data', async () => {
      const dataWithEmptyValues = {
        name: 'Valid Name',
        avatar: '',
      }

      const updatedUser = { ...mockUser, name: 'Valid Name' }
      vi.mocked(authService.updateProfile).mockResolvedValue(updatedUser)

      await userManager.updateUserProfile(dataWithEmptyValues)

      expect(authService.updateProfile).toHaveBeenCalledWith({
        name: 'Valid Name',
        // avatar should be removed because it was empty
      })
    })

    it('should attempt recovery on error and retry', async () => {
      const updateError = new Error('Profile update failed')
      const updatedUser = { ...mockUser, ...validProfileData }

      vi.mocked(authService.updateProfile)
        .mockRejectedValueOnce(updateError)
        .mockResolvedValueOnce(updatedUser)

      vi.mocked(errorRecoveryManager.attemptRecovery).mockResolvedValue(true)

      const result = await userManager.updateUserProfile(validProfileData)

      expect(errorRecoveryManager.attemptRecovery).toHaveBeenCalledWith(
        updateError,
        'profile update'
      )
      expect(authService.updateProfile).toHaveBeenCalledTimes(2)
      expect(result).toEqual(updatedUser)
    })

    it('should rethrow original error if recovery fails', async () => {
      const updateError = new Error('Profile update failed')

      vi.mocked(authService.updateProfile).mockRejectedValue(updateError)
      vi.mocked(errorRecoveryManager.attemptRecovery).mockRejectedValue(
        new Error('Recovery failed')
      )

      await expect(userManager.updateUserProfile(validProfileData)).rejects.toThrow(
        'Profile update failed'
      )

      expect(errorRecoveryManager.attemptRecovery).toHaveBeenCalledWith(
        updateError,
        'profile update'
      )
    })
  })

  describe('changeUserPassword', () => {
    const validPasswordData: ChangePasswordData = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456@',
    }

    it('should change password successfully', async () => {
      vi.mocked(authService.changePassword).mockResolvedValue()

      await expect(userManager.changeUserPassword(validPasswordData)).resolves.toBeUndefined()

      expect(authService.changePassword).toHaveBeenCalledWith(validPasswordData)
    })

    it('should validate current password', async () => {
      const invalidData = {
        currentPassword: 'weak',
        newPassword: 'NewPassword456@',
      }

      await expect(userManager.changeUserPassword(invalidData)).rejects.toThrow(
        '現在のパスワードが無効です:'
      )

      expect(authService.changePassword).not.toHaveBeenCalled()
    })

    it('should validate new password', async () => {
      const invalidData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
      }

      await expect(userManager.changeUserPassword(invalidData)).rejects.toThrow(
        '新しいパスワードが無効です:'
      )

      expect(authService.changePassword).not.toHaveBeenCalled()
    })

    it('should reject when new password equals current password', async () => {
      const samePasswordData = {
        currentPassword: 'SamePassword123!',
        newPassword: 'SamePassword123!',
      }

      await expect(userManager.changeUserPassword(samePasswordData)).rejects.toThrow(
        '新しいパスワードは現在のパスワードと異なる必要があります'
      )
    })

    it('should reject similar passwords', async () => {
      const similarPasswordData = {
        currentPassword: 'MyPassword123!',
        newPassword: 'MyPassword124!', // Very similar
      }

      await expect(userManager.changeUserPassword(similarPasswordData)).rejects.toThrow(
        '新しいパスワードは現在のパスワードとより大きく異なる必要があります'
      )
    })

    it('should handle auth service errors', async () => {
      vi.mocked(authService.changePassword).mockRejectedValue(new Error('Auth service error'))

      await expect(userManager.changeUserPassword(validPasswordData)).rejects.toThrow(
        'Operation failed'
      )

      expect(console.error).toHaveBeenCalledWith('Operation failed')
    })
  })

  describe('similarity calculation methods', () => {
    it('should calculate correct similarity scores', () => {
      const testCases = [
        { str1: 'hello', str2: 'hello', expected: 1.0 }, // Identical
        { str1: 'hello', str2: 'hallo', expected: 0.8 }, // 1 character different
        { str1: 'password123', str2: 'password124', expected: 10 / 11 }, // 1 character different
        { str1: 'completely', str2: 'different', expected: 0 }, // No similarity
        { str1: '', str2: '', expected: 1.0 }, // Both empty
        { str1: 'test', str2: '', expected: 0 }, // One empty
      ]

      testCases.forEach(({ str1, str2, expected }) => {
        const result = userManager['calculateSimilarity'](str1, str2)
        expect(result).toBeCloseTo(expected, 2)
      })
    })

    it('should calculate Levenshtein distance correctly', () => {
      const testCases = [
        { str1: 'hello', str2: 'hello', expected: 0 },
        { str1: 'hello', str2: 'hallo', expected: 1 },
        { str1: 'kitten', str2: 'sitting', expected: 3 },
        { str1: 'saturday', str2: 'sunday', expected: 3 },
        { str1: '', str2: 'test', expected: 4 },
        { str1: 'test', str2: '', expected: 4 },
      ]

      testCases.forEach(({ str1, str2, expected }) => {
        const result = userManager['levenshteinDistance'](str1, str2)
        expect(result).toBe(expected)
      })
    })

    it('should identify similar passwords correctly', () => {
      const testCases = [
        { current: 'password123', new: 'password124', shouldBeSimilar: true },
        { current: 'MyPassword!', new: 'MyPassword@', shouldBeSimilar: true },
        { current: 'shortpw1', new: 'CompletelyDifferent123!', shouldBeSimilar: false },
        { current: 'Test123!', new: 'Different456@', shouldBeSimilar: false },
      ]

      testCases.forEach(({ current, new: newPassword, shouldBeSimilar }) => {
        const result = userManager['isSimilarPassword'](current, newPassword)
        expect(result).toBe(shouldBeSimilar)
      })
    })
  })

  describe('getUserInsights', () => {
    it('should calculate insights for complete user profile', async () => {
      const user = {
        ...mockUser,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      }

      const insights = await userManager.getUserInsights(user)

      expect(insights.accountAge).toBe(30)
      expect(insights.profileCompleteness).toBe(100) // email, name, avatar all present
      expect(insights.securityScore).toBe(100) // verified email + name + base score
      expect(insights.recommendations).toEqual([])
    })

    it('should calculate insights for incomplete profile', async () => {
      const incompleteUser = {
        ...mockUser,
        name: '',
        avatar: undefined,
        isEmailVerified: false,
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
      }

      const insights = await userManager.getUserInsights(incompleteUser)

      expect(insights.accountAge).toBe(100)
      expect(insights.profileCompleteness).toBe(33) // Only email present (1/3 * 100)
      expect(insights.securityScore).toBe(40) // Only base score, no verified email or name
      expect(insights.recommendations).toContain(
        'メールアドレスを認証してセキュリティを向上させましょう'
      )
      expect(insights.recommendations).toContain('プロフィールを完成させて体験を向上させましょう')
      expect(insights.recommendations).toContain('定期的にパスワードを変更することをお勧めします')
    })

    it('should calculate insights for new user', async () => {
      const newUser = {
        ...mockUser,
        createdAt: new Date().toISOString(), // Just created
      }

      const insights = await userManager.getUserInsights(newUser)

      expect(insights.accountAge).toBe(0)
      expect(insights.recommendations).not.toContain(
        '定期的にパスワードを変更することをお勧めします'
      )
    })

    it('should handle user without avatar', async () => {
      const userWithoutAvatar = {
        ...mockUser,
        avatar: undefined,
      }

      const insights = await userManager.getUserInsights(userWithoutAvatar)

      expect(insights.profileCompleteness).toBe(67) // email and name present (2/3 * 100)
      expect(insights.securityScore).toBe(100) // Still has verified email and name
    })

    it('should provide appropriate recommendations based on profile state', async () => {
      const scenarios = [
        {
          user: { ...mockUser, isEmailVerified: false, createdAt: mockUser.createdAt },
          expectedRecommendations: ['メールアドレスを認証してセキュリティを向上させましょう'],
        },
        {
          user: {
            ...mockUser,
            name: '',
            avatar: undefined,
            createdAt: mockUser.createdAt,
          },
          expectedRecommendations: ['プロフィールを完成させて体験を向上させましょう'],
        },
        {
          user: {
            ...mockUser,
            createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
          },
          expectedRecommendations: ['定期的にパスワードを変更することをお勧めします'],
        },
      ]

      for (const { user, expectedRecommendations } of scenarios) {
        const insights = await userManager.getUserInsights(user)
        expectedRecommendations.forEach(recommendation => {
          expect(insights.recommendations).toContain(recommendation)
        })
      }
    })
  })

  describe('Edge Cases and Error Boundaries', () => {
    it('should handle malformed profile data gracefully', async () => {
      const malformedData = {
        name: null,
        avatar: 123, // Wrong type
      } as any

      const result = userManager.validateProfileData(malformedData)
      expect(result.isValid).toBe(false)
    })

    it('should handle very long strings in Levenshtein calculation', () => {
      const longStr1 = 'a'.repeat(1000)
      const longStr2 = 'b'.repeat(1000)

      expect(() => {
        userManager['levenshteinDistance'](longStr1, longStr2)
      }).not.toThrow()

      const result = userManager['levenshteinDistance'](longStr1, longStr2)
      expect(result).toBe(1000)
    })

    it('should handle special characters in URLs', () => {
      const urlsWithSpecialChars = [
        'https://example.com/avatar?v=1&size=100',
        'https://example.com/path%20with%20spaces/avatar.jpg',
        'https://example.com/avatar.jpg#fragment',
      ]

      urlsWithSpecialChars.forEach(url => {
        const result = userManager.validateProfileData({ avatar: url })
        expect(result.isValid).toBe(true)
      })
    })

    it('should handle concurrent validation calls', async () => {
      const promises = [
        userManager.validateEmail('test1@example.com'),
        userManager.validateEmail('test2@example.com'),
        userManager.validatePassword('Password123!'),
        userManager.validateProfileData({ name: 'Test User' }),
      ]

      const results = await Promise.all(promises)
      results.forEach(result => {
        expect(result.isValid).toBe(true)
      })
    })

    it('should handle empty user insights gracefully', async () => {
      const emptyUser = {
        id: '',
        email: '',
        name: '',
        avatar: undefined,
        isEmailVerified: false,
        role: 'user' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const insights = await userManager.getUserInsights(emptyUser)
      expect(insights.profileCompleteness).toBe(0)
      expect(insights.securityScore).toBeGreaterThan(0) // Still has base score
      expect(insights.recommendations.length).toBeGreaterThan(0)
    })
  })
})
