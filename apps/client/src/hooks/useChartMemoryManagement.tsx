import { useEffect } from 'react'
import { useMemoryManager } from '../utils/memoryManager'
import { log } from '../services/logger'

/**
 * チャート関連のメモリ管理専用フック
 * ECharts インスタンス、イベントリスナー、インターバルのクリーンアップを統合管理
 */
export const useChartMemoryManagement = (chartId?: string) => {
  const { scope, cleanup, setTimeout, setInterval, addEventListener, onCleanup } = useMemoryManager(
    chartId ? `chart-${chartId}` : undefined
  )

  useEffect(() => {
    log.business.debug('Chart memory management initialized', {
      operation: 'chart_memory_init',
      chartId,
    })

    // コンポーネントアンマウント時のクリーンアップ
    return () => {
      log.business.debug('Chart memory management cleanup', {
        operation: 'chart_memory_cleanup',
        chartId,
      })
      cleanup()
    }
  }, [chartId, cleanup])

  /**
   * ECharts インスタンスの安全な破棄
   */
  const disposeChart = (chartInstance: any) => {
    onCleanup(() => {
      try {
        if (chartInstance && typeof chartInstance.dispose === 'function') {
          chartInstance.dispose()
          log.business.debug('ECharts instance disposed', {
            operation: 'echarts_dispose',
            chartId,
          })
        }
      } catch (error) {
        log.business.error('Error disposing ECharts instance', error as Error, {
          operation: 'echarts_dispose_error',
          chartId,
        })
      }
    })
  }

  /**
   * リサイズ監視の安全な設定
   */
  const setupResizeObserver = (element: Element, callback: () => void) => {
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(callback)
      observer.observe(element)

      onCleanup(() => {
        observer.disconnect()
        log.business.debug('ResizeObserver disconnected', {
          operation: 'resize_observer_cleanup',
          chartId,
        })
      })

      return observer
    } else {
      // フォールバック: window resize イベント
      const handleResize = () => callback()
      addEventListener(window, 'resize', handleResize)
      return null
    }
  }

  /**
   * チャートデータの定期更新
   */
  const setupDataRefresh = (refreshCallback: () => void, intervalMs: number = 30000) => {
    const intervalId = setInterval(() => {
      try {
        refreshCallback()
      } catch (error) {
        log.business.error('Error during chart data refresh', error as Error, {
          operation: 'chart_data_refresh_error',
          chartId,
        })
      }
    }, intervalMs)

    log.business.debug('Chart data refresh interval setup', {
      operation: 'chart_data_refresh_setup',
      chartId,
      intervalMs,
    })

    return intervalId
  }

  /**
   * Intersection Observer の設定（可視性監視）
   */
  const setupVisibilityObserver = (
    element: Element,
    onVisible: () => void,
    onHidden: () => void
  ) => {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              onVisible()
            } else {
              onHidden()
            }
          })
        },
        { threshold: 0.1 }
      )

      observer.observe(element)

      onCleanup(() => {
        observer.disconnect()
        log.business.debug('IntersectionObserver disconnected', {
          operation: 'intersection_observer_cleanup',
          chartId,
        })
      })

      return observer
    }
    return null
  }

  /**
   * パフォーマンス監視用のメトリクス収集
   */
  const trackPerformanceMetrics = () => {
    const performanceEntries: PerformanceEntry[] = []

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.name.includes('chart') || entry.name.includes('echarts')) {
          performanceEntries.push(entry)
          
          if (entry.duration > 100) { // 100ms を超える処理は警告
            log.performance.warn('Slow chart operation detected', {
              operation: 'chart_performance_warning',
              chartId,
              entryName: entry.name,
              duration: entry.duration,
            })
          }
        }
      })
    })

    observer.observe({ entryTypes: ['measure', 'navigation'] })

    onCleanup(() => {
      observer.disconnect()
      
      // パフォーマンス統計をログ出力
      if (performanceEntries.length > 0) {
        const avgDuration = performanceEntries.reduce((sum, entry) => sum + entry.duration, 0) / performanceEntries.length
        log.performance.info('Chart performance summary', {
          operation: 'chart_performance_summary',
          chartId,
          totalOperations: performanceEntries.length,
          averageDuration: avgDuration,
          maxDuration: Math.max(...performanceEntries.map(e => e.duration)),
        })
      }
    })

    return observer
  }

  return {
    // 基本的なメモリ管理
    scope,
    cleanup,
    setTimeout,
    setInterval,
    addEventListener,
    onCleanup,

    // チャート特化メソッド
    disposeChart,
    setupResizeObserver,
    setupDataRefresh,
    setupVisibilityObserver,
    trackPerformanceMetrics,
  }
}

/**
 * Drawing Tools 専用のメモリ管理フック
 */
export const useDrawingMemoryManagement = () => {
  const { scope, cleanup, onCleanup, addEventListener } = useMemoryManager('drawing-tools')

  useEffect(() => {
    log.business.debug('Drawing tools memory management initialized', {
      operation: 'drawing_memory_init',
    })

    return () => {
      log.business.debug('Drawing tools memory management cleanup', {
        operation: 'drawing_memory_cleanup',
      })
      cleanup()
    }
  }, [cleanup])

  /**
   * Canvas コンテキストのクリーンアップ
   */
  const cleanupCanvasContext = (canvas: HTMLCanvasElement) => {
    onCleanup(() => {
      try {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        // Canvas の参照をクリア
        canvas.width = 0
        canvas.height = 0
        log.business.debug('Canvas context cleaned up', {
          operation: 'canvas_cleanup',
        })
      } catch (error) {
        log.business.error('Error cleaning up canvas context', error as Error, {
          operation: 'canvas_cleanup_error',
        })
      }
    })
  }

  /**
   * Drawing 状態のクリーンアップ
   */
  const cleanupDrawingState = (stateResetCallback: () => void) => {
    onCleanup(() => {
      try {
        stateResetCallback()
        log.business.debug('Drawing state cleaned up', {
          operation: 'drawing_state_cleanup',
        })
      } catch (error) {
        log.business.error('Error cleaning up drawing state', error as Error, {
          operation: 'drawing_state_cleanup_error',
        })
      }
    })
  }

  return {
    scope,
    cleanup,
    addEventListener,
    onCleanup,
    cleanupCanvasContext,
    cleanupDrawingState,
  }
}