import React from 'react'
import { NewsItem } from '@trading-viewer/shared'
import { NewsCard } from './NewsCard'
import { Loading } from '@trading-viewer/ui'

interface NewsListProps {
  news: NewsItem[]
  loading?: boolean
  error?: string | null
  compact?: boolean
  title?: string
  showLoadMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
}

export const NewsList: React.FC<NewsListProps> = ({
  news,
  loading = false,
  error = null,
  compact = false,
  title = 'Market News',
  showLoadMore = false,
  onLoadMore,
  loadingMore = false,
}) => {
  if (loading && news.length === 0) {
    return (
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>{title}</h2>
        <div className='flex items-center justify-center py-12'>
          <Loading size='large' />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>{title}</h2>
        <div className='text-center py-12'>
          <div className='text-red-500 dark:text-red-400 mb-2'>
            <svg
              className='w-12 h-12 mx-auto mb-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
            Failed to Load News
          </h3>
          <p className='text-gray-500 dark:text-gray-400'>{error}</p>
        </div>
      </div>
    )
  }

  if (news.length === 0) {
    return (
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>{title}</h2>
        <div className='text-center py-12'>
          <div className='text-gray-400 dark:text-gray-500 mb-2'>
            <svg
              className='w-12 h-12 mx-auto mb-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
            No News Available
          </h3>
          <p className='text-gray-500 dark:text-gray-400'>
            There are no news articles available at the moment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>{title}</h2>
        {news.length > 0 && (
          <span className='text-sm text-gray-500 dark:text-gray-400'>
            {news.length} article{news.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div
        className={
          compact
            ? 'space-y-0 divide-y divide-gray-200 dark:divide-gray-700'
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        }
      >
        {news.map(article => (
          <NewsCard key={article.uuid} news={article} compact={compact} />
        ))}
      </div>

      {showLoadMore && onLoadMore && (
        <div className='text-center pt-6'>
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className='inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {loadingMore ? (
              <>
                <Loading size='small' />
                <span className='ml-2'>Loading...</span>
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
