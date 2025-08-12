import React, { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: undefined })}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error?: Error
  onRetry: () => void
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRetry }) => {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6'>
        <div className='flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full'>
          <svg
            className='w-6 h-6 text-red-600 dark:text-red-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        </div>

        <div className='mt-4 text-center'>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
            Something went wrong
          </h3>

          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
            We're sorry, but something unexpected happened. Please try again.
          </p>

          {error && (
            <details className='mt-4 text-left'>
              <summary className='text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer'>
                Error Details
              </summary>
              <pre className='mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto'>
                {error.message}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>

        <div className='mt-6 flex justify-center space-x-3'>
          <button
            onClick={onRetry}
            className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600'
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.reload()}
            className='inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundary
