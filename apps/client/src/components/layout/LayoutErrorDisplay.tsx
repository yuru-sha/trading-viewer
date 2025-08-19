import React from 'react'
import { useApp, useAppActions } from '../../contexts/AppContext'
import ErrorDisplay from '../ErrorDisplay'

export const LayoutErrorDisplay: React.FC = () => {
  const { state } = useApp()
  const { clearAppError } = useAppActions()

  if (!state.appError && !state.error) return null

  // Enhanced Error Display for new error system
  if (state.appError) {
    return (
      <div className='mx-4 mt-4'>
        <ErrorDisplay
          error={state.appError.message}
          title={
            state.appError.type === 'network'
              ? 'Connection Problem'
              : state.appError.type === 'api'
                ? 'Service Issue'
                : state.appError.type === 'validation'
                  ? 'Invalid Input'
                  : 'Something went wrong'
          }
          actions={[
            ...(state.appError.retryable
              ? [
                  {
                    label: 'Try Again',
                    action: () => window.location.reload(),
                    variant: 'primary' as const,
                    icon: (
                      <svg
                        className='w-4 h-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
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
              : []),
            {
              label: 'Go to Home',
              action: () => (window.location.href = '/'),
              variant: 'outline' as const,
            },
          ]}
          onDismiss={clearAppError}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      </div>
    )
  }

  // Legacy Error Display for backward compatibility
  if (state.error) {
    return (
      <div
        className='bg-red-50 dark:bg-red-900 border-l-4 border-red-400 p-4 mx-4 mt-4 rounded-r-lg shadow-sm'
        role='alert'
        aria-live='assertive'
      >
        <div className='flex'>
          <div className='flex-shrink-0'>
            <svg
              className='h-5 w-5 text-red-400'
              viewBox='0 0 20 20'
              fill='currentColor'
              aria-hidden='true'
            >
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                clipRule='evenodd'
              />
            </svg>
          </div>
          <div className='ml-3 flex-1 min-w-0'>
            <p className='text-sm text-red-700 dark:text-red-200 break-words'>{state.error}</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}