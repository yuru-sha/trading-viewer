import React from 'react'
import { ErrorInfo, useError } from '../../contexts/ErrorContext'

interface ErrorNotificationProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
  maxVisible?: number
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  position = 'top-right',
  maxVisible = 5,
}) => {
  const { errors, removeError } = useError()

  if (errors.length === 0) {
    return null
  }

  const visibleErrors = errors.slice(-maxVisible)

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
    }
  }

  const getTypeStyles = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-400',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'text-red-400 hover:text-red-600',
        }
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-400',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          button: 'text-yellow-400 hover:text-yellow-600',
        }
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-400',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'text-blue-400 hover:text-blue-600',
        }
    }
  }

  const getTypeIcon = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'error':
        return (
          <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        )
      case 'warning':
        return (
          <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        )
      case 'info':
        return (
          <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        )
    }
  }

  return (
    <div className={`fixed z-50 space-y-2 max-w-sm w-full ${getPositionClasses()}`}>
      {visibleErrors.map(error => {
        const styles = getTypeStyles(error.type)

        return (
          <div
            key={error.id}
            className={`
              ${styles.container}
              border rounded-lg shadow-lg p-4 
              transition-all duration-300 ease-in-out
              animate-fade-in-right
            `}
          >
            <div className='flex items-start'>
              <div className={`flex-shrink-0 ${styles.icon}`}>{getTypeIcon(error.type)}</div>

              <div className='ml-3 flex-1'>
                <h3 className={`text-sm font-medium ${styles.title}`}>{error.title}</h3>
                <div className={`mt-1 text-sm ${styles.message}`}>{error.message}</div>

                {error.action && (
                  <div className='mt-3'>
                    <button
                      onClick={() => {
                        error.action?.onClick()
                        removeError(error.id)
                      }}
                      className={`
                        text-sm font-medium underline
                        ${styles.button}
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                      `}
                    >
                      {error.action.label}
                    </button>
                  </div>
                )}

                {process.env.NODE_ENV === 'development' && error.details && (
                  <details className='mt-2'>
                    <summary className={`text-xs cursor-pointer ${styles.message}`}>詳細</summary>
                    <pre
                      className={`mt-1 text-xs ${styles.message} whitespace-pre-wrap break-words`}
                    >
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              {error.dismissible && (
                <div className='ml-4 flex-shrink-0'>
                  <button
                    onClick={() => removeError(error.id)}
                    className={`
                      ${styles.button}
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    `}
                  >
                    <span className='sr-only'>閉じる</span>
                    <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Progress bar for auto-hide errors */}
            {error.autoHide && error.duration && (
              <div className='mt-3 w-full bg-gray-200 rounded-full h-1'>
                <div
                  className='h-1 rounded-full bg-current opacity-30 animate-progress-shrink'
                  style={{
                    animationDuration: `${error.duration}ms`,
                    animationTimingFunction: 'linear',
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ErrorNotification
