import React from 'react'
import SkeletonLoader from '../SkeletonLoader'

interface LoadingOverlayProps {
  isVisible: boolean
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null

  return (
    <div
      className='fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm'
      role='alert'
      aria-live='assertive'
      aria-label='Loading content'
    >
      <div className='w-full max-w-4xl mx-4 px-6'>
        <div className='text-center mb-8'>
          <div
            className='animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400 mx-auto mb-4'
            aria-hidden='true'
          ></div>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
            Loading TradingViewer
          </h2>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Preparing your trading dashboard...
          </p>
        </div>

        {/* Loading Skeleton Preview */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700'>
          {/* Header skeleton */}
          <div className='flex justify-between items-center mb-6'>
            <SkeletonLoader variant='text' width='200px' height='24px' />
            <SkeletonLoader variant='rectangle' width='120px' height='36px' />
          </div>

          {/* Chart skeleton */}
          <div className='mb-6'>
            <SkeletonLoader variant='chart' height='300px' />
          </div>

          {/* List skeleton */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className='border border-gray-200 dark:border-gray-600 rounded-lg p-4'
              >
                <SkeletonLoader variant='text' width='80px' height='16px' className='mb-2' />
                <SkeletonLoader variant='text' width='120px' height='24px' className='mb-2' />
                <SkeletonLoader variant='text' width='100px' height='14px' />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
