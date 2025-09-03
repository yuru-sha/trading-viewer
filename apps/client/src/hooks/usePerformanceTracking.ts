import { useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  trackComponentLifecycle,
  trackPageNavigation,
  startTimer,
  stopTimer,
} from '../utils/performanceMonitor'

/**
 * Hook for tracking component lifecycle performance
 */
export const useComponentTracking = (componentName: string) => {
  useEffect(() => {
    trackComponentLifecycle(componentName, 'mount')
    return () => trackComponentLifecycle(componentName, 'unmount')
  }, [componentName])
}

/**
 * Hook for tracking page navigation performance
 */
export const usePageNavigationTracking = () => {
  const location = useLocation()
  const currentPath = location.pathname

  useEffect(() => {
    const previousPath = sessionStorage.getItem('previousPath')
    const navigationStart = sessionStorage.getItem('navigationStart')

    if (previousPath && navigationStart) {
      const duration = Date.now() - parseInt(navigationStart)
      trackPageNavigation(previousPath, currentPath, duration)
    }

    // Store current path and timestamp for next navigation
    sessionStorage.setItem('previousPath', currentPath)
    sessionStorage.setItem('navigationStart', Date.now().toString())

    return () => {
      sessionStorage.setItem('previousPath', currentPath)
    }
  }, [currentPath])
}

/**
 * Hook for tracking chart rendering performance
 */
export const useChartPerformanceTracking = () => {
  const trackChartRender = useCallback(
    (options: { chartType: string; dataPoints: number; indicators: number }) => {
      const timerName = `chart_render_${Date.now()}`
      startTimer(timerName)

      return () => {
        const duration = stopTimer(timerName)
        // Import performance monitor here to avoid circular dependency
        import('../utils/performanceMonitor').then(({ trackChartRender }) => {
          trackChartRender({
            ...options,
            duration,
          })
        })
      }
    },
    []
  )

  return { trackChartRender }
}

/**
 * Hook for tracking API call performance
 */
export const useAPIPerformanceTracking = () => {
  const trackAPICall = useCallback((endpoint: string) => {
    const timerName = `api_call_${endpoint}_${Date.now()}`
    startTimer(timerName)

    return (status?: number) => {
      const duration = stopTimer(timerName)
      // Import performance monitor here to avoid circular dependency
      import('../utils/performanceMonitor').then(({ trackAPIResponse }) => {
        trackAPIResponse(endpoint, duration, status)
      })
    }
  }, [])

  return { trackAPICall }
}

/**
 * Hook for tracking custom performance metrics
 */
export const useCustomPerformanceTracking = () => {
  const trackCustomMetric = useCallback((metricName: string) => {
    const timerName = `custom_${metricName}_${Date.now()}`
    startTimer(timerName)

    return (metadata?: Record<string, unknown>) => {
      return stopTimer(timerName, metadata)
    }
  }, [])

  return { trackCustomMetric }
}
