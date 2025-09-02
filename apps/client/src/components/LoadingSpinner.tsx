import React from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text = 'Loading...',
  className = '',
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div
        className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}
      />
      {text && <p className='mt-4 text-sm text-gray-600 dark:text-gray-400'>{text}</p>}
    </div>
  )
}

// Suspense用の軽量なローディングコンポーネント
export const PageLoader: React.FC = () => (
  <div className='flex min-h-[400px] items-center justify-center'>
    <LoadingSpinner text='ページを読み込み中...' />
  </div>
)

// チャート専用のローディングコンポーネント（より適切なメッセージ）
export const ChartLoader: React.FC = () => (
  <div className='flex min-h-[600px] items-center justify-center'>
    <LoadingSpinner size='large' text='チャートコンポーネントを読み込み中...' />
  </div>
)

// 管理画面用のローディングコンポーネント
export const AdminLoader: React.FC = () => (
  <div className='flex min-h-[400px] items-center justify-center'>
    <LoadingSpinner text='管理画面を読み込み中...' />
  </div>
)
