import { Request, Response, NextFunction } from 'express'
import { performance } from 'perf_hooks'
import { log } from '../infrastructure/services/logger'

interface PerformanceMetrics {
  timestamp: number
  method: string
  path: string
  statusCode: number
  responseTime: number
  memoryUsage: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  cpuUsage?: {
    user: number
    system: number
  }
  requestId?: string
  userAgent?: string
  ip?: string
}

interface PerformanceStats {
  totalRequests: number
  averageResponseTime: number
  requestsPerMinute: number
  errorRate: number
  memoryTrend: Array<{ timestamp: number; heapUsed: number }>
  slowQueries: PerformanceMetrics[]
  topEndpoints: Array<{ path: string; count: number; avgResponseTime: number }>
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private readonly maxMetrics = 1000
  private readonly slowQueryThreshold = 1000 // 1 second
  private readonly memoryThresholdMB = 500
  private _cpuUsageHistory: Array<{ user: number; system: number; timestamp: number }> = []
  private startTime = Date.now()

  public recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log slow queries
    if (metric.responseTime > this.slowQueryThreshold) {
      log.performance.warn('Slow query detected', {
        path: metric.path,
        method: metric.method,
        responseTime: `${metric.responseTime}ms`,
        requestId: metric.requestId,
      })
    }

    // Log high memory usage
    const heapUsedMB = metric.memoryUsage.heapUsed / 1024 / 1024
    if (heapUsedMB > this.memoryThresholdMB) {
      log.performance.warn('High memory usage detected', {
        path: metric.path,
        heapUsed: `${Math.round(heapUsedMB)}MB`,
        requestId: metric.requestId,
      })
    }
  }

  public getStats(): PerformanceStats {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneMinuteAgo)

    const totalRequests = this.metrics.length
    const averageResponseTime =
      totalRequests > 0
        ? this.metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
        : 0

    const requestsPerMinute = recentMetrics.length
    const errorMetrics = this.metrics.filter(m => m.statusCode >= 400)
    const errorRate = totalRequests > 0 ? (errorMetrics.length / totalRequests) * 100 : 0

    // Memory trend (last 10 data points)
    const memoryTrend = this.metrics.slice(-10).map(m => ({
      timestamp: m.timestamp,
      heapUsed: m.memoryUsage.heapUsed,
    }))

    // Slow queries (response time > threshold)
    const slowQueries = this.metrics
      .filter(m => m.responseTime > this.slowQueryThreshold)
      .slice(-10) // Last 10 slow queries

    // Top endpoints by request count and average response time
    const endpointStats = new Map<string, { count: number; totalTime: number }>()

    this.metrics.forEach(metric => {
      const key = `${metric.method} ${metric.path}`
      const existing = endpointStats.get(key) || { count: 0, totalTime: 0 }
      endpointStats.set(key, {
        count: existing.count + 1,
        totalTime: existing.totalTime + metric.responseTime,
      })
    })

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([path, stats]) => ({
        path,
        count: stats.count,
        avgResponseTime: stats.totalTime / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      requestsPerMinute,
      errorRate: Math.round(errorRate * 100) / 100,
      memoryTrend,
      slowQueries,
      topEndpoints,
    }
  }

  public getSystemMetrics(): {
    uptime: number
    memoryUsage: NodeJS.MemoryUsage
    cpuUsage: NodeJS.CpuUsage
    processStats: {
      pid: number
      version: string
      arch: string
      platform: string
    }
  } {
    return {
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      processStats: {
        pid: process.pid,
        version: process.version,
        arch: process.arch,
        platform: process.platform,
      },
    }
  }

  public clearMetrics(): void {
    this.metrics = []
    this._cpuUsageHistory = []
  }

  public getHealthScore(): {
    score: number
    factors: {
      responseTime: { score: number; value: number }
      errorRate: { score: number; value: number }
      memoryUsage: { score: number; value: number }
      cpuUsage: { score: number; value: number }
    }
  } {
    const stats = this.getStats()
    const systemMetrics = this.getSystemMetrics()

    // Response time score (0-100, lower is better)
    const responseTimeScore = Math.max(0, 100 - stats.averageResponseTime / 10)

    // Error rate score (0-100, lower is better)
    const errorRateScore = Math.max(0, 100 - stats.errorRate * 2)

    // Memory usage score (0-100, lower usage is better)
    const memoryUsageMB = systemMetrics.memoryUsage.heapUsed / 1024 / 1024
    const memoryScore = Math.max(0, 100 - memoryUsageMB / 10)

    // CPU usage score (simplified - just check if process is responsive)
    const cpuScore = 80 // Placeholder - would need more sophisticated CPU monitoring

    // Overall health score (weighted average)
    const overallScore =
      responseTimeScore * 0.3 + errorRateScore * 0.3 + memoryScore * 0.2 + cpuScore * 0.2

    return {
      score: Math.round(overallScore),
      factors: {
        responseTime: { score: Math.round(responseTimeScore), value: stats.averageResponseTime },
        errorRate: { score: Math.round(errorRateScore), value: stats.errorRate },
        memoryUsage: { score: Math.round(memoryScore), value: memoryUsageMB },
        cpuUsage: { score: Math.round(cpuScore), value: 0 },
      },
    }
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor()

// Middleware to track performance
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = performance.now()
  const startCpuUsage = process.cpuUsage()
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`

  // Add request ID to request object
  ;(req as any).requestId = requestId

  // Override res.end to capture metrics
  const originalEnd = res.end
  res.end = function (chunk?: any, encoding?: any): any {
    const endTime = performance.now()
    const responseTime = endTime - startTime
    const endCpuUsage = process.cpuUsage(startCpuUsage)

    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      method: req.method,
      path: req.route?.path || req.path,
      statusCode: res.statusCode,
      responseTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: {
        user: endCpuUsage.user,
        system: endCpuUsage.system,
      },
      requestId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    }

    performanceMonitor.recordMetric(metric)

    // Add performance headers
    res.set('X-Response-Time', `${Math.round(responseTime)}ms`)
    res.set('X-Request-Id', requestId)

    return originalEnd.call(this, chunk, encoding)
  }

  next()
}

// Route handlers for performance data
export const getPerformanceStats = (_req: Request, res: Response): void => {
  try {
    const stats = performanceMonitor.getStats()
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const getSystemMetrics = (_req: Request, res: Response): void => {
  try {
    const metrics = performanceMonitor.getSystemMetrics()
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const getHealthScore = (_req: Request, res: Response): void => {
  try {
    const health = performanceMonitor.getHealthScore()
    const status = health.score >= 80 ? 'healthy' : health.score >= 60 ? 'degraded' : 'unhealthy'

    res.status(health.score >= 60 ? 200 : 503).json({
      success: true,
      data: {
        ...health,
        status,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health score',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const clearPerformanceData = (_req: Request, res: Response): void => {
  try {
    performanceMonitor.clearMetrics()
    res.json({
      success: true,
      message: 'Performance data cleared successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear performance data',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// Export the monitor instance for direct access if needed
export { performanceMonitor }

// Utility function to create performance alerts
export const createPerformanceAlert = (
  threshold: {
    responseTime?: number
    errorRate?: number
    memoryUsage?: number
  },
  callback: (alert: { type: string; value: number; threshold: number }) => void
): NodeJS.Timeout => {
  return setInterval(() => {
    const stats = performanceMonitor.getStats()
    const systemMetrics = performanceMonitor.getSystemMetrics()

    if (threshold.responseTime && stats.averageResponseTime > threshold.responseTime) {
      callback({
        type: 'responseTime',
        value: stats.averageResponseTime,
        threshold: threshold.responseTime,
      })
    }

    if (threshold.errorRate && stats.errorRate > threshold.errorRate) {
      callback({
        type: 'errorRate',
        value: stats.errorRate,
        threshold: threshold.errorRate,
      })
    }

    if (threshold.memoryUsage) {
      const memoryUsageMB = systemMetrics.memoryUsage.heapUsed / 1024 / 1024
      if (memoryUsageMB > threshold.memoryUsage) {
        callback({
          type: 'memoryUsage',
          value: memoryUsageMB,
          threshold: threshold.memoryUsage,
        })
      }
    }
  }, 30000) // Check every 30 seconds
}

// Performance optimization suggestions
export const getOptimizationSuggestions = (): Array<{
  type: string
  description: string
  priority: 'high' | 'medium' | 'low'
}> => {
  const stats = performanceMonitor.getStats()
  const systemMetrics = performanceMonitor.getSystemMetrics()
  const suggestions: Array<{
    type: string
    description: string
    priority: 'high' | 'medium' | 'low'
  }> = []

  if (stats.averageResponseTime > 1000) {
    suggestions.push({
      type: 'responseTime',
      description:
        'Average response time is high. Consider optimizing database queries and adding caching.',
      priority: 'high',
    })
  }

  if (stats.errorRate > 5) {
    suggestions.push({
      type: 'errorRate',
      description: 'Error rate is high. Review error logs and improve error handling.',
      priority: 'high',
    })
  }

  const memoryUsageMB = systemMetrics.memoryUsage.heapUsed / 1024 / 1024
  if (memoryUsageMB > 500) {
    suggestions.push({
      type: 'memoryUsage',
      description: 'Memory usage is high. Consider implementing memory cleanup and optimization.',
      priority: 'medium',
    })
  }

  if (stats.slowQueries.length > 5) {
    suggestions.push({
      type: 'slowQueries',
      description: 'Multiple slow queries detected. Optimize database queries and add indexing.',
      priority: 'high',
    })
  }

  return suggestions
}
