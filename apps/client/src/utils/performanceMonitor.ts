/**
 * パフォーマンス監視ユーティリティ
 * Web Vitals の測定とパフォーマンス最適化のためのツール
 */

// Core Web Vitals の型定義
interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB'
  value: number
  delta: number
  id: string
  navigationType: string
}

interface PerformanceMetrics {
  // Core Web Vitals
  cls: number | null // Cumulative Layout Shift
  fid: number | null // First Input Delay
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  ttfb: number | null // Time to First Byte

  // Custom metrics
  chartRenderTime: number[]
  memoryUsage: number[]
  frameRate: number
  bundleLoadTime: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null,
    chartRenderTime: [],
    memoryUsage: [],
    frameRate: 0,
    bundleLoadTime: 0,
  }

  private observers: PerformanceObserver[] = []
  private isMonitoring = false

  constructor() {
    this.initializeWebVitals()
    this.startMemoryMonitoring()
    this.measureBundleLoadTime()
  }

  /**
   * Web Vitals の測定を開始
   */
  private initializeWebVitals() {
    // Cumulative Layout Shift (CLS)
    this.observeLayoutShift()

    // First Input Delay (FID)
    this.observeFirstInputDelay()

    // Largest Contentful Paint (LCP)
    this.observeLargestContentfulPaint()

    // First Contentful Paint (FCP)
    this.observeFirstContentfulPaint()

    // Time to First Byte (TTFB)
    this.observeTimeToFirstByte()
  }

  /**
   * Layout Shift の監視
   */
  private observeLayoutShift() {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver(list => {
      let clsValue = 0

      for (const entry of list.getEntries()) {
        if ((entry as any).hadRecentInput) continue
        clsValue += (entry as any).value
      }

      this.metrics.cls = clsValue
      this.reportMetric('CLS', clsValue)
    })

    try {
      observer.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(observer)
    } catch (e) {
      console.warn('Layout Shift monitoring not supported')
    }
  }

  /**
   * First Input Delay の監視
   */
  private observeFirstInputDelay() {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const fid = entry.processingStart - entry.startTime
        this.metrics.fid = fid
        this.reportMetric('FID', fid)
      }
    })

    try {
      observer.observe({ entryTypes: ['first-input'] })
      this.observers.push(observer)
    } catch (e) {
      console.warn('First Input Delay monitoring not supported')
    }
  }

  /**
   * Largest Contentful Paint の監視
   */
  private observeLargestContentfulPaint() {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver(list => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]

      if (lastEntry) {
        this.metrics.lcp = lastEntry.startTime
        this.reportMetric('LCP', lastEntry.startTime)
      }
    })

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(observer)
    } catch (e) {
      console.warn('Largest Contentful Paint monitoring not supported')
    }
  }

  /**
   * First Contentful Paint の監視
   */
  private observeFirstContentfulPaint() {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime
          this.reportMetric('FCP', entry.startTime)
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['paint'] })
      this.observers.push(observer)
    } catch (e) {
      console.warn('First Contentful Paint monitoring not supported')
    }
  }

  /**
   * Time to First Byte の監視
   */
  private observeTimeToFirstByte() {
    if (!('PerformanceObserver' in window)) return

    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming
          const ttfb = navEntry.responseStart - navEntry.requestStart
          this.metrics.ttfb = ttfb
          this.reportMetric('TTFB', ttfb)
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['navigation'] })
      this.observers.push(observer)
    } catch (e) {
      console.warn('Time to First Byte monitoring not supported')
    }
  }

  /**
   * メモリ使用量の監視
   */
  private startMemoryMonitoring() {
    if (!('memory' in performance)) return

    const checkMemory = () => {
      const memory = (performance as any).memory
      if (memory) {
        const memoryUsage = memory.usedJSHeapSize / (1024 * 1024) // MB
        this.metrics.memoryUsage.push(memoryUsage)

        // 最新の 50 件のみ保持
        if (this.metrics.memoryUsage.length > 50) {
          this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-50)
        }

        // メモリ使用量が多い場合は警告
        if (memoryUsage > 100) {
          console.warn(`⚠️ High memory usage detected: ${memoryUsage.toFixed(2)} MB`)
        }
      }
    }

    // 5 秒間隔でメモリチェック
    setInterval(checkMemory, 5000)
  }

  /**
   * バンドルロード時間の測定
   */
  private measureBundleLoadTime() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming
      if (navigation) {
        this.metrics.bundleLoadTime = navigation.loadEventEnd - navigation.navigationStart
        console.log(`📦 Bundle load time: ${this.metrics.bundleLoadTime.toFixed(2)}ms`)
      }
    })
  }

  /**
   * チャートレンダリング時間の測定
   */
  public measureChartRender<T>(chartId: string, renderFunction: () => T): T {
    const startTime = performance.now()

    const result = renderFunction()

    const endTime = performance.now()
    const renderTime = endTime - startTime

    this.metrics.chartRenderTime.push(renderTime)

    // 最新の 20 件のみ保持
    if (this.metrics.chartRenderTime.length > 20) {
      this.metrics.chartRenderTime = this.metrics.chartRenderTime.slice(-20)
    }

    // 遅いレンダリングの警告
    if (renderTime > 16) {
      // 60fps = 16ms/frame
      console.warn(`🐌 Slow chart render: ${chartId} took ${renderTime.toFixed(2)}ms`)
    }

    return result
  }

  /**
   * フレームレートの測定
   */
  public startFrameRateMonitoring() {
    let frames = 0
    let lastTime = performance.now()

    const countFrame = () => {
      frames++
      const currentTime = performance.now()

      if (currentTime >= lastTime + 1000) {
        this.metrics.frameRate = Math.round((frames * 1000) / (currentTime - lastTime))
        frames = 0
        lastTime = currentTime

        // 低いフレームレートの警告
        if (this.metrics.frameRate < 30) {
          console.warn(`⚠️ Low frame rate detected: ${this.metrics.frameRate} fps`)
        }
      }

      requestAnimationFrame(countFrame)
    }

    requestAnimationFrame(countFrame)
  }

  /**
   * メトリクスの報告
   */
  private reportMetric(name: string, value: number) {
    // 開発環境でのログ
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${name}: ${value.toFixed(2)}`)
    }

    // 本番環境では分析サービスに送信
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(name, value)
    }
  }

  /**
   * 分析サービスへの送信（本番環境用）
   */
  private sendToAnalytics(metricName: string, value: number) {
    // Google Analytics 4 やその他の分析サービスに送信
    if (typeof gtag !== 'undefined') {
      gtag('event', 'web_vitals', {
        metric_name: metricName,
        metric_value: Math.round(value),
        metric_delta: Math.round(value),
      })
    }
  }

  /**
   * 現在のメトリクスを取得
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * パフォーマンスレポートの生成
   */
  public generateReport(): string {
    const metrics = this.getMetrics()
    const avgChartRender =
      metrics.chartRenderTime.length > 0
        ? metrics.chartRenderTime.reduce((a, b) => a + b, 0) / metrics.chartRenderTime.length
        : 0

    const avgMemoryUsage =
      metrics.memoryUsage.length > 0
        ? metrics.memoryUsage.reduce((a, b) => a + b, 0) / metrics.memoryUsage.length
        : 0

    return `
📊 Performance Report
===================
Core Web Vitals:
- LCP: ${metrics.lcp?.toFixed(2) || 'N/A'} ms
- FID: ${metrics.fid?.toFixed(2) || 'N/A'} ms
- CLS: ${metrics.cls?.toFixed(4) || 'N/A'}
- FCP: ${metrics.fcp?.toFixed(2) || 'N/A'} ms
- TTFB: ${metrics.ttfb?.toFixed(2) || 'N/A'} ms

Custom Metrics:
- Avg Chart Render: ${avgChartRender.toFixed(2)} ms
- Avg Memory Usage: ${avgMemoryUsage.toFixed(2)} MB
- Current Frame Rate: ${metrics.frameRate} fps
- Bundle Load Time: ${metrics.bundleLoadTime.toFixed(2)} ms

Recommendations:
${this.generateRecommendations()}
    `.trim()
  }

  /**
   * パフォーマンス改善の推奨事項を生成
   */
  private generateRecommendations(): string {
    const recommendations: string[] = []
    const metrics = this.getMetrics()

    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('- LCP improvement: Optimize image loading and critical resources')
    }

    if (metrics.fid && metrics.fid > 100) {
      recommendations.push('- FID improvement: Reduce JavaScript execution time')
    }

    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push('- CLS improvement: Set explicit dimensions for images and ads')
    }

    const avgChartRender =
      metrics.chartRenderTime.length > 0
        ? metrics.chartRenderTime.reduce((a, b) => a + b, 0) / metrics.chartRenderTime.length
        : 0

    if (avgChartRender > 30) {
      recommendations.push('- Chart optimization: Enable performance mode for large datasets')
    }

    const avgMemoryUsage =
      metrics.memoryUsage.length > 0
        ? metrics.memoryUsage.reduce((a, b) => a + b, 0) / metrics.memoryUsage.length
        : 0

    if (avgMemoryUsage > 50) {
      recommendations.push(
        '- Memory optimization: Check for memory leaks and dispose unused objects'
      )
    }

    if (metrics.frameRate < 45) {
      recommendations.push(
        '- Frame rate improvement: Reduce DOM manipulations and enable GPU acceleration'
      )
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- All metrics look good! 🎉'
  }

  /**
   * 監視の停止
   */
  public dispose() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.isMonitoring = false
  }
}

// シングルトンインスタンス
const performanceMonitor = new PerformanceMonitor()

export default performanceMonitor
export type { PerformanceMetrics, WebVitalsMetric }
