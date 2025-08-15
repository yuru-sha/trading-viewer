import React from 'react'

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
