import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { render } from '../test-utils'
import UserProfile from '../../components/auth/UserProfile'
import { setupMockServer, closeMockServer, server } from '../__mocks__/server'
import { rest } from 'msw'

describe.skip('Change Password - Full Integration Test', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as const,
    avatar: '',
    isActive: true,
    isEmailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  const mockAuthToken = 'mock-jwt-token'
  const mockCsrfToken = 'mock-csrf-token'

  beforeAll(() => {
    setupMockServer()
  })

  afterAll(() => {
    closeMockServer()
  })

  beforeEach(() => {
    // Mock localStorage for auth token
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue(mockAuthToken),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    })

    // Setup default API responses
    server.use(
      // User data endpoint
      rest.get('http://localhost:8000/api/auth/me', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            success: true,
            data: { user: mockUser },
          })
        )
      }),

      // CSRF token endpoint
      rest.get('http://localhost:8000/api/auth/csrf', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            success: true,
            data: { csrfToken: mockCsrfToken },
          })
        )
      }),

      // Change password endpoint - success case
      rest.post('http://localhost:8000/api/auth/change-password', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            success: true,
            message: 'Password changed successfully. Please log in again.',
          })
        )
      })
    )
  })

  afterEach(() => {
    server.resetHandlers()
    vi.clearAllMocks()
  })

  describe('End-to-End Password Change Flow', () => {
    it('should successfully change password through full stack', async () => {
      // Arrange
      render(<UserProfile />)

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      await waitFor(() => {
        expect(screen.getByLabelText('現在のパスワード')).toBeInTheDocument()
      })

      // Act - Fill password change form
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.type(currentPasswordInput, 'current123')
      await fireEvent.type(newPasswordInput, 'newpass123')
      await fireEvent.type(confirmPasswordInput, 'newpass123')

      // Submit form
      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      // Assert - Success message should appear
      await waitFor(
        () => {
          expect(
            screen.getByText('パスワードを変更しました。再度ログインしてください。')
          ).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })

    it('should handle incorrect current password', async () => {
      // Arrange - Override API to return incorrect password error
      server.use(
        rest.post('http://localhost:8000/api/auth/change-password', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({
              success: false,
              error: 'Current password is incorrect',
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      // Act - Enter incorrect current password
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.type(currentPasswordInput, 'wrongpassword')
      await fireEvent.type(newPasswordInput, 'newpass123')
      await fireEvent.type(confirmPasswordInput, 'newpass123')

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      // Assert - Error should be displayed
      await waitFor(
        () => {
          expect(screen.getByText(/current password.*incorrect/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })

    it('should validate password confirmation mismatch', async () => {
      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      // Act - Enter mismatched passwords
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.type(currentPasswordInput, 'current123')
      await fireEvent.type(newPasswordInput, 'newpass123')
      await fireEvent.type(confirmPasswordInput, 'different123')

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      // Assert - Validation error should appear (client-side)
      await waitFor(() => {
        expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument()
      })

      // API should not be called for client-side validation
      expect(screen.queryByText(/Password changed successfully/i)).not.toBeInTheDocument()
    })

    it('should validate password strength requirements', async () => {
      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      // Act - Enter weak password
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.type(currentPasswordInput, 'current123')
      await fireEvent.type(newPasswordInput, '123') // Too short
      await fireEvent.type(confirmPasswordInput, '123')

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      // Assert - Client-side validation error
      await waitFor(() => {
        expect(screen.getByText('パスワードは 8 文字以上である必要があります')).toBeInTheDocument()
      })
    })

    it('should handle server validation errors', async () => {
      // Arrange - Server rejects weak password
      server.use(
        rest.post('http://localhost:8000/api/auth/change-password', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error:
                'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      // Act - Enter password that passes client validation but fails server validation
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.type(currentPasswordInput, 'current123')
      await fireEvent.type(newPasswordInput, 'onlylowercase') // No uppercase/numbers
      await fireEvent.type(confirmPasswordInput, 'onlylowercase')

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      // Assert - Server validation error should be displayed
      await waitFor(
        () => {
          expect(
            screen.getByText(/must contain.*uppercase.*lowercase.*number/i)
          ).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })

    it('should handle network errors with user-friendly message', async () => {
      // Arrange - Network failure
      server.use(
        rest.post('http://localhost:8000/api/auth/change-password', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }))
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      // Act
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.type(currentPasswordInput, 'current123')
      await fireEvent.type(newPasswordInput, 'newpass123')
      await fireEvent.type(confirmPasswordInput, 'newpass123')

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      // Assert - Generic error message should appear
      await waitFor(
        () => {
          expect(
            screen.getByText(/システムエラーが発生しました|エラーが発生しました/i)
          ).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })

    it('should show loading state during password change', async () => {
      // Arrange - Slow API response
      server.use(
        rest.post('http://localhost:8000/api/auth/change-password', (req, res, ctx) => {
          return res(
            ctx.delay(2000),
            ctx.status(200),
            ctx.json({
              success: true,
              message: 'Password changed successfully. Please log in again.',
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      // Act
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.type(currentPasswordInput, 'current123')
      await fireEvent.type(newPasswordInput, 'newpass123')
      await fireEvent.type(confirmPasswordInput, 'newpass123')

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      // Assert - Loading state should be visible
      expect(changeButton).toBeDisabled()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner

      // Wait for completion
      await waitFor(
        () => {
          expect(
            screen.getByText('パスワードを変更しました。再度ログインしてください。')
          ).toBeInTheDocument()
        },
        { timeout: 10000 }
      )
    })
  })

  describe('Security and Session Management', () => {
    it('should handle session expiration during password change', async () => {
      // Arrange - Token expired response
      server.use(
        rest.post('http://localhost:8000/api/auth/change-password', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({
              success: false,
              error: 'Token expired',
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      // Act
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.type(currentPasswordInput, 'current123')
      await fireEvent.type(newPasswordInput, 'newpass123')
      await fireEvent.type(confirmPasswordInput, 'newpass123')

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      // Assert - Should redirect to login or show session expired message
      await waitFor(
        () => {
          expect(screen.getByText(/session.*expired|login.*required/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })

    it('should clear form after successful password change', async () => {
      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      // Act
      const currentPasswordInput = screen.getByLabelText('現在のパスワード') as HTMLInputElement
      const newPasswordInput = screen.getByLabelText('新しいパスワード') as HTMLInputElement
      const confirmPasswordInput = screen.getByLabelText(
        '新しいパスワード（確認）'
      ) as HTMLInputElement

      await fireEvent.type(currentPasswordInput, 'current123')
      await fireEvent.type(newPasswordInput, 'newpass123')
      await fireEvent.type(confirmPasswordInput, 'newpass123')

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      // Assert - Form should be cleared after success
      await waitFor(() => {
        expect(
          screen.getByText('パスワードを変更しました。再度ログインしてください。')
        ).toBeInTheDocument()
      })

      // Check form is cleared
      await waitFor(() => {
        expect(currentPasswordInput.value).toBe('')
        expect(newPasswordInput.value).toBe('')
        expect(confirmPasswordInput.value).toBe('')
      })
    })

    it('should validate CSRF token is included in request', async () => {
      // Arrange - Track CSRF token usage
      let csrfTokenUsed = false
      server.use(
        rest.post('http://localhost:8000/api/auth/change-password', (req, res, ctx) => {
          const csrfToken = req.headers.get('X-CSRF-Token')
          if (csrfToken === mockCsrfToken) {
            csrfTokenUsed = true
            return res(
              ctx.status(200),
              ctx.json({
                success: true,
                message: 'Password changed successfully. Please log in again.',
              })
            )
          }
          return res(
            ctx.status(403),
            ctx.json({
              success: false,
              error: 'Invalid CSRF token',
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Navigate to Security tab
      const securityTab = screen.getByText('セキュリティ')
      await fireEvent.click(securityTab)

      // Act
      const currentPasswordInput = screen.getByLabelText('現在のパスワード')
      const newPasswordInput = screen.getByLabelText('新しいパスワード')
      const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）')

      await fireEvent.type(currentPasswordInput, 'current123')
      await fireEvent.type(newPasswordInput, 'newpass123')
      await fireEvent.type(confirmPasswordInput, 'newpass123')

      const changeButton = screen.getByText('パスワード変更')
      await fireEvent.click(changeButton)

      // Assert - Should succeed with valid CSRF token
      await waitFor(() => {
        expect(
          screen.getByText('パスワードを変更しました。再度ログインしてください。')
        ).toBeInTheDocument()
      })

      expect(csrfTokenUsed).toBe(true)
    })
  })
})
