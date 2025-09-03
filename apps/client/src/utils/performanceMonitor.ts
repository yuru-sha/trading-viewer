import { log } from '../services/logger'

export interface PerformanceMetrics {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, unknown>
}

class PerformanceMonitor {
  private timers: Map<string, number> = new Map()
  private metrics: PerformanceMetrics[] = []
  private readonly MAX_METRICS = 1000 // Prevent memory leaks

  // Chart rendering performance tracking
  trackChartRender = (renderInfo: {
    chartType: string
    dataPoints: number
    indicators: number
    duration: number
  }): void => {
    const metric: PerformanceMetrics = {
      name: 'chart_render',
      duration: renderInfo.duration,
      timestamp: Date.now(),
      metadata: {
        chartType: renderInfo.chartType,
        dataPoints: renderInfo.dataPoints,
        indicators: renderInfo.indicators,
      },
    }

    this.addMetric(metric)
    log.performance.info('Chart rendered', {
      duration: renderInfo.duration,
      chartType: renderInfo.chartType,
      dataPoints: renderInfo.dataPoints,
      indicators: renderInfo.indicators,
    })

    // Warn if rendering is slow
    if (renderInfo.duration > 500) {
      log.performance.warn('Slow chart rendering detected', {
        duration: renderInfo.duration,
        threshold: 500,
      })
    }
  }

  // API response time tracking
  trackAPIResponse = (endpoint: string, duration: number, status?: number): void => {
    const metric: PerformanceMetrics = {
      name: 'api_response',
      duration,
      timestamp: Date.now(),
      metadata: {
        endpoint,
        status,
      },
    }

    this.addMetric(metric)
    log.api.info('API call completed', {
      endpoint,
      duration,
      status,
    })

    // Warn if API is slow
    if (duration > 2000) {
      log.api.warn('Slow API response detected', {
        endpoint,
        duration,
        threshold: 2000,
      })
    }
  }

  // Component mount/unmount tracking
  trackComponentLifecycle = (componentName: string, event: 'mount' | 'unmount'): void => {
    const now = Date.now()

    if (event === 'mount') {
      this.timers.set(`component_${componentName}`, now)
      log.performance.debug('Component mounted', { componentName })
    } else if (event === 'unmount') {
      const mountTime = this.timers.get(`component_${componentName}`)
      if (mountTime) {
        const lifetime = now - mountTime
        this.timers.delete(`component_${componentName}`)

        const metric: PerformanceMetrics = {
          name: 'component_lifetime',
          duration: lifetime,
          timestamp: now,
          metadata: {
            componentName,
          },
        }

        this.addMetric(metric)
        log.performance.debug('Component unmounted', { componentName, lifetime })
      }
    }
  }

  // WebSocket connection performance
  trackWebSocketEvent = (event: 'connect' | 'disconnect' | 'message', duration?: number): void => {
    const metric: PerformanceMetrics = {
      name: `websocket_${event}`,
      duration: duration || 0,
      timestamp: Date.now(),
      metadata: {
        event,
      },
    }

    this.addMetric(metric)
    log.websocket.info(`WebSocket ${event}`, { duration })
  }

  // Page navigation tracking
  trackPageNavigation = (from: string, to: string, duration: number): void => {
    const metric: PerformanceMetrics = {
      name: 'page_navigation',
      duration,
      timestamp: Date.now(),
      metadata: {
        from,
        to,
      },
    }

    this.addMetric(metric)
    log.performance.info('Page navigation', { from, to, duration })

    // Warn if navigation is slow
    if (duration > 1000) {
      log.performance.warn('Slow page navigation detected', {
        from,
        to,
        duration,
        threshold: 1000,
      })
    }
  }

  // Generic timer utilities
  startTimer = (name: string): void => {
    this.timers.set(name, Date.now())
  }

  stopTimer = (name: string, metadata?: Record<string, unknown>): number => {
    const startTime = this.timers.get(name)
    if (!startTime) {
      log.performance.warn('Timer not found', { timerName: name })
      return 0
    }

    const duration = Date.now() - startTime
    this.timers.delete(name)

    const metric: PerformanceMetrics = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    }

    this.addMetric(metric)
    return duration
  }

  // Memory usage tracking
  trackMemoryUsage = (): void => {
    if ('memory' in performance) {
      const memInfo = (
        performance as {
          memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }
        }
      ).memory
      const metric: PerformanceMetrics = {
        name: 'memory_usage',
        duration: 0,
        timestamp: Date.now(),
        metadata: {
          usedJSHeapSize: memInfo.usedJSHeapSize,
          totalJSHeapSize: memInfo.totalJSHeapSize,
          jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
        },
      }

      this.addMetric(metric)

      // Warn if memory usage is high
      const memoryUsagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
      if (memoryUsagePercent > 80) {
        log.performance.warn('High memory usage detected', {
          usagePercent: memoryUsagePercent.toFixed(2),
          usedMB: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
          limitMB: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024),
        })
      }
    }
  }

  // Core Web Vitals tracking
  trackWebVitals = (): void => {
    // Track First Contentful Paint
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(entryList => {
        const entries = entryList.getEntries()
        entries.forEach(entry => {
          const metric: PerformanceMetrics = {
            name: entry.name.replace(/-/g, '_'),
            duration: entry.startTime,
            timestamp: Date.now(),
            metadata: {
              entryType: entry.entryType,
              value: entry.startTime,
            },
          }
          this.addMetric(metric)
          log.performance.info('Web Vital', {
            name: entry.name,
            value: entry.startTime,
          })
        })
      })

      try {
        observer.observe({ type: 'paint', buffered: true })
        observer.observe({ type: 'navigation', buffered: true })
      } catch (error) {
        log.performance.warn('Performance observer setup failed', error)
      }
    }
  }

  // Get performance summary
  getPerformanceSummary = (): Record<string, unknown> => {
    const summary: Record<string, unknown> = {}
    const now = Date.now()
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000) // Last minute

    // Group by metric name
    const groupedMetrics = recentMetrics.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = []
        }
        acc[metric.name].push(metric.duration)
        return acc
      },
      {} as Record<string, number[]>
    )

    // Calculate statistics
    Object.entries(groupedMetrics).forEach(([name, durations]) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const max = Math.max(...durations)
      const min = Math.min(...durations)

      summary[name] = {
        count: durations.length,
        average: Math.round(avg),
        max,
        min,
      }
    })

    return summary
  }

  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric)

    // Prevent memory leaks by limiting stored metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-Math.floor(this.MAX_METRICS * 0.8)) // Keep 80% of limit
    }
  }

  // Clear all metrics (useful for testing)
  clear(): void {
    this.metrics = []
    this.timers.clear()
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Convenience functions for common use cases
export const trackChartRender = performanceMonitor.trackChartRender
export const trackAPIResponse = performanceMonitor.trackAPIResponse
export const trackComponentLifecycle = performanceMonitor.trackComponentLifecycle
export const trackWebSocketEvent = performanceMonitor.trackWebSocketEvent
export const trackPageNavigation = performanceMonitor.trackPageNavigation
export const startTimer = performanceMonitor.startTimer
export const stopTimer = performanceMonitor.stopTimer
export const trackMemoryUsage = performanceMonitor.trackMemoryUsage
export const trackWebVitals = performanceMonitor.trackWebVitals
export const getPerformanceSummary = performanceMonitor.getPerformanceSummary

// Auto-initialize Web Vitals tracking
if (typeof window !== 'undefined') {
  // Track memory usage every 30 seconds
  setInterval(() => {
    trackMemoryUsage()
  }, 30000)

  // Initialize web vitals tracking
  trackWebVitals()
}
