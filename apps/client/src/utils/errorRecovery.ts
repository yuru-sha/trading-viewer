// エラー回復のためのユーティリティ

export interface RecoveryStrategy {
  id: string
  name: string
  description: string
  action: () => Promise<boolean>
  canRetry: boolean
  priority: number
}

export interface ErrorClassification {
  category: 'network' | 'authentication' | 'authorization' | 'validation' | 'server' | 'client' | 'rate_limit' | 'csrf'
  severity: 'low' | 'medium' | 'high' | 'critical'
  isRecoverable: boolean
  retryable: boolean
  userActionRequired: boolean
}

// エラー分類器
export const classifyError = (error: any): ErrorClassification => {
  // Network errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
    return {
      category: 'network',
      severity: 'medium',
      isRecoverable: true,
      retryable: true,
      userActionRequired: false,
    }
  }

  // HTTP errors
  if (error?.response?.status) {
    const status = error.response.status

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
        if (error.response.data?.message?.includes('CSRF') || 
            error.response.data?.error?.includes('CSRF')) {
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
        localStorage.clear()
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
      // Clear all auth-related storage
      localStorage.removeItem('auth_user')
      sessionStorage.clear()
      
      // Clear auth cookies by redirecting to logout
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

  async attemptRecovery(error: any, context?: string): Promise<boolean> {
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
        console.warn(`Recovery strategy ${strategy.id} failed:`, recoveryError)
      }
    }

    return false
  }

  private getStrategiesForError(classification: ErrorClassification): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = []

    switch (classification.category) {
      case 'network':
        strategies.push(
          this.strategies.retryRequest,
          this.strategies.refreshPage
        )
        break

      case 'authentication':
        strategies.push(
          this.strategies.forceReauth,
          this.strategies.navigateHome
        )
        break

      case 'csrf':
        strategies.push(
          this.strategies.retryRequest,
          this.strategies.forceReauth
        )
        break

      case 'rate_limit':
        strategies.push(
          this.strategies.retryRequest
        )
        break

      case 'server':
        strategies.push(
          this.strategies.retryRequest,
          this.strategies.refreshPage
        )
        break

      case 'client':
        strategies.push(
          this.strategies.clearCache,
          this.strategies.refreshPage
        )
        break

      default:
        strategies.push(
          this.strategies.refreshPage,
          this.strategies.navigateHome
        )
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
  error: any
  classification: ErrorClassification
  context?: string
  userAgent: string
  url: string
  userId?: string
  recoveryAttempted: boolean
  recoverySuccessful?: boolean
}

export const createErrorReport = (
  error: any, 
  context?: string, 
  userId?: string
): ErrorReport => ({
  id: crypto.randomUUID(),
  timestamp: new Date(),
  error: {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    response: error?.response ? {
      status: error.response.status,
      data: error.response.data,
    } : undefined,
  },
  classification: classifyError(error),
  context,
  userAgent: navigator.userAgent,
  url: window.location.href,
  userId,
  recoveryAttempted: false,
})

// エラーレポートの送信（将来的にサーバーに送信する場合）
export const reportError = async (report: ErrorReport): Promise<void> => {
  // デバッグ環境では console.error で出力
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Report')
    console.error('Error:', report.error)
    console.log('Classification:', report.classification)
    console.log('Context:', report.context)
    console.log('URL:', report.url)
    console.groupEnd()
  }

  // 本番環境では外部エラーレポートサービスに送信
  // 例: Sentry, LogRocket, etc.
}