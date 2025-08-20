// Base API service for centralized API management

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface ApiRequestConfig {
  headers?: Record<string, string>
  timeout?: number
  retries?: number
  requiresAuth?: boolean
  requiresCSRF?: boolean
}

export class ApiService {
  private baseURL: string
  private defaultTimeout = 10000
  private csrfToken: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  // CSRF token management
  setCSRFToken(token: string): void {
    this.csrfToken = token
  }

  clearCSRFToken(): void {
    this.csrfToken = null
  }

  // Core request method with unified error handling
  async request<T>(
    endpoint: string,
    options: RequestInit & ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      headers = {},
      timeout = this.defaultTimeout,
      retries = 0,
      _requiresAuth = true,
      requiresCSRF = false,
      ...requestOptions
    } = options

    const url = `${this.baseURL}${endpoint}`

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    // Add CSRF token for state-changing operations
    if (requiresCSRF && this.csrfToken) {
      requestHeaders['x-csrf-token'] = this.csrfToken
      console.log(
        '🔐 ApiService sending CSRF token:',
        this.csrfToken.substring(0, 8) + '...',
        'for',
        endpoint
      )
    } else if (requiresCSRF) {
      console.warn('🔐 CSRF token required but not available for', endpoint)
    }

    const config: RequestInit = {
      credentials: 'include', // Always include httpOnly cookies
      headers: requestHeaders,
      ...requestOptions,
    }

    // Timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw {
          response: {
            status: response.status,
            data: errorData,
          },
        }
      }

      const data = await response.json()
      return data
    } catch (error: unknown) {
      clearTimeout(timeoutId)

      // Handle timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timeout')
      }

      // Handle retry logic
      if (retries > 0 && this.shouldRetry(error)) {
        await this.delay(Math.pow(2, 3 - retries) * 1000) // Exponential backoff
        return this.request<T>(endpoint, { ...options, retries: retries - 1 })
      }

      throw new Error('Operation failed')
    }
  }

  // HTTP method shortcuts
  async get<T>(endpoint: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', ...config })
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      requiresCSRF: true,
      ...config,
    })
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      requiresCSRF: true,
      ...config,
    })
  }

  async delete<T>(endpoint: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      requiresCSRF: true,
      ...config,
    })
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      requiresCSRF: true,
      ...config,
    })
  }

  // Utility methods
  private shouldRetry(error: unknown): boolean {
    // Retry on network errors and 5xx server errors
    if (!error || typeof error !== 'object' || !('response' in error)) return true
    const response = (error as { response?: { status?: number } }).response
    if (!response?.status) return true
    const status = response.status
    return status >= 500 && status < 600
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health', { requiresAuth: false, timeout: 5000 })
      return true
    } catch {
      return false
    }
  }

  // Batch requests
  async batch<T>(requests: Array<() => Promise<ApiResponse<T>>>): Promise<ApiResponse<T>[]> {
    return Promise.all(requests.map(request => request()))
  }
}

// Singleton instance
export const apiService = new ApiService(
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
)
