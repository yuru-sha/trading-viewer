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
})
