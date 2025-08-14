import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ERROR_TIMEOUTS, UI_TIMEOUTS } from '@shared'
import { useError } from '../contexts/ErrorContext'

/**
 * Hook decorator types and interfaces
 */
export type HookFunction<T extends any[], R> = (...args: T) => R
export type AsyncHookFunction<T extends any[], R> = (...args: T) => Promise<R>

export interface LoadingDecoratorOptions {
  initialLoading?: boolean
  loadingDelay?: number
}

export interface RetryDecoratorOptions {
  maxRetries?: number
  retryDelay?: number
  exponentialBackoff?: boolean
  retryCondition?: (error: any) => boolean
}

export interface CacheDecoratorOptions {
  ttl?: number // Time to live in ms
  key?: (...args: any[]) => string
  staleWhileRevalidate?: boolean
}

export interface ThrottleDecoratorOptions {
  delay?: number
  leading?: boolean
  trailing?: boolean
}

export interface ValidationDecoratorOptions<T extends any[]> {
  validator: (...args: T) => boolean | string
  onValidationError?: (error: string) => void
}

/**
 * Loading State Decorator
 * Adds loading state management to any hook
 */
export function withLoading<T extends any[], R>(
  hook: HookFunction<T, R>,
  options: LoadingDecoratorOptions = {}
) {
  const { initialLoading = false, loadingDelay = 0 } = options

  return (...args: T) => {
    const [loading, setLoading] = useState(initialLoading)
    const [delayedLoading, setDelayedLoading] = useState(false)

    const originalResult = hook(...args)

    // Handle delayed loading state
    useEffect(() => {
      if (loading && loadingDelay > 0) {
        const timer = setTimeout(() => {
          setDelayedLoading(true)
        }, loadingDelay)

        return () => {
          clearTimeout(timer)
          setDelayedLoading(false)
        }
      } else {
        setDelayedLoading(loading)
      }
    }, [loading, loadingDelay])

    return {
      ...originalResult,
      loading: delayedLoading,
      setLoading,
      isLoading: delayedLoading,
    }
  }
}

/**
 * Error Handling Decorator
 * Adds comprehensive error handling to hooks
 */
export function withErrorHandling<T extends any[], R>(
  hook: HookFunction<T, R>,
  options: {
    showErrorNotification?: boolean
    fallbackValue?: R
    onError?: (error: Error) => void
  } = {}
) {
  const { showErrorNotification = true, fallbackValue, onError } = options

  return (...args: T) => {
    const [error, setError] = useState<Error | null>(null)
    const { addError } = useError()

    const wrappedHook = useCallback(
      (...args: T) => {
        try {
          setError(null)
          return hook(...args)
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          setError(error)

          if (onError) {
            onError(error)
          }

          if (showErrorNotification) {
            addError({
              type: 'error',
              title: 'Hook Error',
              message: error.message,
              source: 'client',
            })
          }

          return fallbackValue
        }
      },
      [addError, onError, showErrorNotification, fallbackValue]
    )

    const result = wrappedHook(...args)

    return {
      ...result,
      error,
      hasError: error !== null,
      clearError: () => setError(null),
    }
  }
}

/**
 * Retry Decorator
 * Adds automatic retry functionality to async hooks
 */
export function withRetry<T extends any[], R>(
  asyncHook: AsyncHookFunction<T, R>,
  options: RetryDecoratorOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    retryCondition = () => true,
  } = options

  return (...args: T) => {
    const [retryCount, setRetryCount] = useState(0)
    const [isRetrying, setIsRetrying] = useState(false)

    const executeWithRetry = useCallback(
      async (...args: T): Promise<R> => {
        let attempt = 0

        while (attempt <= maxRetries) {
          try {
            setIsRetrying(attempt > 0)
            const result = await asyncHook(...args)
            setRetryCount(0)
            setIsRetrying(false)
            return result
          } catch (error) {
            attempt++
            setRetryCount(attempt)

            if (attempt > maxRetries || !retryCondition(error)) {
              setIsRetrying(false)
              throw error
            }

            // Calculate retry delay
            const delay = exponentialBackoff ? retryDelay * Math.pow(2, attempt - 1) : retryDelay

            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }

        throw new Error('Max retries exceeded')
      },
      [asyncHook, maxRetries, retryDelay, exponentialBackoff, retryCondition]
    )

    return {
      execute: executeWithRetry,
      retryCount,
      isRetrying,
      canRetry: retryCount < maxRetries,
    }
  }
}

/**
 * Caching Decorator
 * Adds intelligent caching to hooks
 */
export function withCache<T extends any[], R>(
  hook: HookFunction<T, R>,
  options: CacheDecoratorOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    key = (...args) => JSON.stringify(args),
    staleWhileRevalidate = false,
  } = options

  return (...args: T) => {
    const cacheKey = useMemo(() => key(...args), [key, ...args])
    const [cache] = useState(new Map<string, { data: R; timestamp: number }>())
    const [isRevalidating, setIsRevalidating] = useState(false)

    const getCachedResult = useCallback(() => {
      const cached = cache.get(cacheKey)
      if (!cached) return null

      const isExpired = Date.now() - cached.timestamp > ttl
      if (isExpired && !staleWhileRevalidate) {
        cache.delete(cacheKey)
        return null
      }

      return { data: cached.data, isStale: isExpired }
    }, [cache, cacheKey, ttl, staleWhileRevalidate])

    const cachedResult = getCachedResult()
    const shouldRevalidate = cachedResult?.isStale && staleWhileRevalidate

    // Get fresh data if not cached or stale
    const freshResult = useMemo(() => {
      if (cachedResult && !shouldRevalidate) {
        return cachedResult.data
      }

      if (shouldRevalidate) {
        setIsRevalidating(true)
      }

      const result = hook(...args)

      // Cache the result
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      })

      if (shouldRevalidate) {
        setIsRevalidating(false)
      }

      return result
    }, [hook, cachedResult, shouldRevalidate, cacheKey, cache, ...args])

    const invalidateCache = useCallback(() => {
      cache.delete(cacheKey)
    }, [cache, cacheKey])

    const clearCache = useCallback(() => {
      cache.clear()
    }, [cache])

    return {
      data: freshResult,
      isFromCache: !!cachedResult,
      isStale: cachedResult?.isStale || false,
      isRevalidating,
      invalidateCache,
      clearCache,
    }
  }
}

/**
 * Throttle Decorator
 * Adds throttling to hook execution
 */
export function withThrottle<T extends any[], R>(
  hook: HookFunction<T, R>,
  options: ThrottleDecoratorOptions = {}
) {
  const { delay = UI_TIMEOUTS.THROTTLE_DELAY, leading = true, trailing = true } = options

  return (...args: T) => {
    const [throttledArgs, setThrottledArgs] = useState<T | null>(null)
    const [lastCallTime, setLastCallTime] = useState<number>(0)
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

    const throttledExecution = useCallback(
      (...newArgs: T) => {
        const now = Date.now()

        if (timeoutId) {
          clearTimeout(timeoutId)
          setTimeoutId(null)
        }

        // Leading execution
        if (leading && now - lastCallTime >= delay) {
          setLastCallTime(now)
          setThrottledArgs(newArgs)
          return
        }

        // Trailing execution
        if (trailing) {
          const remainingDelay = delay - (now - lastCallTime)
          const newTimeoutId = setTimeout(
            () => {
              setLastCallTime(Date.now())
              setThrottledArgs(newArgs)
              setTimeoutId(null)
            },
            Math.max(remainingDelay, 0)
          )

          setTimeoutId(newTimeoutId)
        }
      },
      [delay, leading, trailing, lastCallTime, timeoutId]
    )

    // Execute hook with throttled args
    const result = useMemo(() => {
      if (throttledArgs === null) return hook(...args) // Initial execution
      return hook(...throttledArgs)
    }, [hook, throttledArgs, ...args])

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }
    }, [timeoutId])

    return {
      ...result,
      throttledCall: throttledExecution,
      isThrottled: timeoutId !== null,
    }
  }
}

/**
 * Validation Decorator
 * Adds input validation to hooks
 */
export function withValidation<T extends any[], R>(
  hook: HookFunction<T, R>,
  options: ValidationDecoratorOptions<T>
) {
  const { validator, onValidationError } = options

  return (...args: T) => {
    const [validationError, setValidationError] = useState<string | null>(null)
    const [isValid, setIsValid] = useState(true)

    // Validate inputs
    const validationResult = useMemo(() => {
      const result = validator(...args)
      if (result === true) {
        setValidationError(null)
        setIsValid(true)
        return true
      } else {
        const error = typeof result === 'string' ? result : 'Validation failed'
        setValidationError(error)
        setIsValid(false)

        if (onValidationError) {
          onValidationError(error)
        }

        return false
      }
    }, [validator, onValidationError, ...args])

    // Only execute hook if validation passes
    const result = useMemo(() => {
      if (validationResult) {
        return hook(...args)
      }
      return undefined
    }, [hook, validationResult, ...args])

    return {
      ...result,
      isValid,
      validationError,
      hasValidationError: !isValid,
    }
  }
}

/**
 * Performance Monitoring Decorator
 * Adds performance tracking to hooks
 */
export function withPerformanceMonitoring<T extends any[], R>(
  hook: HookFunction<T, R>,
  options: {
    name?: string
    warnThreshold?: number
    trackRenders?: boolean
  } = {}
) {
  const {
    name = hook.name || 'Anonymous Hook',
    warnThreshold = 100, // ms
    trackRenders = false,
  } = options

  return (...args: T) => {
    const [executionTime, setExecutionTime] = useState<number>(0)
    const [renderCount, setRenderCount] = useState(0)

    // Track render count
    useEffect(() => {
      if (trackRenders) {
        setRenderCount(prev => prev + 1)
      }
    })

    // Execute hook with performance tracking
    const result = useMemo(() => {
      const startTime = performance.now()
      const hookResult = hook(...args)
      const endTime = performance.now()
      const duration = endTime - startTime

      setExecutionTime(duration)

      if (duration > warnThreshold) {
        console.warn(`[Performance] Hook "${name}" took ${duration.toFixed(2)}ms to execute`, {
          args,
          duration,
        })
      }

      return hookResult
    }, [hook, name, warnThreshold, ...args])

    return {
      ...result,
      performance: {
        executionTime,
        renderCount: trackRenders ? renderCount : undefined,
        name,
      },
    }
  }
}

/**
 * Composite Decorator - Combines multiple decorators
 */
export function withCompositeDecorators<T extends any[], R>(
  hook: HookFunction<T, R>,
  decorators: Array<(hook: HookFunction<T, any>) => HookFunction<T, any>>
) {
  return decorators.reduce((decoratedHook, decorator) => {
    return decorator(decoratedHook)
  }, hook) as HookFunction<T, R>
}

/**
 * Higher-Order Hook Factory
 * Creates reusable decorated hooks
 */
export function createDecoratedHook<T extends any[], R>(
  hookFactory: () => HookFunction<T, R>,
  decorators: Array<(hook: HookFunction<T, any>) => HookFunction<T, any>>
) {
  const baseHook = hookFactory()
  return withCompositeDecorators(baseHook, decorators)
}

/**
 * Common decorator combinations
 */
export const commonDecorators = {
  // For API hooks
  api: <T extends any[], R>(hook: AsyncHookFunction<T, R>) =>
    withCompositeDecorators(hook as any, [
      h => withLoading(h, { loadingDelay: 200 }),
      h => withErrorHandling(h, { showErrorNotification: true }),
      h => withRetry(h as any, { maxRetries: 2, retryDelay: 1000 }),
      h => withCache(h, { ttl: 30000 }), // 30s cache
    ]),

  // For form validation hooks
  validation: <T extends any[], R>(
    hook: HookFunction<T, R>,
    validator: (...args: T) => boolean | string
  ) =>
    withCompositeDecorators(hook, [
      h => withValidation(h, { validator }),
      h => withErrorHandling(h, { showErrorNotification: false }),
    ]),

  // For expensive computation hooks
  expensive: <T extends any[], R>(hook: HookFunction<T, R>) =>
    withCompositeDecorators(hook, [
      h => withCache(h, { ttl: 60000 }), // 1 minute cache
      h => withThrottle(h, { delay: 300 }),
      h => withPerformanceMonitoring(h, { warnThreshold: 50 }),
    ]),
}

export default {
  withLoading,
  withErrorHandling,
  withRetry,
  withCache,
  withThrottle,
  withValidation,
  withPerformanceMonitoring,
  withCompositeDecorators,
  createDecoratedHook,
  commonDecorators,
}
