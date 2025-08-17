import { useEffect, useCallback, useRef } from 'react'

interface PerformanceMetrics {
  // Core Web Vitals
  largestContentfulPaint?: number
  firstInputDelay?: number
  cumulativeLayoutShift?: number
  firstContentfulPaint?: number

  // Custom metrics
  navigationStart: number
  domContentLoaded: number
  loadComplete: number
  memoryUsage?: MemoryInfo
  resourceCount: number
  bundleSize?: number
}

interface PerformanceHookOptions {
  enabled?: boolean
  sampleRate?: number
  reportInterval?: number
  onMetricsCollected?: (metrics: PerformanceMetrics) => void
}

/**
 * パフォーマンス監視フック
 *
 * Core Web Vitals とカスタムメトリクスを収集し、
 * パフォーマンス問題の早期発見を支援
 */
export const usePerformanceMonitoring = (options: PerformanceHookOptions = {}) => {
  const {
    enabled = true,
    sampleRate = 0.1, // 10% sampling
    reportInterval = 30000, // 30 seconds
    onMetricsCollected,
  } = options

  const metricsRef = useRef<PerformanceMetrics>({
    navigationStart: 0,
    domContentLoaded: 0,
    loadComplete: 0,
    resourceCount: 0,
  })
  const reportTimeoutRef = useRef<NodeJS.Timeout>()

  // Core Web Vitals 収集
  const collectCoreWebVitals = useCallback(() => {
    if (!('PerformanceObserver' in window)) return

    try {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver(list => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        metricsRef.current.largestContentfulPaint = lastEntry.startTime
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay (FID)
      new PerformanceObserver(list => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          metricsRef.current.firstInputDelay = entry.processingStart - entry.startTime
        })
      }).observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift (CLS)
      new PerformanceObserver(list => {
        let clsValue = 0
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        metricsRef.current.cumulativeLayoutShift = clsValue
      }).observe({ entryTypes: ['layout-shift'] })

      // First Contentful Paint (FCP)
      new PerformanceObserver(list => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            metricsRef.current.firstContentfulPaint = entry.startTime
          }
        })
      }).observe({ entryTypes: ['paint'] })
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error)
    }
  }, [])

  // Navigation Timing 収集
  const collectNavigationTiming = useCallback(() => {
    if (!('performance' in window)) return

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      metricsRef.current.navigationStart = navigation.navigationStart
      metricsRef.current.domContentLoaded =
        navigation.domContentLoadedEventEnd - navigation.navigationStart
      metricsRef.current.loadComplete = navigation.loadEventEnd - navigation.navigationStart
    }
  }, [])

  // Resource 情報収集
  const collectResourceMetrics = useCallback(() => {
    if (!('performance' in window)) return

    const resources = performance.getEntriesByType('resource')
    metricsRef.current.resourceCount = resources.length

    // バンドルサイズ推定（JS ファイルの合計サイズ）
    const jsResources = resources.filter(
      (resource: any) => resource.name.includes('.js') || resource.name.includes('chunk')
    )
    const totalJSSize = jsResources.reduce(
      (total: number, resource: any) => total + (resource.transferSize || 0),
      0
    )
    metricsRef.current.bundleSize = totalJSSize
  }, [])

  // メモリ使用量収集
  const collectMemoryMetrics = useCallback(() => {
    if ('memory' in performance) {
      metricsRef.current.memoryUsage = (performance as any).memory
    }
  }, [])

  // メトリクス報告
  const reportMetrics = useCallback(() => {
    if (Math.random() > sampleRate) return // Sampling

    const metrics = { ...metricsRef.current }

    // Core Web Vitals 評価
    const evaluation = {
      lcp: metrics.largestContentfulPaint
        ? metrics.largestContentfulPaint <= 2500
          ? 'good'
          : metrics.largestContentfulPaint <= 4000
            ? 'needs-improvement'
            : 'poor'
        : 'unknown',
      fid: metrics.firstInputDelay
        ? metrics.firstInputDelay <= 100
          ? 'good'
          : metrics.firstInputDelay <= 300
            ? 'needs-improvement'
            : 'poor'
        : 'unknown',
      cls:
        metrics.cumulativeLayoutShift !== undefined
          ? metrics.cumulativeLayoutShift <= 0.1
            ? 'good'
            : metrics.cumulativeLayoutShift <= 0.25
              ? 'needs-improvement'
              : 'poor'
          : 'unknown',
    }

    // パフォーマンスログ出力
    console.group('🔍 Performance Metrics Report')
    console.log('📊 Core Web Vitals:', {
      LCP: `${metrics.largestContentfulPaint?.toFixed(2)}ms (${evaluation.lcp})`,
      FID: `${metrics.firstInputDelay?.toFixed(2)}ms (${evaluation.fid})`,
      CLS: `${metrics.cumulativeLayoutShift?.toFixed(3)} (${evaluation.cls})`,
      FCP: `${metrics.firstContentfulPaint?.toFixed(2)}ms`,
    })
    console.log('⏱️ Navigation Timing:', {
      'DOM Content Loaded': `${metrics.domContentLoaded}ms`,
      'Load Complete': `${metrics.loadComplete}ms`,
    })
    console.log('📦 Resource Metrics:', {
      'Resource Count': metrics.resourceCount,
      'Bundle Size': `${(metrics.bundleSize || 0 / 1024).toFixed(1)}KB`,
    })
    if (metrics.memoryUsage) {
      console.log('💾 Memory Usage:', {
        Used: `${(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
        Total: `${(metrics.memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
        Limit: `${(metrics.memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`,
      })
    }
    console.groupEnd()

    // カスタムコールバック実行
    onMetricsCollected?.(metrics)

    // 問題があれば警告
    if (evaluation.lcp === 'poor' || evaluation.fid === 'poor' || evaluation.cls === 'poor') {
      console.warn('⚠️ Performance issues detected! Consider optimizing:', {
        lcp:
          evaluation.lcp === 'poor'
            ? 'Reduce image sizes, improve server response times'
            : undefined,
        fid:
          evaluation.fid === 'poor'
            ? 'Reduce JavaScript execution time, use code splitting'
            : undefined,
        cls:
          evaluation.cls === 'poor'
            ? 'Add size attributes to images, avoid inserting content above existing content'
            : undefined,
      })
    }
  }, [sampleRate, onMetricsCollected])

  // 初期化
  useEffect(() => {
    if (!enabled) return

    // ページロード完了後にメトリクス収集開始
    const collectInitialMetrics = () => {
      collectNavigationTiming()
      collectResourceMetrics()
      collectMemoryMetrics()
      collectCoreWebVitals()

      // 定期的にレポート
      reportTimeoutRef.current = setInterval(reportMetrics, reportInterval)
    }

    if (document.readyState === 'complete') {
      collectInitialMetrics()
    } else {
      window.addEventListener('load', collectInitialMetrics)
    }

    return () => {
      if (reportTimeoutRef.current) {
        clearInterval(reportTimeoutRef.current)
      }
      window.removeEventListener('load', collectInitialMetrics)
    }
  }, [
    enabled,
    reportInterval,
    collectNavigationTiming,
    collectResourceMetrics,
    collectMemoryMetrics,
    collectCoreWebVitals,
    reportMetrics,
  ])

  // 手動メトリクス取得
  const getCurrentMetrics = useCallback(() => {
    collectNavigationTiming()
    collectResourceMetrics()
    collectMemoryMetrics()
    return { ...metricsRef.current }
  }, [collectNavigationTiming, collectResourceMetrics, collectMemoryMetrics])

  return {
    getCurrentMetrics,
    reportMetrics,
  }
}
