import React from 'react'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
  className?: string
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text = 'Loading...',
  fullScreen = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const spinner = (
    <div
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400 ${sizeClasses[size]}`}
    />
  )

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      {spinner}
      {text && (
        <p className={`text-gray-600 dark:text-gray-400 ${textSizeClasses[size]}`}>{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className='fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-50'>
        {content}
      </div>
    )
  }

  return content
}

// Skeleton loading component for UI placeholders
interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  rounded?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  className = '',
  rounded = false,
}) => {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  return (
    <div
      style={style}
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${
        rounded ? 'rounded-full' : 'rounded'
      } ${className}`}
    />
  )
}

// Loading overlay for buttons
interface LoadingButtonProps {
  loading: boolean
  children: React.ReactNode
  disabled?: boolean
  className?: string
  onClick?: () => void
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  disabled = false,
  className = '',
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center ${className} ${
        loading || disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='w-4 h-4 animate-spin rounded-full border-2 border-transparent border-t-current' />
        </div>
      )}
      <span className={loading ? 'invisible' : 'visible'}>{children}</span>
    </button>
  )
}

export default Loading
