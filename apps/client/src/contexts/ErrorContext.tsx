import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { ERROR_TIMEOUTS } from '@trading-viewer/shared'
import {
  classifyError,
  errorRecoveryManager,
  createErrorReport,
  reportError,
  type ErrorClassification,
} from '../utils/errorRecovery'

export interface ErrorInfo {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
  autoHide?: boolean
  duration?: number
  timestamp: Date
  source?: 'api' | 'websocket' | 'client' | 'network'
  details?: any
  // Enhanced error handling
  classification?: ErrorClassification
  recoveryAttempted?: boolean
  recoverySuccessful?: boolean
  retryCount?: number
  context?: string
}

interface ErrorContextValue {
  errors: ErrorInfo[]
  addError: (error: Omit<ErrorInfo, 'id' | 'timestamp'>) => string
  removeError: (id: string) => void
  clearAllErrors: () => void
  getErrorsByType: (type: ErrorInfo['type']) => ErrorInfo[]
  hasErrors: boolean
}

const ErrorContext = createContext<ErrorContextValue | null>(null)

interface ErrorProviderProps {
  children: React.ReactNode
  maxErrors?: number
  defaultDuration?: number
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({
  children,
  maxErrors = 10,
  defaultDuration = ERROR_TIMEOUTS.NOTIFICATION_DURATION,
}) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([])
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const errorCountRef = useRef(0)

  const generateErrorId = useCallback((): string => {
    errorCountRef.current += 1
    return `error-${Date.now()}-${errorCountRef.current}`
  }, [])

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id))

    // Clear timeout if exists
    const timeoutId = timeoutRefs.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutRefs.current.delete(id)
    }
  }, [])

  const addError = useCallback(
    (errorData: Omit<ErrorInfo, 'id' | 'timestamp'>): string => {
      const id = generateErrorId()
      const error: ErrorInfo = {
        ...errorData,
        id,
        timestamp: new Date(),
        dismissible: errorData.dismissible ?? true,
        autoHide: errorData.autoHide ?? errorData.type !== 'error',
        duration: errorData.duration ?? defaultDuration,
      }

      setErrors(prev => {
        // Remove oldest errors if we exceed maxErrors
        const newErrors = [...prev, error]
        if (newErrors.length > maxErrors) {
          const removed = newErrors.splice(0, newErrors.length - maxErrors)
          removed.forEach(removedError => {
            const timeoutId = timeoutRefs.current.get(removedError.id)
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutRefs.current.delete(removedError.id)
            }
          })
        }
        return newErrors
      })

      // Set auto-hide timeout
      if (error.autoHide && error.duration && error.duration > 0) {
        const timeoutId = setTimeout(() => {
          removeError(id)
        }, error.duration)
        timeoutRefs.current.set(id, timeoutId)
      }

      return id
    },
    [generateErrorId, defaultDuration, maxErrors, removeError]
  )

  const clearAllErrors = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId))
    timeoutRefs.current.clear()

    setErrors([])
  }, [])

  const getErrorsByType = useCallback(
    (type: ErrorInfo['type']): ErrorInfo[] => {
      return errors.filter(error => error.type === type)
    },
    [errors]
  )

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId))
    }
  }, [])

  const value: ErrorContextValue = {
    errors,
    addError,
    removeError,
    clearAllErrors,
    getErrorsByType,
    hasErrors: errors.length > 0,
  }

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
}

export const useError = (): ErrorContextValue => {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

// Convenience hooks for specific error types
export const useErrorHandlers = () => {
  const { addError } = useError()

  const handleApiError = useCallback(
    async (error: any, context?: string) => {
      // エラーを分類
      const classification = classifyError(error)

      // エラーレポートを作成
      const errorReport = createErrorReport(error, context)

      let title = 'API エラー'
      let message = 'サーバーとの通信中にエラーが発生しました。'
      let action: ErrorInfo['action'] | undefined
      let recoveryAttempted = false
      let recoverySuccessful = false

      // 自動回復を試行（回復可能なエラーの場合）
      if (classification.isRecoverable && !classification.userActionRequired) {
        try {
          recoveryAttempted = true
          recoverySuccessful = await errorRecoveryManager.attemptRecovery(error, context)

          if (recoverySuccessful) {
            // 回復成功時は警告レベルで表示
            return addError({
              type: 'warning',
              title: '問題を自動解決しました',
              message: `一時的な問題が発生しましたが、自動的に回復しました。${context ? `(${context})` : ''}`,
              classification,
              recoveryAttempted,
              recoverySuccessful,
              context,
              autoHide: true,
              duration: ERROR_TIMEOUTS.WARNING_NOTIFICATION,
              source: 'api',
              details: error,
            })
          }
        } catch (recoveryError) {
          console.warn('Error recovery failed:', recoveryError)
        }
      }

      // HTTPステータスに基づくエラーメッセージ
      if (error?.response?.status) {
        const status = error.response.status
        const retryCount = errorRecoveryManager.getRetryCount('retryRequest')

        switch (status) {
          case 400:
            title = 'リクエストエラー'
            message = '入力データに問題があります。'
            break
          case 401:
            title = '認証エラー'
            message = 'ログインが必要です。'
            action = {
              label: 'ログイン',
              onClick: () => (window.location.href = '/login'),
            }
            break
          case 403:
            // CSRF エラーの場合
            if (
              error.response.data?.message?.includes('CSRF') ||
              error.response.data?.error?.includes('CSRF')
            ) {
              title = 'セキュリティエラー'
              message = 'セキュリティトークンが無効です。'
              action = {
                label: '再試行',
                onClick: async () => {
                  await errorRecoveryManager.attemptRecovery(error, context)
                },
              }
            } else {
              title = 'アクセス拒否'
              message = 'この操作を実行する権限がありません。'
            }
            break
          case 404:
            title = 'リソースが見つかりません'
            message = '要求されたデータが見つかりませんでした。'
            break
          case 429:
            title = 'レート制限'
            message = `リクエスト数が上限に達しました。${retryCount > 0 ? `(再試行 ${retryCount}回目)` : 'しばらく待ってから再試行してください。'}`
            if (retryCount < 3) {
              action = {
                label: '再試行',
                onClick: async () => {
                  await errorRecoveryManager.attemptRecovery(error, context)
                },
              }
            }
            break
          case 500:
            title = 'サーバーエラー'
            message = 'サーバー側でエラーが発生しました。'
            action = {
              label: '再試行',
              onClick: async () => {
                await errorRecoveryManager.attemptRecovery(error, context)
              },
            }
            break
          case 502:
          case 503:
          case 504:
            title = 'サービス一時停止'
            message = 'サービスが一時的に利用できません。'
            action = {
              label: '再試行',
              onClick: async () => {
                await errorRecoveryManager.attemptRecovery(error, context)
              },
            }
            break
        }
      }

      if (context) {
        message += ` (${context})`
      }

      // エラーレポートを送信
      await reportError({
        ...errorReport,
        recoveryAttempted,
        recoverySuccessful,
      })

      return addError({
        type: 'error',
        title,
        message,
        action,
        source: 'api',
        details: error,
        classification,
        recoveryAttempted,
        recoverySuccessful,
        retryCount: errorRecoveryManager.getRetryCount('retryRequest'),
        context,
      })
    },
    [addError]
  )

  const handleWebSocketError = useCallback(
    (error: any, context?: string) => {
      let title = 'リアルタイム接続エラー'
      let message = 'リアルタイムデータの接続に問題があります。'

      if (context) {
        message += ` (${context})`
      }

      return addError({
        type: 'warning',
        title,
        message,
        source: 'websocket',
        details: error,
        action: {
          label: '再接続',
          onClick: () => window.location.reload(),
        },
      })
    },
    [addError]
  )

  const handleNetworkError = useCallback(
    (error: any, context?: string) => {
      return addError({
        type: 'error',
        title: 'ネットワークエラー',
        message: `インターネット接続を確認してください。${context ? `(${context})` : ''}`,
        source: 'network',
        details: error,
        action: {
          label: '再試行',
          onClick: () => window.location.reload(),
        },
      })
    },
    [addError]
  )

  const showSuccess = useCallback(
    (message: string, title: string = '成功') => {
      return addError({
        type: 'info',
        title,
        message,
        source: 'client',
        autoHide: true,
        duration: ERROR_TIMEOUTS.SUCCESS_NOTIFICATION,
      })
    },
    [addError]
  )

  const showWarning = useCallback(
    (message: string, title: string = '警告') => {
      return addError({
        type: 'warning',
        title,
        message,
        source: 'client',
        autoHide: true,
        duration: ERROR_TIMEOUTS.WARNING_NOTIFICATION,
      })
    },
    [addError]
  )

  const showInfo = useCallback(
    (message: string, title: string = '情報') => {
      return addError({
        type: 'info',
        title,
        message,
        source: 'client',
        autoHide: true,
        duration: ERROR_TIMEOUTS.SUCCESS_NOTIFICATION,
      })
    },
    [addError]
  )

  return {
    handleApiError,
    handleWebSocketError,
    handleNetworkError,
    showSuccess,
    showWarning,
    showInfo,
  }
}

// Error boundary component for catching React errors
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)

    // You could send this to an error reporting service here
    if (typeof window !== 'undefined' && (window as any).errorReporter) {
      ;(window as any).errorReporter.captureException(error, {
        tags: { source: 'react' },
        extra: errorInfo,
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50'>
          <div className='max-w-md w-full bg-white shadow-lg rounded-lg p-6'>
            <div className='flex items-center mb-4'>
              <div className='flex-shrink-0'>
                <svg
                  className='h-8 w-8 text-red-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z'
                  />
                </svg>
              </div>
              <div className='ml-3'>
                <h3 className='text-lg font-medium text-gray-900'>アプリケーションエラー</h3>
              </div>
            </div>
            <div className='mb-4'>
              <p className='text-sm text-gray-600'>
                申し訳ございません。予期しないエラーが発生しました。ページを再読み込みしてください。
              </p>
              {import.meta.env.DEV && this.state.error && (
                <details className='mt-4 text-xs text-gray-500'>
                  <summary>エラー詳細</summary>
                  <pre className='mt-2 whitespace-pre-wrap break-words'>
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <div className='flex space-x-3'>
              <button
                onClick={() => window.location.reload()}
                className='flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                再読み込み
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className='flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500'
              >
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
