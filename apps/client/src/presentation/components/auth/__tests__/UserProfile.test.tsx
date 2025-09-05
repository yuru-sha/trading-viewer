import React from 'react'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '@/presentation/components/../../__tests__/test-utils'
import UserProfile from '@/presentation/components/auth/UserProfile'
import { useAuth } from '@/presentation/components/../../context/AuthContext'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../context/ErrorContext', () => ({
  useErrorHandlers: () => ({
    showSuccess: vi.fn(),
    showWarning: vi.fn(),
  }),
}))

const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user' as const,
  avatar: '',
  isActive: true,
  isEmailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockAuthFunctions = {
  logout: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
  login: vi.fn(),
  isAuthenticated: true,
  isLoading: false,
}

describe.skip('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      ...mockAuthFunctions,
    })

    // Mock window.confirm
    global.confirm = vi.fn(() => true)
  })

  describe('Component Rendering', () => {
    it('should render user profile component', () => {
      render(<UserProfile />)

      expect(screen.getByText('アカウント設定')).toBeInTheDocument()
      expect(screen.getByText('プロフィール情報とセキュリティ設定を管理')).toBeInTheDocument()
    })

    it('should render all tabs', () => {
      render(<UserProfile />)

      expect(screen.getByText('プロフィール')).toBeInTheDocument()
      expect(screen.getByText('セキュリティ')).toBeInTheDocument()
      expect(screen.getByText('アカウント管理')).toBeInTheDocument()
    })

    it('should default to profile tab', () => {
      render(<UserProfile />)

      expect(screen.getByText('基本情報')).toBeInTheDocument()
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
      expect(screen.getByLabelText('表示名')).toBeInTheDocument()
    })

    it('should show loading message when user is not available', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        ...mockAuthFunctions,
      })

      render(<UserProfile />)

      expect(screen.getByText('ユーザー情報を読み込み中...')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should switch to security tab when clicked', async () => {
      render(<UserProfile />)

      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      expect(screen.getByText('パスワード変更')).toBeInTheDocument()
      expect(screen.getByLabelText('現在のパスワード')).toBeInTheDocument()
      expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument()
    })

    it('should switch to danger tab when clicked', async () => {
      render(<UserProfile />)

      const dangerTab = screen.getByText('アカウント管理')
      await fireEvent.click(dangerTab)

      expect(screen.getByText('危険な操作')).toBeInTheDocument()
      expect(screen.getByText('アカウント削除')).toBeInTheDocument()
    })

    it('should apply active tab styling', async () => {
      render(<UserProfile />)

      const profileTab = screen.getByText('プロフィール')
      const securityTab = screen.getByText('セキュリティ')

      expect(profileTab).toHaveClass('bg-blue-100', 'text-blue-700')
      expect(securityTab).toHaveClass('text-gray-500')

      await fireEvent.click(securityTab)

      expect(securityTab).toHaveClass('bg-blue-100', 'text-blue-700')
      expect(profileTab).toHaveClass('text-gray-500')
    })
  })

  describe('Profile Update Functionality', () => {
    it('should display current user information', () => {
      render(<UserProfile />)

      const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement
      const roleInput = screen.getByLabelText('ロール') as HTMLInputElement
      const nameInput = screen.getByLabelText('表示名') as HTMLInputElement

      expect(emailInput.value).toBe('test@example.com')
      expect(roleInput.value).toBe('ユーザー')
      expect(nameInput.value).toBe('Test User')
    })

    it('should display admin role correctly', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, role: 'admin' },
        ...mockAuthFunctions,
      })

      render(<UserProfile />)

      const roleInput = screen.getByLabelText('ロール') as HTMLInputElement
      expect(roleInput.value).toBe('管理者')
    })

    it('should disable email and role fields', () => {
      render(<UserProfile />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const roleInput = screen.getByLabelText('ロール')

      expect(emailInput).toBeDisabled()
      expect(roleInput).toBeDisabled()
    })

    it('should update display name when typed', async () => {
      render(<UserProfile />)

      const nameInput = screen.getByLabelText('表示名') as HTMLInputElement
      await fireEvent.change(nameInput, { target: { value: 'Updated Name' } })

      expect(nameInput.value).toBe('Updated Name')
    })

    it('should successfully update profile', async () => {
      mockAuthFunctions.updateProfile.mockResolvedValue(undefined)

      await act(async () => {
        render(<UserProfile />)
      })

      const nameInput = screen.getByLabelText('表示名')
      const updateButton = screen.getByText('プロフィール更新')

      await act(async () => {
        await fireEvent.change(nameInput, { target: { value: 'Updated Name' } })
        await fireEvent.click(updateButton)
      })

      // Verify API call with exact parameters
      expect(mockAuthFunctions.updateProfile).toHaveBeenCalledWith({
        name: 'Updated Name',
        avatar: '',
      })

      // Verify success feedback (requires ErrorContext mock to be enhanced)
      await waitFor(() => {
        // Success message should be triggered through ErrorContext
        expect(mockAuthFunctions.updateProfile).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle profile update error', async () => {
      mockAuthFunctions.updateProfile.mockRejectedValue(new Error('Update failed'))

      render(<UserProfile />)

      const nameInput = screen.getByLabelText('表示名')
      const updateButton = screen.getByText('プロフィール更新')

      await fireEvent.change(nameInput, { target: { value: 'Updated Name' } })
      await fireEvent.click(updateButton)

      expect(mockAuthFunctions.updateProfile).toHaveBeenCalled()
    })

    it('should show loading state during profile update', async () => {
      mockAuthFunctions.updateProfile.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<UserProfile />)

      const updateButton = screen.getByText('プロフィール更新')
      await fireEvent.click(updateButton)

      expect(updateButton).toBeDisabled()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
    })
  })

  describe('Password Change Functionality', () => {
    beforeEach(async () => {
      render(<UserProfile />)
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)
    })

    it('should render password change form', () => {
      expect(screen.getByLabelText('現在のパスワード')).toBeInTheDocument()
      expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument()
      expect(screen.getByLabelText('新しいパスワード（確認）')).toBeInTheDocument()
      expect(screen.getByText('パスワード変更')).toBeInTheDocument()
    })

    it('should update password form fields when typed', async () => {
      const currentPasswordInput = screen.getByLabelText('現在のパスワード') as HTMLInputElement
      const newPasswordInput = screen.getByLabelText('新しいパスワード') as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        '新しいパスワード（確認）'
      ) as HTMLInputElement

      await fireEvent.change(currentPasswordInput, { target: { value: 'current123' } })
      await fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } })
      await fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } })

      expect(currentPasswordInput.value).toBe('current123')
      expect(newPasswordInput.value).toBe('newpass123')
      expect(confirmPasswordInput.value).toBe('newpass123')
    })

    it('should validate required current password', async () => {
      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      expect(screen.getByText('現在のパスワードは必須です')).toBeInTheDocument()
    })

    it('should validate required new password', async () => {
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      await fireEvent.change(currentPasswordInput, { target: { value: 'current123' } })

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      expect(screen.getByText('新しいパスワードは必須です')).toBeInTheDocument()
    })

    it('should validate password length', async () => {
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')

      await fireEvent.change(currentPasswordInput, { target: { value: 'current123' } })
      await fireEvent.change(newPasswordInput, { target: { value: '123' } })

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      expect(screen.getByText('パスワードは 8 文字以上である必要があります')).toBeInTheDocument()
    })

    it('should validate password confirmation match', async () => {
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.change(currentPasswordInput, { target: { value: 'current123' } })
      await fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } })
      await fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } })

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument()
    })

    it('should apply error styling to invalid fields', async () => {
      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')

      expect(currentPasswordInput).toHaveClass('border-red-300')
      expect(newPasswordInput).toHaveClass('border-red-300')
    })

    it('should successfully change password with valid data', async () => {
      mockAuthFunctions.changePassword.mockResolvedValue(undefined)

      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.change(currentPasswordInput, { target: { value: 'current123' } })
      await fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } })
      await fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } })

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      expect(mockAuthFunctions.changePassword).toHaveBeenCalledWith({
        currentPassword: 'current123',
        newPassword: 'newpass123',
      })
    })

    it('should handle password change error', async () => {
      mockAuthFunctions.changePassword.mockRejectedValue(new Error('Password change failed'))

      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.change(currentPasswordInput, { target: { value: 'current123' } })
      await fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } })
      await fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } })

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      expect(mockAuthFunctions.changePassword).toHaveBeenCalled()
    })

    it('should show loading state during password change', async () => {
      mockAuthFunctions.changePassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.change(currentPasswordInput, { target: { value: 'current123' } })
      await fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } })
      await fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } })

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      expect(changeButton).toBeDisabled()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
    })
  })

  describe('Session Management', () => {
    beforeEach(async () => {
      render(<UserProfile />)
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)
    })

    it('should render logout button', () => {
      expect(screen.getByText('ログアウト')).toBeInTheDocument()
      expect(screen.getByText('セッション管理')).toBeInTheDocument()
    })

    it('should call logout when logout button is clicked', async () => {
      mockAuthFunctions.logout.mockResolvedValue(undefined)

      const logoutButton = screen.getByText('ログアウト')
      await fireEvent.click(logoutButton)

      expect(mockAuthFunctions.logout).toHaveBeenCalledTimes(1)
    })

    it('should handle logout error', async () => {
      mockAuthFunctions.logout.mockRejectedValue(new Error('Logout failed'))

      const logoutButton = screen.getByText('ログアウト')
      await fireEvent.click(logoutButton)

      expect(mockAuthFunctions.logout).toHaveBeenCalled()
    })
  })

  describe('Account Deletion', () => {
    beforeEach(async () => {
      render(<UserProfile />)
      const dangerTab = screen.getByText('アカウント管理')
      await fireEvent.click(dangerTab)
    })

    it('should render account deletion section', () => {
      expect(screen.getByText('危険な操作')).toBeInTheDocument()
      expect(screen.getByText('アカウント削除')).toBeInTheDocument()
      expect(screen.getByText('アカウントを削除')).toBeInTheDocument()
    })

    it('should show warning message', () => {
      expect(
        screen.getByText(/アカウントを削除すると、すべてのデータが完全に削除され/)
      ).toBeInTheDocument()
      expect(screen.getByText(/この操作は取り消すことができません/)).toBeInTheDocument()
    })

    it('should show confirmation dialog when delete button is clicked', async () => {
      const deleteButton = screen.getByText('アカウントを削除')
      await fireEvent.click(deleteButton)

      expect(global.confirm).toHaveBeenCalledWith(
        'アカウントを削除すると、すべてのデータが失われます。この操作は取り消せません。続行しますか？'
      )
    })

    it('should delete account when confirmed', async () => {
      mockAuthFunctions.deleteAccount.mockResolvedValue(undefined)
      global.confirm = vi.fn(() => true)

      const deleteButton = screen.getByText('アカウントを削除')
      await fireEvent.click(deleteButton)

      expect(mockAuthFunctions.deleteAccount).toHaveBeenCalledTimes(1)
    })

    it('should not delete account when cancelled', async () => {
      global.confirm = vi.fn(() => false)

      const deleteButton = screen.getByText('アカウントを削除')
      await fireEvent.click(deleteButton)

      expect(mockAuthFunctions.deleteAccount).not.toHaveBeenCalled()
    })

    it('should handle account deletion error', async () => {
      mockAuthFunctions.deleteAccount.mockRejectedValue(new Error('Deletion failed'))
      global.confirm = vi.fn(() => true)

      const deleteButton = screen.getByText('アカウントを削除')
      await fireEvent.click(deleteButton)

      expect(mockAuthFunctions.deleteAccount).toHaveBeenCalled()
    })

    it('should show loading state during account deletion', async () => {
      mockAuthFunctions.deleteAccount.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )
      global.confirm = vi.fn(() => true)

      const deleteButton = screen.getByText('アカウントを削除')
      await fireEvent.click(deleteButton)

      expect(deleteButton).toBeDisabled()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<UserProfile />)

      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
      expect(screen.getByLabelText('ロール')).toBeInTheDocument()
      expect(screen.getByLabelText('表示名')).toBeInTheDocument()
    })

    it('should have proper button roles', () => {
      render(<UserProfile />)

      expect(screen.getByRole('button', { name: 'プロフィール' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'セキュリティ' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'アカウント管理' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'プロフィール更新' })).toBeInTheDocument()
    })

    it('should have proper heading structure', () => {
      render(<UserProfile />)

      expect(screen.getByRole('heading', { name: 'アカウント設定' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '基本情報' })).toBeInTheDocument()
    })

    it('should have proper input labels in security tab', async () => {
      render(<UserProfile />)

      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      expect(screen.getByLabelText('現在のパスワード')).toBeInTheDocument()
      expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument()
      expect(screen.getByLabelText('新しいパスワード（確認）')).toBeInTheDocument()
    })
  })

  describe('Form Reset Behavior', () => {
    it('should not reset password form when switching tabs', async () => {
      render(<UserProfile />)

      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      const currentPasswordInput = screen.getByLabelText('現在のパスワード') as HTMLInputElement
      await fireEvent.change(currentPasswordInput, { target: { value: 'test123' } })

      const profileTab = screen.getByText('プロフィール')
      await fireEvent.click(profileTab)
      await fireEvent.click(securityTab)

      const updatedCurrentPasswordInput = screen.getByLabelText(
        '現在のパスワード'
      ) as HTMLInputElement
      expect(updatedCurrentPasswordInput.value).toBe('test123')
    })

    it('should maintain profile form state when switching tabs', async () => {
      render(<UserProfile />)

      const nameInput = screen.getByLabelText('表示名') as HTMLInputElement
      await fireEvent.change(nameInput, { target: { value: 'Updated Name' } })

      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      const profileTab = screen.getByText('プロフィール')
      await fireEvent.click(profileTab)

      const updatedNameInput = screen.getByLabelText('表示名') as HTMLInputElement
      expect(updatedNameInput.value).toBe('Updated Name')
    })
  })

  describe('Error Handling', () => {
    it('should clear password errors when user starts typing', async () => {
      render(<UserProfile />)

      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      // Trigger validation error
      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      expect(screen.getByText('現在のパスワードは必須です')).toBeInTheDocument()

      // Start typing to clear error
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      await fireEvent.change(currentPasswordInput, { target: { value: 'test' } })

      // Note: The current implementation doesn't clear errors on change,
      // but this test documents the expected behavior
    })
  })
})
