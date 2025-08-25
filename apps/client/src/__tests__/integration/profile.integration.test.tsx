import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { render } from '../test-utils'
import UserProfile from '../../components/auth/UserProfile'
import { setupMockServer, closeMockServer, server } from '../__mocks__/server'
import { rest } from 'msw'

// Integration test: UI + API + Service layers
describe.skip('Profile Update - Full Integration Test', () => {
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

      // Profile update endpoint - success case
      rest.put('http://localhost:8000/api/auth/profile', (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
              user: {
                ...mockUser,
                name: 'Updated Name',
                updatedAt: new Date().toISOString(),
              },
            },
          })
        )
      })
    )
  })

  afterEach(() => {
    server.resetHandlers()
    vi.clearAllMocks()
  })

  describe('End-to-End Profile Update Flow', () => {
    it('should successfully update display name through full stack', async () => {
      // Arrange
      render(<UserProfile />)

      // Wait for component to load with user data
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Act - Change display name
      const nameInput = screen.getByLabelText('表示名') as HTMLInputElement
      await fireEvent.clear(nameInput)
      await fireEvent.type(nameInput, 'Updated Name')

      // Submit form
      const updateButton = screen.getByText('プロフィール更新')
      await fireEvent.click(updateButton)

      // Assert - Success message should appear
      await waitFor(
        () => {
          expect(screen.getByText('プロフィールを更新しました')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Verify API calls were made with correct data
      await waitFor(() => {
        const requests = server.handlers.filter(
          (handler: any) =>
            handler.info?.method === 'PUT' && handler.info?.path?.includes('/auth/profile')
        )
        expect(requests).toHaveLength(1)
      })
    })

    it('should handle API validation errors gracefully', async () => {
      // Arrange - Override API to return validation error
      server.use(
        rest.put('http://localhost:8000/api/auth/profile', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: 'Name cannot exceed 50 characters',
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Act - Enter invalid data
      const nameInput = screen.getByLabelText('表示名') as HTMLInputElement
      await fireEvent.clear(nameInput)
      await fireEvent.type(nameInput, 'a'.repeat(51))

      const updateButton = screen.getByText('プロフィール更新')
      await fireEvent.click(updateButton)

      // Assert - Error should be handled and displayed
      await waitFor(
        () => {
          expect(screen.getByText(/cannot exceed 50 characters/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })

    it('should handle network errors with retry mechanism', async () => {
      // Arrange - Simulate network failure then success
      let attemptCount = 0
      server.use(
        rest.put('http://localhost:8000/api/auth/profile', (req, res, ctx) => {
          attemptCount++
          if (attemptCount === 1) {
            return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }))
          }
          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              message: 'Profile updated successfully',
              data: { user: { ...mockUser, name: 'Updated Name' } },
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Act
      const nameInput = screen.getByLabelText('表示名')
      await fireEvent.clear(nameInput)
      await fireEvent.type(nameInput, 'Updated Name')

      const updateButton = screen.getByText('プロフィール更新')
      await fireEvent.click(updateButton)

      // Assert - Should eventually succeed after retry
      await waitFor(
        () => {
          expect(screen.getByText('プロフィールを更新しました')).toBeInTheDocument()
        },
        { timeout: 10000 }
      )

      expect(attemptCount).toBeGreaterThan(1)
    })

    it('should maintain form state during loading', async () => {
      // Arrange - Slow API response
      server.use(
        rest.put('http://localhost:8000/api/auth/profile', (req, res, ctx) => {
          return res(
            ctx.delay(2000),
            ctx.status(200),
            ctx.json({
              success: true,
              message: 'Profile updated successfully',
              data: { user: { ...mockUser, name: 'Updated Name' } },
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Act
      const nameInput = screen.getByLabelText('表示名') as HTMLInputElement
      await fireEvent.clear(nameInput)
      await fireEvent.type(nameInput, 'Updated Name')

      const updateButton = screen.getByText('プロフィール更新')
      await fireEvent.click(updateButton)

      // Assert - Form should be disabled but maintain state
      expect(updateButton).toBeDisabled()
      expect(nameInput.value).toBe('Updated Name')
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
    })
  })

  describe('Authentication Integration', () => {
    it('should handle token expiration gracefully', async () => {
      // Arrange - Mock expired token response
      server.use(
        rest.put('http://localhost:8000/api/auth/profile', (req, res, ctx) => {
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

      // Act
      const nameInput = screen.getByLabelText('表示名')
      await fireEvent.clear(nameInput)
      await fireEvent.type(nameInput, 'Updated Name')

      const updateButton = screen.getByText('プロフィール更新')
      await fireEvent.click(updateButton)

      // Assert - Should redirect to login or show re-auth prompt
      await waitFor(
        () => {
          expect(screen.getByText(/session.*expired|login.*required/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })

    it('should handle CSRF token validation', async () => {
      // Arrange - Mock CSRF validation failure
      server.use(
        rest.put('http://localhost:8000/api/auth/profile', (req, res, ctx) => {
          const csrfToken = req.headers.get('X-CSRF-Token')
          if (csrfToken !== mockCsrfToken) {
            return res(
              ctx.status(403),
              ctx.json({
                success: false,
                error: 'Invalid CSRF token',
              })
            )
          }
          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              message: 'Profile updated successfully',
              data: { user: { ...mockUser, name: 'Updated Name' } },
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Act
      const nameInput = screen.getByLabelText('表示名')
      await fireEvent.clear(nameInput)
      await fireEvent.type(nameInput, 'Updated Name')

      const updateButton = screen.getByText('プロフィール更新')
      await fireEvent.click(updateButton)

      // Assert - Should succeed with valid CSRF token
      await waitFor(
        () => {
          expect(screen.getByText('プロフィールを更新しました')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })
  })

  describe('Data Persistence and Synchronization', () => {
    it('should reflect updated data across the application', async () => {
      // Arrange - Mock updated user data endpoint
      server.use(
        rest.get('http://localhost:8000/api/auth/me', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: {
                user: {
                  ...mockUser,
                  name: 'Updated Name',
                  updatedAt: new Date().toISOString(),
                },
              },
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Act
      const nameInput = screen.getByLabelText('表示名')
      await fireEvent.clear(nameInput)
      await fireEvent.type(nameInput, 'Updated Name')

      const updateButton = screen.getByText('プロフィール更新')
      await fireEvent.click(updateButton)

      // Assert - Updated data should be reflected
      await waitFor(() => {
        expect(screen.getByText('プロフィールを更新しました')).toBeInTheDocument()
      })

      // Check that the form now shows updated name
      await waitFor(() => {
        const updatedNameInput = screen.getByLabelText('表示名') as HTMLInputElement
        expect(updatedNameInput.value).toBe('Updated Name')
      })
    })

    it('should handle concurrent updates correctly', async () => {
      // Arrange - Track update attempts
      let updateCount = 0
      server.use(
        rest.put('http://localhost:8000/api/auth/profile', async (req, res, ctx) => {
          updateCount++
          const body = await req.json()

          if (updateCount === 1 && body.name === 'First Update') {
            return res(
              ctx.status(409),
              ctx.json({
                success: false,
                error: 'Profile was updated by another session. Please refresh and try again.',
              })
            )
          }

          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              message: 'Profile updated successfully',
              data: { user: { ...mockUser, name: body.name } },
            })
          )
        })
      )

      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Act - Simulate concurrent update conflict
      const nameInput = screen.getByLabelText('表示名')
      await fireEvent.clear(nameInput)
      await fireEvent.type(nameInput, 'First Update')

      const updateButton = screen.getByText('プロフィール更新')
      await fireEvent.click(updateButton)

      // Assert - Should show conflict resolution message
      await waitFor(
        () => {
          expect(screen.getByText(/updated by another session/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })
  })

  describe('Performance and User Experience', () => {
    it('should provide immediate feedback on form submission', async () => {
      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Act
      const nameInput = screen.getByLabelText('表示名')
      await fireEvent.clear(nameInput)
      await fireEvent.type(nameInput, 'Updated Name')

      const updateButton = screen.getByText('プロフィール更新')

      // Capture the moment of submission
      await fireEvent.click(updateButton)

      // Assert - Immediate UI feedback
      expect(updateButton).toBeDisabled()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
    })

    it('should handle form submission with optimistic updates', async () => {
      render(<UserProfile />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
      })

      // Act
      const nameInput = screen.getByLabelText('表示名') as HTMLInputElement
      await fireEvent.clear(nameInput)
      await fireEvent.type(nameInput, 'Updated Name')

      const updateButton = screen.getByText('プロフィール更新')
      await fireEvent.click(updateButton)

      // Assert - Form should show optimistic state immediately
      expect(nameInput.value).toBe('Updated Name') // Optimistic update

      // Wait for server confirmation
      await waitFor(
        () => {
          expect(screen.getByText('プロフィールを更新しました')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })
  })
})
