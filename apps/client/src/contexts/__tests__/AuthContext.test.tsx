import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AuthProvider, useAuth, User } from '../AuthContext'
import { BrowserRouter } from 'react-router-dom'

// Mock ErrorContext
vi.mock('../ErrorContext', () => ({
  useErrorHandlers: () => ({
    handleApiError: vi.fn(),
    handleNetworkError: vi.fn(),
  }),
}))

// Mock apiService
vi.mock('../../services/base/ApiService', () => ({
  apiService: {
    setCSRFToken: vi.fn(),
    clearCSRFToken: vi.fn(),
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  isEmailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
}

const TestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout, register } = useAuth()

  return (
    <div>
      <div data-testid='auth-status'>
        {isLoading ? 'Loading' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      {user && <div data-testid='user-email'>{user.email}</div>}
      <button
        onClick={() => login({ email: 'test@example.com', password: 'password' })}
        data-testid='login-btn'
      >
        Login
      </button>
      <button onClick={logout} data-testid='logout-btn'>
        Logout
      </button>
      <button
        onClick={() => register({ email: 'new@example.com', password: 'password' })}
        data-testid='register-btn'
      >
        Register
      </button>
    </div>
  )
}

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  )
}

describe.skip('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with loading state', () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    renderWithProviders(<TestComponent />)

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Loading')
  })

  it('handles successful authentication check', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { user: mockUser },
      }),
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })
  })

  it('handles failed authentication check', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })
  })

  it('handles successful login', async () => {
    // Mock initial auth check (not authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })

    // Mock successful login
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { user: mockUser },
      }),
    })

    // Mock CSRF token fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { csrfToken: 'mock-csrf-token' },
      }),
    })

    fireEvent.click(screen.getByTestId('login-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })
  })

  it('handles login failure', async () => {
    // Mock initial auth check (not authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })

    // Mock failed login
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        message: 'Invalid credentials',
      }),
    })

    fireEvent.click(screen.getByTestId('login-btn'))

    // Should remain not authenticated
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })
  })

  it('handles logout', async () => {
    // Start with authenticated user
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { user: mockUser },
      }),
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
    })

    // Mock logout
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
      }),
    })

    fireEvent.click(screen.getByTestId('logout-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })
  })

  it('handles registration', async () => {
    // Mock initial auth check (not authenticated)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })

    // Mock successful registration
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { user: { ...mockUser, email: 'new@example.com' } },
      }),
    })

    fireEvent.click(screen.getByTestId('register-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
    })
  })

  it('clears auth state on logout', async () => {
    // Start with authenticated user
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { user: mockUser },
      }),
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })

    // Mock logout
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
      }),
    })

    fireEvent.click(screen.getByTestId('logout-btn'))

    await waitFor(() => {
      expect(screen.queryByTestId('user-email')).not.toBeInTheDocument()
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })
  })

  it('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    })
  })

  it('uses httpOnly cookies for authentication', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { user: mockUser },
      }),
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          credentials: 'include',
        })
      )
    })
  })

  describe('Additional AuthContext Methods', () => {
    const ExtendedTestComponent = () => {
      const {
        user,
        isAuthenticated,
        isLoading,
        updateProfile,
        changePassword,
        deleteAccount,
        forgotPassword,
        resetPassword,
        getCSRFToken,
        requestWithAuth,
      } = useAuth()

      return (
        <div>
          <div data-testid='auth-status'>
            {isLoading ? 'Loading' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </div>
          {user && <div data-testid='user-name'>{user.name}</div>}
          <button
            onClick={() => updateProfile({ name: 'Updated Name' })}
            data-testid='update-profile-btn'
          >
            Update Profile
          </button>
          <button
            onClick={() => changePassword({ currentPassword: 'old', newPassword: 'new' })}
            data-testid='change-password-btn'
          >
            Change Password
          </button>
          <button onClick={deleteAccount} data-testid='delete-account-btn'>
            Delete Account
          </button>
          <button
            onClick={() => forgotPassword({ email: 'test@example.com' })}
            data-testid='forgot-password-btn'
          >
            Forgot Password
          </button>
          <button
            onClick={() => resetPassword({ token: 'reset-token', newPassword: 'new-password' })}
            data-testid='reset-password-btn'
          >
            Reset Password
          </button>
          <button onClick={() => getCSRFToken()} data-testid='get-csrf-btn'>
            Get CSRF Token
          </button>
          <button
            onClick={() => requestWithAuth('/api/test')}
            data-testid='auth-request-btn'
          >
            Authenticated Request
          </button>
        </div>
      )
    }

    it('handles profile update successfully', async () => {
      // Mock initial authenticated state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      })

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { csrfToken: 'csrf-token-123' },
        }),
      })

      // Mock successful profile update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: { ...mockUser, name: 'Updated Name' } },
        }),
      })

      fireEvent.click(screen.getByTestId('update-profile-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('user-name')).toHaveTextContent('Updated Name')
      })
    })

    it('handles profile update error', async () => {
      // Mock initial authenticated state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      })

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { csrfToken: 'csrf-token-123' },
        }),
      })

      // Mock profile update error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Profile update failed' }),
      })

      fireEvent.click(screen.getByTestId('update-profile-btn'))

      // Should remain authenticated with original user data
      await waitFor(() => {
        expect(screen.getByTestId('user-name')).toHaveTextContent('Test User')
      })
    })

    it('handles change password and logs out', async () => {
      // Mock initial authenticated state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      })

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { csrfToken: 'csrf-token-123' },
        }),
      })

      // Mock successful password change
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      fireEvent.click(screen.getByTestId('change-password-btn'))

      // Should log out after password change
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      })
    })

    it('handles account deletion and logs out', async () => {
      // Mock initial authenticated state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      })

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { csrfToken: 'csrf-token-123' },
        }),
      })

      // Mock successful account deletion
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      fireEvent.click(screen.getByTestId('delete-account-btn'))

      // Should log out after account deletion
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      })
    })

    it('handles forgot password request', async () => {
      // Mock initial unauthenticated state
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      })

      // Mock successful forgot password
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      fireEvent.click(screen.getByTestId('forgot-password-btn'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/forgot-password'),
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({ email: 'test@example.com' }),
          })
        )
      })
    })

    it('handles password reset', async () => {
      // Mock initial unauthenticated state
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      })

      // Mock successful password reset
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      fireEvent.click(screen.getByTestId('reset-password-btn'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/reset-password'),
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({ token: 'reset-token', newPassword: 'new-password' }),
          })
        )
      })
    })

    it('handles CSRF token fetching', async () => {
      // Mock initial authenticated state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      })

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { csrfToken: 'new-csrf-token' },
        }),
      })

      fireEvent.click(screen.getByTestId('get-csrf-btn'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/csrf-token'),
          expect.objectContaining({
            method: 'GET',
            credentials: 'include',
          })
        )
      })
    })

    it('handles CSRF retry on 403 errors', async () => {
      // Mock initial authenticated state with CSRF token
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { user: mockUser },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { csrfToken: 'initial-csrf-token' },
          }),
        })

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Mock 403 CSRF error followed by successful retry
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: async () => ({ error: 'CSRF token invalid' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { csrfToken: 'refreshed-csrf-token' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { user: { ...mockUser, name: 'Updated via Retry' } },
          }),
        })

      fireEvent.click(screen.getByTestId('update-profile-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('user-name')).toHaveTextContent('Updated via Retry')
      })
    })

    it('handles 401 errors by clearing auth', async () => {
      // Mock initial authenticated state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      })

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { csrfToken: 'csrf-token-123' },
        }),
      })

      // Mock 401 error (token expired)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })

      fireEvent.click(screen.getByTestId('update-profile-btn'))

      // Should log out after 401 error
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      })
    })

    it('handles authenticated requests', async () => {
      // Mock initial authenticated state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      })

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      })

      // Mock CSRF token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { csrfToken: 'csrf-token-123' },
        }),
      })

      // Mock authenticated request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test response' }),
      })

      fireEvent.click(screen.getByTestId('auth-request-btn'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/test'), // URL should be cleaned (/api prefix removed)
          expect.objectContaining({
            credentials: 'include',
          })
        )
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      renderWithProviders(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      })
    })

    it('handles empty responses (204 No Content)', async () => {
      // Mock initial authenticated state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      })

      const ExtendedTestComponent = () => {
        const { logout } = useAuth()
        return (
          <div>
            <button onClick={logout} data-testid='logout-btn'>
              Logout
            </button>
          </div>
        )
      }

      renderWithProviders(<ExtendedTestComponent />)

      // Mock 204 No Content response for logout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ 'content-length': '0' }),
        json: async () => {
          throw new Error('No content to parse')
        },
      })

      fireEvent.click(screen.getByTestId('logout-btn'))

      // Should handle empty response gracefully
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('handles non-JSON responses', async () => {
      // Mock initial authenticated state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      })

      const ExtendedTestComponent = () => {
        const { updateProfile } = useAuth()
        return (
          <div>
            <button
              onClick={() => updateProfile({ name: 'Test' })}
              data-testid='update-btn'
            >
              Update
            </button>
          </div>
        )
      }

      renderWithProviders(<ExtendedTestComponent />)

      await waitFor(() => {
        // Wait for initial auth state
      })

      // Mock CSRF token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { csrfToken: 'csrf-token' },
        }),
      })

      // Mock non-JSON response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/plain' }),
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      fireEvent.click(screen.getByTestId('update-btn'))

      // Should handle non-JSON response gracefully
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('handles concurrent CSRF token requests', async () => {
      // Mock initial authenticated state
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: mockUser },
        }),
      })

      const ConcurrentTestComponent = () => {
        const { getCSRFToken } = useAuth()
        return (
          <div>
            <button
              onClick={() => {
                // Trigger multiple concurrent CSRF requests
                Promise.all([getCSRFToken(), getCSRFToken(), getCSRFToken()])
              }}
              data-testid='concurrent-csrf-btn'
            >
              Concurrent CSRF
            </button>
          </div>
        )
      }

      renderWithProviders(<ConcurrentTestComponent />)

      // Mock CSRF token responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { csrfToken: 'csrf-1' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { csrfToken: 'csrf-2' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { csrfToken: 'csrf-3' },
          }),
        })

      fireEvent.click(screen.getByTestId('concurrent-csrf-btn'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4) // 1 initial auth + 3 CSRF calls
      })
    })
  })
})
