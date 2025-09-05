// エラー回復のためのユーティリティ

import { log } from '@/infrastructure/services/LoggerService'

export interface RecoveryStrategy {
  id: string
  name: string
  description: string
  action: () => Promise<boolean>
  canRetry: boolean
  priority: number
}

export interface ErrorClassification {
  category:
    | 'network'
    | 'authentication'
    | 'authorization'
    | 'validation'
    | 'server'
    | 'client'
    | 'rate_limit'
    | 'csrf'
  severity: 'low' | 'medium' | 'high' | 'critical'
  isRecoverable: boolean
  retryable: boolean
  userActionRequired: boolean
}

// エラー分類器
export const classifyError = (error: unknown): ErrorClassification => {
  const errorLike = error as {
    code?: string
    message?: string
    response?: { status: number; data?: { message?: string; error?: string } }
  }
  // Network errors
  if (errorLike?.code === 'NETWORK_ERROR' || errorLike?.message?.includes('fetch')) {
    return {
      category: 'network',
      severity: 'medium',
      isRecoverable: true,
      retryable: true,
      userActionRequired: false,
    }
  }

  // HTTP errors
  if (errorLike?.response?.status) {
    const status = errorLike.response.status

    switch (status) {
      case 401:
        return {
          category: 'authentication',
          severity: 'high',
          isRecoverable: true,
          retryable: false,
          userActionRequired: true,
        }

      case 403:
        // CSRF errors are recoverable
        if (
          errorLike.response.data?.message?.includes('CSRF') ||
          errorLike.response.data?.error?.includes('CSRF')
        ) {
          return {
            category: 'csrf',
            severity: 'medium',
            isRecoverable: true,
            retryable: true,
            userActionRequired: false,
          }
        }
        return {
          category: 'authorization',
          severity: 'high',
          isRecoverable: false,
          retryable: false,
          userActionRequired: true,
        }

      case 400:
      case 422:
        return {
          category: 'validation',
          severity: 'low',
          isRecoverable: true,
          retryable: false,
          userActionRequired: true,
        }

      case 429:
        return {
          category: 'rate_limit',
          severity: 'medium',
          isRecoverable: true,
          retryable: true,
          userActionRequired: false,
        }

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          category: 'server',
          severity: status === 500 ? 'high' : 'medium',
          isRecoverable: true,
          retryable: true,
          userActionRequired: false,
        }

      default:
        return {
          category: 'client',
          severity: 'medium',
          isRecoverable: false,
          retryable: false,
          userActionRequired: true,
        }
    }
  }

  // JavaScript errors
  if (error instanceof Error) {
    return {
      category: 'client',
      severity: 'medium',
      isRecoverable: false,
      retryable: false,
      userActionRequired: false,
    }
  }

  // Unknown errors
  return {
    category: 'client',
    severity: 'low',
    isRecoverable: false,
    retryable: false,
    userActionRequired: false,
  }
}

// 自動回復戦略
export const createRecoveryStrategies = (): Record<string, RecoveryStrategy> => ({
  refreshPage: {
    id: 'refreshPage',
    name: 'ページを再読み込み',
    description: 'ページ全体を再読み込みして問題を解決します',
    action: async () => {
      window.location.reload()
      return true
    },
    canRetry: false,
    priority: 1,
  },

  clearCache: {
    id: 'clearCache',
    name: 'キャッシュをクリア',
    description: 'ブラウザキャッシュをクリアして再試行します',
    action: async () => {
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
        }
        // Clear temporary session data only
        sessionStorage.clear()
        return true
      } catch {
        return false
      }
    },
    canRetry: true,
    priority: 2,
  },

  retryRequest: {
    id: 'retryRequest',
    name: '再試行',
    description: '少し待ってから同じ操作を再試行します',
    action: async () => {
      // 指数バックオフで再試行
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    },
    canRetry: true,
    priority: 3,
  },

  forceReauth: {
    id: 'forceReauth',
    name: '再認証',
    description: '認証状態をリセットして再ログインします',
    action: async () => {
      // Clear session storage (if any temporary data exists)
      sessionStorage.clear()

      // Clear auth cookies by redirecting to logout (main auth mechanism)
      window.location.href = '/api/auth/logout'
      return true
    },
    canRetry: false,
    priority: 4,
  },

  navigateHome: {
    id: 'navigateHome',
    name: 'ホームに戻る',
    description: 'ホームページに戻って安全な状態に復帰します',
    action: async () => {
      window.location.href = '/'
      return true
    },
    canRetry: false,
    priority: 5,
  },
})

// エラー回復マネージャー
export class ErrorRecoveryManager {
  private strategies = createRecoveryStrategies()
  private retryAttempts = new Map<string, number>()
  private maxRetries = 3

  async attemptRecovery(error: unknown, _context?: string): Promise<boolean> {
    const classification = classifyError(error)

    if (!classification.isRecoverable) {
      return false
    }

    const strategiesForError = this.getStrategiesForError(classification)

    for (const strategy of strategiesForError) {
      try {
        const attempts = this.retryAttempts.get(strategy.id) || 0

        if (attempts >= this.maxRetries && strategy.canRetry) {
          continue
        }

        const success = await strategy.action()

        if (success) {
          this.retryAttempts.delete(strategy.id)
          return true
        }

        if (strategy.canRetry) {
          this.retryAttempts.set(strategy.id, attempts + 1)
        }
      } catch (recoveryError) {
        log.system.warn(`Recovery strategy ${strategy.id} failed`, recoveryError)
      }
    }

    return false
  }

  private getStrategiesForError(classification: ErrorClassification): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = []

    switch (classification.category) {
      case 'network':
        if (this.strategies.retryRequest) strategies.push(this.strategies.retryRequest)
        if (this.strategies.refreshPage) strategies.push(this.strategies.refreshPage)
        break

      case 'authentication':
        if (this.strategies.forceReauth) strategies.push(this.strategies.forceReauth)
        if (this.strategies.navigateHome) strategies.push(this.strategies.navigateHome)
        break

      case 'csrf':
        if (this.strategies.retryRequest) strategies.push(this.strategies.retryRequest)
        if (this.strategies.forceReauth) strategies.push(this.strategies.forceReauth)
        break

      case 'rate_limit':
        if (this.strategies.retryRequest) strategies.push(this.strategies.retryRequest)
        break

      case 'server':
        if (this.strategies.retryRequest) strategies.push(this.strategies.retryRequest)
        if (this.strategies.refreshPage) strategies.push(this.strategies.refreshPage)
        break

      case 'client':
        if (this.strategies.clearCache) strategies.push(this.strategies.clearCache)
        if (this.strategies.refreshPage) strategies.push(this.strategies.refreshPage)
        break

      default:
        if (this.strategies.refreshPage) strategies.push(this.strategies.refreshPage)
        if (this.strategies.navigateHome) strategies.push(this.strategies.navigateHome)
    }

    return strategies.sort((a, b) => a.priority - b.priority)
  }

  reset(): void {
    this.retryAttempts.clear()
  }

  getRetryCount(strategyId: string): number {
    return this.retryAttempts.get(strategyId) || 0
  }
}

// シングルトンインスタンス
export const errorRecoveryManager = new ErrorRecoveryManager()

// エラーレポート用ユーティリティ
export interface ErrorReport {
  id: string
  timestamp: Date
  error: unknown
  classification: ErrorClassification
  context?: string
  userAgent: string
  url: string
  userId?: string
  recoveryAttempted: boolean
  recoverySuccessful?: boolean
}

export const createErrorReport = (
  error: unknown,
  context?: string,
  userId?: string
): ErrorReport => {
  const errorLike = error as {
    message?: string
    stack?: string
    response?: { status: number; data: unknown }
  }
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    error: {
      message: errorLike?.message || 'Unknown error',
      stack: errorLike?.stack,
      response: errorLike?.response
        ? {
            status: errorLike.response.status,
            data: errorLike.response.data,
          }
        : undefined,
    },
    classification: classifyError(error),
    ...(context !== undefined && { context }),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...(userId !== undefined && { userId }),
    recoveryAttempted: false,
  }
}

// エラーレポートの送信（将来的にサーバーに送信する場合）
export const reportError = async (report: ErrorReport): Promise<void> => {
  // デバッグ環境では構造化ログで出力
  if (process.env.NODE_ENV === 'development') {
    log.system.error('Error report generated', {
      report: {
        id: report.id,
        classification: report.classification,
        context: report.context,
        url: report.url,
        timestamp: report.timestamp,
        error: report.error,
      },
    })
  }

  // 本番環境では外部エラーレポートサービスに送信
  // 例: Sentry, LogRocket, etc.
}
