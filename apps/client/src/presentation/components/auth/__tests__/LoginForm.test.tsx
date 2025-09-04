import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '@/presentation/components/../../__tests__/test-utils'
import LoginForm from '@/presentation/components/auth/LoginForm'
import { useAuth } from '@/presentation/components/../../context/AuthContext'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../context/ErrorContext', () => ({
  useErrorHandlers: () => ({
    showSuccess: vi.fn(),
  }),
}))

const mockLogin = vi.fn()
const mockProps = {
  onSuccess: vi.fn(),
  onSwitchToRegister: vi.fn(),
  onSwitchToForgotPassword: vi.fn(),
}

describe.skip('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      logout: vi.fn(),
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  describe('Form Rendering', () => {
    it('should render login form with all required fields', () => {
      render(<LoginForm {...mockProps} />)

      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
      expect(screen.getByLabelText('ログインを保持')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    })

    it('should render email input with correct attributes', () => {
      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('autoComplete', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('placeholder', '例: user@example.com')
    })

    it('should render password input with correct attributes', () => {
      render(<LoginForm {...mockProps} />)

      const passwordInput = screen.getByLabelText('パスワード')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('placeholder', 'パスワードを入力')
    })

    it('should render remember me checkbox unchecked by default', () => {
      render(<LoginForm {...mockProps} />)

      const rememberMeCheckbox = screen.getByLabelText('ログインを保持') as HTMLInputElement
      expect(rememberMeCheckbox).toHaveAttribute('type', 'checkbox')
      expect(rememberMeCheckbox.checked).toBe(false)
    })
  })

  describe('Remember Me Functionality', () => {
    it('should toggle remember me checkbox when clicked', async () => {
      render(<LoginForm {...mockProps} />)

      const rememberMeCheckbox = screen.getByLabelText('ログインを保持') as HTMLInputElement
      expect(rememberMeCheckbox.checked).toBe(false)

      await fireEvent.click(rememberMeCheckbox)
      expect(rememberMeCheckbox.checked).toBe(true)

      await fireEvent.click(rememberMeCheckbox)
      expect(rememberMeCheckbox.checked).toBe(false)
    })

    it('should maintain remember me state during form interaction', async () => {
      render(<LoginForm {...mockProps} />)

      const rememberMeCheckbox = screen.getByLabelText('ログインを保持') as HTMLInputElement
      const emailInput = screen.getByLabelText('メールアドレス')

      await fireEvent.click(rememberMeCheckbox)
      expect(rememberMeCheckbox.checked).toBe(true)

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      expect(rememberMeCheckbox.checked).toBe(true)
    })
  })

  describe('Forgot Password Functionality', () => {
    it('should render forgot password link when callback is provided', () => {
      render(<LoginForm {...mockProps} />)

      expect(screen.getByText('パスワードをお忘れですか？')).toBeInTheDocument()
    })

    it('should not render forgot password link when callback is not provided', () => {
      render(
        <LoginForm
          onSuccess={mockProps.onSuccess}
          onSwitchToRegister={mockProps.onSwitchToRegister}
        />
      )

      expect(screen.queryByText('パスワードをお忘れですか？')).not.toBeInTheDocument()
    })

    it('should call onSwitchToForgotPassword when forgot password link is clicked', async () => {
      render(<LoginForm {...mockProps} />)

      const forgotPasswordLink = screen.getByText('パスワードをお忘れですか？')
      await fireEvent.click(forgotPasswordLink)

      expect(mockProps.onSwitchToForgotPassword).toHaveBeenCalledTimes(1)
    })

    it('should have proper accessibility attributes for forgot password link', () => {
      render(<LoginForm {...mockProps} />)

      const forgotPasswordLink = screen.getByText('パスワードをお忘れですか？')
      expect(forgotPasswordLink).toHaveAttribute('type', 'button')
    })
  })

  describe('Create Account Functionality', () => {
    it('should render create account link when callback is provided', () => {
      render(<LoginForm {...mockProps} />)

      expect(screen.getByText('新規登録')).toBeInTheDocument()
      expect(screen.getByText('アカウントをお持ちでない場合は')).toBeInTheDocument()
    })

    it('should not render create account link when callback is not provided', () => {
      render(
        <LoginForm
          onSuccess={mockProps.onSuccess}
          onSwitchToForgotPassword={mockProps.onSwitchToForgotPassword}
        />
      )

      expect(screen.queryByText('新規登録')).not.toBeInTheDocument()
      expect(screen.queryByText('アカウントをお持ちでない場合は')).not.toBeInTheDocument()
    })

    it('should call onSwitchToRegister when create account link is clicked', async () => {
      render(<LoginForm {...mockProps} />)

      const createAccountLink = screen.getByText('新規登録')
      await fireEvent.click(createAccountLink)

      expect(mockProps.onSwitchToRegister).toHaveBeenCalledTimes(1)
    })

    it('should have proper accessibility attributes for create account link', () => {
      render(<LoginForm {...mockProps} />)

      const createAccountLink = screen.getByText('新規登録')
      expect(createAccountLink).toHaveAttribute('type', 'button')
    })
  })

  describe('Form Input Handling', () => {
    it('should update email field when typed', async () => {
      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      expect(emailInput.value).toBe('test@example.com')
    })

    it('should update password field when typed', async () => {
      render(<LoginForm {...mockProps} />)

      const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement
      await fireEvent.change(passwordInput, { target: { value: 'password123' } })

      expect(passwordInput.value).toBe('password123')
    })

    it('should clear field errors when user starts typing', async () => {
      render(<LoginForm {...mockProps} />)

      // Trigger validation error first
      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      expect(screen.getByText('メールアドレスは必須です')).toBeInTheDocument()

      // Start typing to clear error
      const emailInput = screen.getByLabelText('メールアドレス')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      expect(screen.queryByText('メールアドレスは必須です')).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error for empty email', async () => {
      render(<LoginForm {...mockProps} />)

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      expect(screen.getByText('メールアドレスは必須です')).toBeInTheDocument()
    })

    it('should show error for invalid email format', async () => {
      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      await fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      expect(screen.getByText('メールアドレスの形式が正しくありません')).toBeInTheDocument()
    })

    it('should show error for empty password', async () => {
      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      expect(screen.getByText('パスワードは必須です')).toBeInTheDocument()
    })

    it('should not submit form with validation errors', async () => {
      render(<LoginForm {...mockProps} />)

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('should apply error styling to invalid fields', async () => {
      render(<LoginForm {...mockProps} />)

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')

      expect(emailInput).toHaveClass('border-red-300')
      expect(passwordInput).toHaveClass('border-red-300')
    })
  })

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      mockLogin.mockResolvedValue(undefined)

      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')
      const rememberMeCheckbox = screen.getByLabelText('ログインを保持')

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(passwordInput, { target: { value: 'password123' } })
      await fireEvent.click(rememberMeCheckbox)

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      })
    })

    it('should submit form with remember me unchecked', async () => {
      mockLogin.mockResolvedValue(undefined)

      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      })
    })

    it('should call onSuccess after successful login', async () => {
      mockLogin.mockResolvedValue(undefined)

      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockProps.onSuccess).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle login failure gracefully', async () => {
      mockLogin.mockRejectedValue(new Error('Login failed'))

      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(passwordInput, { target: { value: 'wrong-password' } })

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })

      expect(mockProps.onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should show loading state during form submission', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
    })

    it('should disable submit button during loading', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const submitButton = screen.getByRole('button', { name: 'ログイン' })
      await fireEvent.click(submitButton)

      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveClass('disabled:opacity-50')
    })
  })

  describe('Development Environment', () => {
    it('should show development hints in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(<LoginForm {...mockProps} />)

      expect(screen.getByText('開発用テストアカウント:')).toBeInTheDocument()
      expect(screen.getByText('管理者: admin@tradingviewer.com / admin123!')).toBeInTheDocument()
      expect(screen.getByText('ユーザー: user1@test.com / Test123!')).toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })

    it('should not show development hints in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      render(<LoginForm {...mockProps} />)

      expect(screen.queryByText('開発用テストアカウント:')).not.toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<LoginForm {...mockProps} />)

      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
    })

    it('should have proper label associations', () => {
      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')
      const rememberMeCheckbox = screen.getByLabelText('ログインを保持')

      expect(emailInput).toHaveAttribute('id', 'email')
      expect(passwordInput).toHaveAttribute('id', 'password')
      expect(rememberMeCheckbox).toHaveAttribute('id', 'rememberMe')
    })

    it('should have proper button roles', () => {
      render(<LoginForm {...mockProps} />)

      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'パスワードをお忘れですか？' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '新規登録' })).toBeInTheDocument()
    })

    it('should have proper focus management', async () => {
      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')

      emailInput.focus()
      expect(document.activeElement).toBe(emailInput)

      await fireEvent.keyDown(emailInput, { key: 'Tab' })
      expect(document.activeElement).toBe(passwordInput)
    })
  })

  describe('Keyboard Navigation', () => {
    it('should submit form when Enter is pressed in password field', async () => {
      mockLogin.mockResolvedValue(undefined)

      render(<LoginForm {...mockProps} />)

      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')

      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(passwordInput, { target: { value: 'password123' } })

      await fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' })

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      })
    })

    it('should handle space key on checkboxes', async () => {
      render(<LoginForm {...mockProps} />)

      const rememberMeCheckbox = screen.getByLabelText('ログインを保持') as HTMLInputElement
      expect(rememberMeCheckbox.checked).toBe(false)

      rememberMeCheckbox.focus()
      await fireEvent.keyDown(rememberMeCheckbox, { key: ' ', code: 'Space' })

      expect(rememberMeCheckbox.checked).toBe(true)
    })
  })
})
