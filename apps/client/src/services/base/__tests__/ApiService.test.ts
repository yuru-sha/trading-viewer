import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ApiService } from '../ApiService'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock AbortController
const mockAbortController = {
  abort: vi.fn(),
  signal: { aborted: false }
}
global.AbortController = vi.fn(() => mockAbortController) as any

// Mock setTimeout/clearTimeout
const mockSetTimeout = vi.fn()
const mockClearTimeout = vi.fn()
global.setTimeout = mockSetTimeout
global.clearTimeout = mockClearTimeout

describe.skip('ApiService', () => {
  let apiService: ApiService
  const baseURL = 'https://api.test.com'

  beforeEach(() => {
    vi.clearAllMocks()
    apiService = new ApiService(baseURL)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('should set baseURL correctly', () => {
      const service = new ApiService('https://example.com')
      expect(service['baseURL']).toBe('https://example.com')
    })

    it('should initialize with default values', () => {
      expect(apiService['defaultTimeout']).toBe(10000)
      expect(apiService['csrfToken']).toBe(null)
    })
  })

  describe('CSRF Token Management', () => {
    it('should set CSRF token correctly', () => {
      const token = 'test-csrf-token-123'
      apiService.setCSRFToken(token)
      
      expect(apiService['csrfToken']).toBe(token)
    })

    it('should clear CSRF token correctly', () => {
      apiService.setCSRFToken('test-token')
      apiService.clearCSRFToken()
      
      expect(apiService['csrfToken']).toBe(null)
    })
  })

  describe('request method', () => {
    beforeEach(() => {
      mockSetTimeout.mockImplementation((fn, delay) => {
        // Store the timeout function but don't execute it immediately
        return setTimeout(fn, delay)
      })
    })

    it('should make successful GET request', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, data: 'test data' })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await apiService.request('/test')

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: mockAbortController.signal
      })
      expect(result).toEqual({ success: true, data: 'test data' })
    })

    it('should add CSRF token when required', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)
      
      const token = 'csrf-token-123'
      apiService.setCSRFToken(token)

      await apiService.request('/test', { requiresCSRF: true })

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        },
        signal: mockAbortController.signal
      })
      expect(console.log).toHaveBeenCalledWith(
        '🔐 ApiService sending CSRF token:',
        'csrf-tok...',
        'for',
        '/test'
      )
    })

    it('should warn when CSRF token required but not available', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await apiService.request('/test', { requiresCSRF: true })

      expect(console.warn).toHaveBeenCalledWith('🔐 CSRF token required but not available for', '/test')
    })

    it('should include custom headers', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const customHeaders = { 'X-Custom-Header': 'custom-value' }
      await apiService.request('/test', { headers: customHeaders })

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value'
        },
        signal: mockAbortController.signal
      })
    })

    it('should handle HTTP error responses', async () => {
      const errorData = { message: 'Bad Request', code: 'INVALID_DATA' }
      const mockResponse = {
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue(errorData)
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(apiService.request('/test')).rejects.toEqual({
        response: {
          status: 400,
          data: errorData
        }
      })
    })

    it('should handle HTTP error with invalid JSON response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      }
      mockFetch.mockResolvedValue(mockResponse)

      await expect(apiService.request('/test')).rejects.toEqual({
        response: {
          status: 500,
          data: {}
        }
      })
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(apiService.request('/test')).rejects.toThrow('Operation failed')
    })

    it('should handle timeout', async () => {
      const abortError = new DOMException('Aborted', 'AbortError')
      mockFetch.mockRejectedValue(abortError)

      await expect(apiService.request('/test')).rejects.toThrow('Request timeout')
    })

    it('should use custom timeout', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const customTimeout = 5000
      await apiService.request('/test', { timeout: customTimeout })

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), customTimeout)
    })

    it('should clear timeout on successful response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)
      const timeoutId = 123
      mockSetTimeout.mockReturnValue(timeoutId)

      await apiService.request('/test')

      expect(mockClearTimeout).toHaveBeenCalledWith(timeoutId)
    })

    it('should clear timeout on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      const timeoutId = 456
      mockSetTimeout.mockReturnValue(timeoutId)

      await expect(apiService.request('/test')).rejects.toThrow('Operation failed')
      expect(mockClearTimeout).toHaveBeenCalledWith(timeoutId)
    })
  })

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ success: true })
        })

      // Mock delay method
      vi.spyOn(apiService as any, 'delay').mockResolvedValue(undefined)

      const result = await apiService.request('/test', { retries: 1 })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true })
    })

    it('should retry on server errors (5xx)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: vi.fn().mockResolvedValue({ error: 'Server error' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ success: true })
        })

      vi.spyOn(apiService as any, 'delay').mockResolvedValue(undefined)

      const result = await apiService.request('/test', { retries: 1 })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true })
    })

    it('should not retry on client errors (4xx)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Bad Request' })
      })

      await expect(apiService.request('/test', { retries: 1 })).rejects.toEqual({
        response: { status: 400, data: { error: 'Bad Request' } }
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should use exponential backoff', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ success: true })
        })

      const delaySpy = vi.spyOn(apiService as any, 'delay').mockResolvedValue(undefined)

      await apiService.request('/test', { retries: 2 })

      expect(delaySpy).toHaveBeenCalledWith(2000) // 2^(3-2) * 1000 = 2000
      expect(delaySpy).toHaveBeenCalledWith(4000) // 2^(3-1) * 1000 = 4000
    })

    it('should exhaust retries and throw final error', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent network error'))
      vi.spyOn(apiService as any, 'delay').mockResolvedValue(undefined)

      await expect(apiService.request('/test', { retries: 2 })).rejects.toThrow('Operation failed')

      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('HTTP method shortcuts', () => {
    beforeEach(() => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true, data: 'test' })
      }
      mockFetch.mockResolvedValue(mockResponse)
    })

    it('should make GET request', async () => {
      const result = await apiService.get('/test', { requiresAuth: false })

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        requiresAuth: false,
        signal: mockAbortController.signal
      })
      expect(result).toEqual({ success: true, data: 'test' })
    })

    it('should make POST request with data', async () => {
      const data = { name: 'test', value: 123 }
      await apiService.post('/test', data)

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        method: 'POST',
        body: JSON.stringify(data),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: mockAbortController.signal
      })
    })

    it('should make POST request without data', async () => {
      await apiService.post('/test')

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/test`, {
        method: 'POST',
        body: undefined,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: mockAbortController.signal
      })
    })

    it('should make PUT request', async () => {
      const data = { id: 1, name: 'updated' }
      await apiService.put('/test/1', data)

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/test/1`, {
        method: 'PUT',
        body: JSON.stringify(data),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: mockAbortController.signal
      })
    })

    it('should make DELETE request', async () => {
      await apiService.delete('/test/1')

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/test/1`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: mockAbortController.signal
      })
    })

    it('should make PATCH request', async () => {
      const data = { status: 'active' }
      await apiService.patch('/test/1', data)

      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/test/1`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: mockAbortController.signal
      })
    })

    it('should override default requiresCSRF for POST', async () => {
      await apiService.post('/test', { data: 'test' }, { requiresCSRF: false })

      // Verify CSRF token header is NOT added when requiresCSRF is false
      const call = mockFetch.mock.calls[0][1]
      expect(call.headers).not.toHaveProperty('x-csrf-token')
    })
  })

  describe('shouldRetry method', () => {
    it('should return true for network errors without response', () => {
      const networkError = new Error('Network error')
      const result = apiService['shouldRetry'](networkError)
      expect(result).toBe(true)
    })

    it('should return true for 500 errors', () => {
      const serverError = { response: { status: 500 } }
      const result = apiService['shouldRetry'](serverError)
      expect(result).toBe(true)
    })

    it('should return true for 502, 503, 504 errors', () => {
      expect(apiService['shouldRetry']({ response: { status: 502 } })).toBe(true)
      expect(apiService['shouldRetry']({ response: { status: 503 } })).toBe(true)
      expect(apiService['shouldRetry']({ response: { status: 504 } })).toBe(true)
    })

    it('should return false for client errors (4xx)', () => {
      expect(apiService['shouldRetry']({ response: { status: 400 } })).toBe(false)
      expect(apiService['shouldRetry']({ response: { status: 401 } })).toBe(false)
      expect(apiService['shouldRetry']({ response: { status: 404 } })).toBe(false)
    })

    it('should return true for errors without status', () => {
      expect(apiService['shouldRetry']({ response: {} })).toBe(true)
      expect(apiService['shouldRetry']({})).toBe(true)
      expect(apiService['shouldRetry'](null)).toBe(true)
      expect(apiService['shouldRetry'](undefined)).toBe(true)
    })
  })

  describe('delay method', () => {
    it('should resolve after specified delay', async () => {
      vi.useFakeTimers()
      
      const delayPromise = apiService['delay'](1000)
      vi.advanceTimersByTime(1000)
      
      await expect(delayPromise).resolves.toBeUndefined()
      
      vi.useRealTimers()
    })
  })

  describe('healthCheck method', () => {
    it('should return true for successful health check', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'healthy' })
      })

      const result = await apiService.healthCheck()

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}/health`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: mockAbortController.signal
      })
    })

    it('should return false for failed health check', async () => {
      mockFetch.mockRejectedValue(new Error('Health check failed'))

      const result = await apiService.healthCheck()

      expect(result).toBe(false)
    })

    it('should return false for HTTP error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: vi.fn().mockResolvedValue({ error: 'Service unavailable' })
      })

      const result = await apiService.healthCheck()

      expect(result).toBe(false)
    })
  })

  describe('batch method', () => {
    it('should execute multiple requests in parallel', async () => {
      const mockResponse1 = { success: true, data: 'result1' }
      const mockResponse2 = { success: true, data: 'result2' }
      const mockResponse3 = { success: true, data: 'result3' }

      const requests = [
        () => Promise.resolve(mockResponse1),
        () => Promise.resolve(mockResponse2),
        () => Promise.resolve(mockResponse3)
      ]

      const results = await apiService.batch(requests)

      expect(results).toEqual([mockResponse1, mockResponse2, mockResponse3])
    })

    it('should handle mixed success and failure in batch', async () => {
      const requests = [
        () => Promise.resolve({ success: true, data: 'result1' }),
        () => Promise.reject(new Error('Request failed')),
        () => Promise.resolve({ success: true, data: 'result3' })
      ]

      await expect(apiService.batch(requests)).rejects.toThrow('Request failed')
    })

    it('should handle empty batch requests', async () => {
      const results = await apiService.batch([])
      expect(results).toEqual([])
    })
  })

  describe('Edge Cases and Error Boundaries', () => {
    it('should handle malformed fetch response', async () => {
      const badResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      }
      mockFetch.mockResolvedValue(badResponse)

      await expect(apiService.request('/test')).rejects.toThrow('Operation failed')
    })

    it('should handle null/undefined endpoint', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await apiService.request('')
      expect(mockFetch).toHaveBeenCalledWith(`${baseURL}`, expect.any(Object))
    })

    it('should handle circular JSON data', async () => {
      const circularData: any = { name: 'test' }
      circularData.self = circularData

      await expect(() => apiService.post('/test', circularData)).rejects.toThrow()
    })

    it('should handle very large timeout values', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      await apiService.request('/test', { timeout: Number.MAX_SAFE_INTEGER })
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), Number.MAX_SAFE_INTEGER)
    })

    it('should handle concurrent requests with different configurations', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const token = 'test-csrf-token'
      apiService.setCSRFToken(token)

      // Make concurrent requests with different configs
      const promises = [
        apiService.get('/test1', { requiresAuth: false }),
        apiService.post('/test2', { data: 'test' }, { requiresCSRF: true }),
        apiService.put('/test3', { data: 'test' }, { requiresCSRF: false })
      ]

      await Promise.all(promises)

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })
})