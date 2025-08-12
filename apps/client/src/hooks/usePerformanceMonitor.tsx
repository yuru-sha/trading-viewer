import { useState, useEffect, useCallback, useRef } from 'react'

interface PerformanceMetrics {
  // Navigation Timing API metrics
  navigationStart: number
  domContentLoaded: number
  loadComplete: number
  firstPaint?: number
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  firstInputDelay?: number
  cumulativeLayoutShift?: number

  // Custom metrics
  renderTime: number
  componentMounts: number
  componentUnmounts: number
  apiCalls: number
  apiErrors: number
  memoryUsage?: MemoryInfo

  // Resource metrics
  resourceCount: number
  resourceSize: number
  cacheHitRate: number
}

interface ResourceMetrics {
  name: string
  type: string
  size: number
  duration: number
  cached: boolean
}

interface ComponentPerformance {
  name: string
  renderCount: number
  averageRenderTime: number
  lastRenderTime: number
  props?: any
}

interface PerformanceAlert {
  type: 'warning' | 'error'
  metric: string
  value: number
  threshold: number
  message: string
  timestamp: number
}

interface PerformanceMonitorConfig {
  enableCoreWebVitals: boolean
  enableResourceMonitoring: boolean
  enableComponentMonitoring: boolean
  alertThresholds: {
    lcp: number // Largest Contentful Paint
    fid: number // First Input Delay
    cls: number // Cumulative Layout Shift
    renderTime: number
    apiErrorRate: number
  }
  sampleRate: number // 0-1, percentage of sessions to monitor
}

const defaultConfig: PerformanceMonitorConfig = {
  enableCoreWebVitals: true,
  enableResourceMonitoring: true,
  enableComponentMonitoring: true,
  alertThresholds: {
    lcp: 2500, // 2.5s
    fid: 100, // 100ms
    cls: 0.1, // 0.1
    renderTime: 16, // 16ms (60fps)
    apiErrorRate: 5, // 5%
  },
  sampleRate: 1.0,
}

export const usePerformanceMonitor = (config: Partial<PerformanceMonitorConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config }
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    navigationStart: performance.timeOrigin,
    domContentLoaded: 0,
    loadComplete: 0,
    renderTime: 0,
    componentMounts: 0,
    componentUnmounts: 0,
    apiCalls: 0,
    apiErrors: 0,
    resourceCount: 0,
    resourceSize: 0,
    cacheHitRate: 0,
  })

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [resources, setResources] = useState<ResourceMetrics[]>([])
  const [components, setComponents] = useState<Map<string, ComponentPerformance>>(new Map())

  const observersRef = useRef<{
    perfObserver?: PerformanceObserver
    lcpObserver?: PerformanceObserver
    fidObserver?: PerformanceObserver
    clsObserver?: PerformanceObserver
    resourceObserver?: PerformanceObserver
  }>({})

  const metricsRef = useRef<PerformanceMetrics>(metrics)
  metricsRef.current = metrics

  // Core Web Vitals monitoring
  const initializeCoreWebVitals = useCallback(() => {
    if (!finalConfig.enableCoreWebVitals || typeof window === 'undefined') return

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        observersRef.current.lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]

          if (lastEntry) {
            const lcp = lastEntry.startTime
            setMetrics(prev => ({ ...prev, largestContentfulPaint: lcp }))

            if (lcp > finalConfig.alertThresholds.lcp) {
              addAlert(
                'error',
                'largestContentfulPaint',
                lcp,
                finalConfig.alertThresholds.lcp,
                'Largest Contentful Paint is too slow'
              )
            }
          }
        })

        observersRef.current.lcpObserver.observe({
          type: 'largest-contentful-paint',
          buffered: true,
        })
      } catch (error) {
        console.warn('LCP observer initialization failed:', error)
      }

      // First Input Delay (FID)
      try {
        observersRef.current.fidObserver = new PerformanceObserver(list => {
          const entries = list.getEntries()
          entries.forEach(entry => {
            const fid = (entry as any).processingStart - entry.startTime
            setMetrics(prev => ({ ...prev, firstInputDelay: fid }))

            if (fid > finalConfig.alertThresholds.fid) {
              addAlert(
                'warning',
                'firstInputDelay',
                fid,
                finalConfig.alertThresholds.fid,
                'First Input Delay is too high'
              )
            }
          })
        })

        observersRef.current.fidObserver.observe({ type: 'first-input', buffered: true })
      } catch (error) {
        console.warn('FID observer initialization failed:', error)
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0

        observersRef.current.clsObserver = new PerformanceObserver(list => {
          const entries = list.getEntries()
          entries.forEach(entry => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          })

          setMetrics(prev => ({ ...prev, cumulativeLayoutShift: clsValue }))

          if (clsValue > finalConfig.alertThresholds.cls) {
            addAlert(
              'warning',
              'cumulativeLayoutShift',
              clsValue,
              finalConfig.alertThresholds.cls,
              'Cumulative Layout Shift is too high'
            )
          }
        })

        observersRef.current.clsObserver.observe({ type: 'layout-shift', buffered: true })
      } catch (error) {
        console.warn('CLS observer initialization failed:', error)
      }
    }

    // Navigation Timing metrics
    if (performance.timing) {
      const timing = performance.timing
      setMetrics(prev => ({
        ...prev,
        navigationStart: timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
      }))
    }

    // Paint metrics
    if (performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint')
      const fpEntry = paintEntries.find(entry => entry.name === 'first-paint')
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')

      if (fpEntry || fcpEntry) {
        setMetrics(prev => ({
          ...prev,
          firstPaint: fpEntry?.startTime,
          firstContentfulPaint: fcpEntry?.startTime,
        }))
      }
    }
  }, [finalConfig])

  // Resource monitoring
  const initializeResourceMonitoring = useCallback(() => {
    if (!finalConfig.enableResourceMonitoring || typeof window === 'undefined') return

    try {
      observersRef.current.resourceObserver = new PerformanceObserver(list => {
        const entries = list.getEntries()
        const resourceMetrics: ResourceMetrics[] = []
        let totalSize = 0
        let cachedCount = 0

        entries.forEach(entry => {
          const resource = entry as PerformanceResourceTiming
          const size = resource.transferSize || 0
          const cached = resource.transferSize === 0 && resource.decodedBodySize > 0

          totalSize += size
          if (cached) cachedCount++

          resourceMetrics.push({
            name: resource.name,
            type: getResourceType(resource.name),
            size,
            duration: resource.duration,
            cached,
          })
        })

        setResources(prev => [...prev, ...resourceMetrics].slice(-100)) // Keep last 100

        setMetrics(prev => ({
          ...prev,
          resourceCount: prev.resourceCount + entries.length,
          resourceSize: prev.resourceSize + totalSize,
          cacheHitRate:
            entries.length > 0 ? (cachedCount / entries.length) * 100 : prev.cacheHitRate,
        }))
      })

      observersRef.current.resourceObserver.observe({ type: 'resource', buffered: true })
    } catch (error) {
      console.warn('Resource observer initialization failed:', error)
    }
  }, [finalConfig])

  // Memory monitoring
  const monitorMemory = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory as MemoryInfo
      setMetrics(prev => ({ ...prev, memoryUsage: memInfo }))

      // Alert if memory usage is high (>80% of limit)
      if (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit > 0.8) {
        addAlert(
          'warning',
          'memoryUsage',
          memInfo.usedJSHeapSize / 1024 / 1024,
          (memInfo.jsHeapSizeLimit / 1024 / 1024) * 0.8,
          'High memory usage detected'
        )
      }
    }
  }, [])

  // Component performance tracking
  const trackComponentRender = useCallback(
    (componentName: string, renderTime: number, props?: any) => {
      if (!finalConfig.enableComponentMonitoring) return

      setComponents(prev => {
        const existing = prev.get(componentName) || {
          name: componentName,
          renderCount: 0,
          averageRenderTime: 0,
          lastRenderTime: 0,
          props,
        }

        const newRenderCount = existing.renderCount + 1
        const newAverageRenderTime =
          (existing.averageRenderTime * existing.renderCount + renderTime) / newRenderCount

        const updated = new Map(prev)
        updated.set(componentName, {
          ...existing,
          renderCount: newRenderCount,
          averageRenderTime: newAverageRenderTime,
          lastRenderTime: renderTime,
          props,
        })

        return updated
      })

      setMetrics(prev => ({ ...prev, renderTime: prev.renderTime + renderTime }))

      if (renderTime > finalConfig.alertThresholds.renderTime) {
        addAlert(
          'warning',
          'renderTime',
          renderTime,
          finalConfig.alertThresholds.renderTime,
          `Slow render detected in ${componentName}`
        )
      }
    },
    [finalConfig]
  )

  // API call tracking
  const trackApiCall = useCallback(
    (success: boolean, duration?: number) => {
      setMetrics(prev => ({
        ...prev,
        apiCalls: prev.apiCalls + 1,
        apiErrors: prev.apiErrors + (success ? 0 : 1),
      }))

      const errorRate =
        ((metricsRef.current.apiErrors + (success ? 0 : 1)) / (metricsRef.current.apiCalls + 1)) *
        100

      if (errorRate > finalConfig.alertThresholds.apiErrorRate) {
        addAlert(
          'error',
          'apiErrorRate',
          errorRate,
          finalConfig.alertThresholds.apiErrorRate,
          'High API error rate detected'
        )
      }
    },
    [finalConfig]
  )

  // Alert management
  const addAlert = useCallback(
    (
      type: 'warning' | 'error',
      metric: string,
      value: number,
      threshold: number,
      message: string
    ) => {
      const alert: PerformanceAlert = {
        type,
        metric,
        value,
        threshold,
        message,
        timestamp: Date.now(),
      }

      setAlerts(prev => [...prev, alert].slice(-10)) // Keep last 10 alerts

      if (type === 'error') {
        console.error('Performance Alert:', alert)
      } else {
        console.warn('Performance Alert:', alert)
      }
    },
    []
  )

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  // Component lifecycle tracking
  const trackComponentMount = useCallback((componentName?: string) => {
    setMetrics(prev => ({ ...prev, componentMounts: prev.componentMounts + 1 }))
  }, [])

  const trackComponentUnmount = useCallback((componentName?: string) => {
    setMetrics(prev => ({ ...prev, componentUnmounts: prev.componentUnmounts + 1 }))
  }, [])

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const errorRate = metrics.apiCalls > 0 ? (metrics.apiErrors / metrics.apiCalls) * 100 : 0
    const avgComponentRenderTime =
      components.size > 0
        ? Array.from(components.values()).reduce((sum, comp) => sum + comp.averageRenderTime, 0) /
          components.size
        : 0

    return {
      coreWebVitals: {
        lcp: metrics.largestContentfulPaint,
        fid: metrics.firstInputDelay,
        cls: metrics.cumulativeLayoutShift,
        fcp: metrics.firstContentfulPaint,
      },
      performance: {
        loadTime: metrics.loadComplete,
        renderTime: avgComponentRenderTime,
        apiErrorRate: errorRate,
        cacheHitRate: metrics.cacheHitRate,
      },
      resources: {
        count: metrics.resourceCount,
        totalSize: metrics.resourceSize,
        averageSize: metrics.resourceCount > 0 ? metrics.resourceSize / metrics.resourceCount : 0,
      },
      components: {
        total: components.size,
        mounts: metrics.componentMounts,
        unmounts: metrics.componentUnmounts,
      },
    }
  }, [metrics, components])

  // Initialize monitoring
  useEffect(() => {
    if (Math.random() > finalConfig.sampleRate) {
      return // Skip monitoring based on sample rate
    }

    initializeCoreWebVitals()
    initializeResourceMonitoring()

    // Memory monitoring interval
    const memoryInterval = setInterval(monitorMemory, 5000)

    return () => {
      // Cleanup observers
      Object.values(observersRef.current).forEach(observer => {
        observer?.disconnect()
      })

      clearInterval(memoryInterval)
    }
  }, [initializeCoreWebVitals, initializeResourceMonitoring, monitorMemory, finalConfig.sampleRate])

  // Utility function to get resource type from URL
  const getResourceType = (url: string): string => {
    if (url.includes('.js')) return 'script'
    if (url.includes('.css')) return 'stylesheet'
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image'
    if (url.includes('font')) return 'font'
    if (url.includes('api/') || url.includes('.json')) return 'xhr'
    return 'other'
  }

  return {
    metrics,
    alerts,
    resources,
    components: Array.from(components.values()),
    trackComponentRender,
    trackApiCall,
    trackComponentMount,
    trackComponentUnmount,
    clearAlerts,
    getPerformanceSummary,
  }
}
