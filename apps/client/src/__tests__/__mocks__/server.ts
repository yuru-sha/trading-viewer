import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock server for integration tests
const handlers = [
  // Default handlers - can be overridden in individual tests
  http.get('http://localhost:8000/api/auth/me', () => {
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          avatar: '',
          isActive: true,
          isEmailVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      },
    })
  }),

  http.get('http://localhost:8000/api/auth/csrf', () => {
    return HttpResponse.json({
      success: true,
      data: {
        csrfToken: 'mock-csrf-token',
      },
    })
  }),

  http.put('http://localhost:8000/api/auth/profile', () => {
    return HttpResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: 'user_123',
          email: 'test@example.com',
          name: 'Updated Name',
          role: 'user',
          avatar: '',
          isActive: true,
          isEmailVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: new Date().toISOString(),
        },
      },
    })
  }),
]

export const server = setupServer(...handlers)

export const setupMockServer = () => {
  server.listen({ onUnhandledRequest: 'warn' })
}

export const closeMockServer = () => {
  server.close()
}
