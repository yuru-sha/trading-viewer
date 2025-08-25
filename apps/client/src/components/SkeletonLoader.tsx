import React from 'react'

export interface SkeletonLoaderProps {
  variant?: 'text' | 'rectangle' | 'circle' | 'chart' | 'table' | 'card' | 'list'
  width?: string | number
  height?: string | number
  lines?: number
  className?: string
  animate?: boolean
}

/**
 * Unified Skeleton Loader Component
 * - Multiple preset variants for common UI patterns
 * - Customizable dimensions
 * - Accessibility compliant
 * - Theme-aware animations
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width = '100%',
  height,
  lines = 1,
  className = '',
  animate = true,
}) => {
  const baseClasses = `bg-gray-200 dark:bg-gray-700 ${animate ? 'animate-pulse' : ''} ${className}`

  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'rounded'
      case 'rectangle':
        return 'rounded-md'
      case 'circle':
        return 'rounded-full'
      case 'chart':
        return 'rounded-lg'
      case 'table':
        return 'rounded'
      case 'card':
        return 'rounded-lg'
      case 'list':
        return 'rounded-md'
      default:
        return 'rounded'
    }
  }

  const getDefaultHeight = () => {
    if (height) return height

    switch (variant) {
      case 'text':
        return '1rem'
      case 'rectangle':
        return '8rem'
      case 'circle':
        return '3rem'
      case 'chart':
        return '20rem'
      case 'table':
        return '2.5rem'
      case 'card':
        return '12rem'
      case 'list':
        return '4rem'
      default:
        return '1rem'
    }
  }

  const getDefaultWidth = () => {
    if (width) return width

    switch (variant) {
      case 'circle':
        return '3rem'
      default:
        return '100%'
    }
  }

  const skeletonStyle = {
    width: getDefaultWidth(),
    height: getDefaultHeight(),
  }

  // Text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div className='space-y-2' role='status' aria-label='Loading content'>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              width: index === lines - 1 ? '75%' : '100%',
              height: getDefaultHeight(),
            }}
          />
        ))}
        <span className='sr-only'>Loading...</span>
      </div>
    )
  }

  // Chart variant with multiple elements
  if (variant === 'chart') {
    return (
      <div className='space-y-4' role='status' aria-label='Loading chart'>
        <div className='flex justify-between items-center'>
          <div className={`${baseClasses} rounded w-32 h-6`} />
          <div className={`${baseClasses} rounded w-24 h-8`} />
        </div>
        <div className={`${baseClasses} ${getVariantClasses()}`} style={skeletonStyle} />
        <div className='flex justify-center space-x-4'>
          <div className={`${baseClasses} rounded w-16 h-6`} />
          <div className={`${baseClasses} rounded w-16 h-6`} />
          <div className={`${baseClasses} rounded w-16 h-6`} />
        </div>
        <span className='sr-only'>Loading chart...</span>
      </div>
    )
  }

  // Table variant with rows
  if (variant === 'table') {
    return (
      <div className='space-y-2' role='status' aria-label='Loading table'>
        <div className='flex space-x-4'>
          <div className={`${baseClasses} rounded w-1/4 h-6`} />
          <div className={`${baseClasses} rounded w-1/4 h-6`} />
          <div className={`${baseClasses} rounded w-1/4 h-6`} />
          <div className={`${baseClasses} rounded w-1/4 h-6`} />
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className='flex space-x-4'>
            <div className={`${baseClasses} rounded w-1/4 h-10`} />
            <div className={`${baseClasses} rounded w-1/4 h-10`} />
            <div className={`${baseClasses} rounded w-1/4 h-10`} />
            <div className={`${baseClasses} rounded w-1/4 h-10`} />
          </div>
        ))}
        <span className='sr-only'>Loading table data...</span>
      </div>
    )
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div
        className={`${baseClasses} ${getVariantClasses()} p-4`}
        style={skeletonStyle}
        role='status'
        aria-label='Loading card'
      >
        <div className='space-y-3'>
          <div className='flex items-center space-x-3'>
            <div className='bg-gray-300 dark:bg-gray-600 rounded-full w-10 h-10' />
            <div className='flex-1 space-y-2'>
              <div className='bg-gray-300 dark:bg-gray-600 rounded w-3/4 h-4' />
              <div className='bg-gray-300 dark:bg-gray-600 rounded w-1/2 h-3' />
            </div>
          </div>
          <div className='bg-gray-300 dark:bg-gray-600 rounded w-full h-20' />
          <div className='space-y-2'>
            <div className='bg-gray-300 dark:bg-gray-600 rounded w-full h-3' />
            <div className='bg-gray-300 dark:bg-gray-600 rounded w-5/6 h-3' />
            <div className='bg-gray-300 dark:bg-gray-600 rounded w-4/6 h-3' />
          </div>
        </div>
        <span className='sr-only'>Loading card content...</span>
      </div>
    )
  }

  // List variant
  if (variant === 'list') {
    return (
      <div className='space-y-3' role='status' aria-label='Loading list'>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className='flex items-center space-x-3'>
            <div className={`${baseClasses} rounded-full w-12 h-12`} />
            <div className='flex-1 space-y-2'>
              <div className={`${baseClasses} rounded w-3/4 h-4`} />
              <div className={`${baseClasses} rounded w-1/2 h-3`} />
            </div>
            <div className={`${baseClasses} rounded w-16 h-6`} />
          </div>
        ))}
        <span className='sr-only'>Loading list items...</span>
      </div>
    )
  }

  // Default single element
  return (
    <div
      className={`${baseClasses} ${getVariantClasses()}`}
      style={skeletonStyle}
      role='status'
      aria-label={`Loading ${variant}`}
    >
      <span className='sr-only'>Loading...</span>
    </div>
  )
}

// Preset components for common patterns
export const TextSkeleton: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = props => (
  <SkeletonLoader variant='text' {...props} />
)

export const ChartSkeleton: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = props => (
  <SkeletonLoader variant='chart' {...props} />
)

export const TableSkeleton: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = props => (
  <SkeletonLoader variant='table' {...props} />
)

export const CardSkeleton: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = props => (
  <SkeletonLoader variant='card' {...props} />
)

export const ListSkeleton: React.FC<Omit<SkeletonLoaderProps, 'variant'>> = props => (
  <SkeletonLoader variant='list' {...props} />
)

export default SkeletonLoader
