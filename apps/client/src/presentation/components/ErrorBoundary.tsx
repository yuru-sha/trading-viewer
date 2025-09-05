import { Component, ReactNode } from 'react'
import { Button } from '@trading-viewer/ui'
import { log } from '@/infrastructure/services/LoggerService'

interface ErrorInfo {
  componentStack: string
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error | null
  errorInfo?: ErrorInfo | null
}

/**
 * Enhanced Error Boundary with UX improvements
 * - Clear error messages
 * - Recovery actions
 * - Error reporting capabilities
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.system.error('ErrorBoundary caught an error', error, {
      operation: 'error_boundary_catch',
      componentStack: errorInfo.componentStack,
    })

    this.setState({
      error,
      errorInfo,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4'>
          <div className='max-w-md w-full'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-200 dark:border-gray-700'>
              {/* Error Icon */}
              <div className='flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full'>
                <svg
                  className='w-8 h-8 text-red-600 dark:text-red-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z'
                  />
                </svg>
              </div>

              {/* Error Title */}
              <h1 className='text-xl font-bold text-gray-900 dark:text-white text-center mb-2'>
                Something went wrong
              </h1>

              {/* Error Description */}
              <p className='text-sm text-gray-600 dark:text-gray-400 text-center mb-6'>
                An unexpected error occurred. Please try one of the recovery options below.
              </p>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className='mb-6 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md'>
                  <h3 className='text-sm font-medium text-red-800 dark:text-red-200 mb-2'>
                    Error Details (Development)
                  </h3>
                  <pre className='text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-all'>
                    {this.state.error.message}
                  </pre>
                </div>
              )}

              {/* Recovery Actions */}
              <div className='space-y-3'>
                <Button
                  onClick={this.handleRetry}
                  variant='primary'
                  className='w-full'
                  disabled={false}
                  aria-label='Try to recover from error'
                >
                  Try Again
                </Button>

                <Button
                  onClick={this.handleReload}
                  variant='outline'
                  className='w-full'
                  disabled={false}
                  aria-label='Reload the page'
                >
                  Reload Page
                </Button>

                <Button
                  onClick={() => (window.location.href = '/')}
                  variant='ghost'
                  className='w-full text-gray-600 dark:text-gray-400'
                  disabled={false}
                  aria-label='Go to home page'
                >
                  Go to Home
                </Button>
              </div>

              {/* Support Info */}
              <div className='mt-6 pt-4 border-t border-gray-200 dark:border-gray-700'>
                <p className='text-xs text-gray-500 dark:text-gray-400 text-center'>
                  If the problem persists, please contact support with the error details.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
