import React from 'react'
import { Button } from '@trading-viewer/ui'

export interface ErrorDisplayProps {
  error: string | Error
  title?: string
  description?: string
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'primary' | 'outline' | 'ghost'
    icon?: React.ReactNode
  }>
  onDismiss?: () => void
  showDetails?: boolean
  className?: string
}

/**
 * Enhanced Error Display Component
 * - Clear error categorization
 * - Multiple recovery actions
 * - Accessibility compliant
 * - Contextual help
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title,
  description,
  actions = [],
  onDismiss,
  showDetails = false,
  className = '',
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message
  const isNetworkError =
    errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')
  const isAPIError =
    errorMessage.toLowerCase().includes('api') || errorMessage.toLowerCase().includes('server')

  // Determine error type and provide contextual information
  const getErrorContext = () => {
    if (isNetworkError) {
      return {
        title: title || 'Connection Problem',
        description:
          description || 'Unable to connect to our servers. Please check your internet connection.',
        icon: (
          <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0'
            />
          </svg>
        ),
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again',
        ],
      }
    }

    if (isAPIError) {
      return {
        title: title || 'Service Temporarily Unavailable',
        description:
          description || "Our servers are experiencing issues. We're working to fix this.",
        icon: (
          <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
            />
          </svg>
        ),
        suggestions: [
          'Try again in a few minutes',
          'Check our status page',
          'Contact support if the problem persists',
        ],
      }
    }

    return {
      title: title || 'Something went wrong',
      description: description || 'An unexpected error occurred.',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z'
          />
        </svg>
      ),
      suggestions: [
        'Try refreshing the page',
        'Clear your browser cache',
        'Contact support if the issue continues',
      ],
    }
  }

  const context = getErrorContext()
  const defaultActions = [
    {
      label: 'Try Again',
      action: () => window.location.reload(),
      variant: 'primary' as const,
      icon: (
        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
          />
        </svg>
      ),
    },
  ]

  const allActions = actions.length > 0 ? actions : defaultActions

  return (
    <div
      className={`bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6 ${className}`}
      role='alert'
      aria-live='assertive'
    >
      <div className='flex'>
        <div className='flex-shrink-0'>
          <div className='text-red-400 dark:text-red-300'>{context.icon}</div>
        </div>

        <div className='ml-3 flex-1 min-w-0'>
          {/* Title */}
          <h3 className='text-lg font-medium text-red-800 dark:text-red-200 mb-2'>
            {context.title}
          </h3>

          {/* Description */}
          <p className='text-sm text-red-700 dark:text-red-300 mb-4'>{context.description}</p>

          {/* Error Message */}
          {showDetails && (
            <div className='mb-4 p-3 bg-red-100 dark:bg-red-800 rounded-md'>
              <p className='text-xs font-mono text-red-800 dark:text-red-200 break-all'>
                {errorMessage}
              </p>
            </div>
          )}

          {/* Suggestions */}
          <div className='mb-4'>
            <h4 className='text-sm font-medium text-red-800 dark:text-red-200 mb-2'>
              What you can try:
            </h4>
            <ul className='list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1'>
              {context.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className='flex flex-wrap gap-3'>
            {allActions.map((action, index) => (
              <Button
                key={index}
                onClick={action.action}
                variant={action.variant || 'outline'}
                size='sm'
                disabled={false}
                className={
                  action.variant === 'primary'
                    ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
                    : action.variant === 'outline'
                      ? 'border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-800'
                      : 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                }
              >
                {action.icon && (
                  <span className='mr-2' aria-hidden='true'>
                    {action.icon}
                  </span>
                )}
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <div className='ml-auto pl-3'>
            <Button
              variant='ghost'
              size='sm'
              onClick={onDismiss}
              disabled={false}
              className='text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-800 p-1.5'
              aria-label='Dismiss error'
            >
              <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                  clipRule='evenodd'
                />
              </svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorDisplay
