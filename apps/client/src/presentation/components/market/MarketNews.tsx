import React from 'react'
import type { NewsItem, NewsCategory } from '@trading-viewer/shared'
import { getMockNewsItems } from '@/infrastructure/utils/mockNewsData'

interface MarketNewsProps {
  className?: string
  category?: NewsCategory
}

export const MarketNews: React.FC<MarketNewsProps> = ({ className = '', category = 'general' }) => {
  const [newsItems, setNewsItems] = React.useState<NewsItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch news from API
  React.useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetching news for category
        const response = await fetch(`/api/news/${category}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch news: ${response.statusText}`)
        }

        const result = await response.json()

        if (result.success && result.data) {
          setNewsItems(result.data)
          // News articles loaded successfully
        } else {
          throw new Error('No news data received')
        }
      } catch (err) {
        // Failed to fetch news, using fallback
        setError(err instanceof Error ? err.message : 'Failed to load news')
        // Fallback to mock data
        setNewsItems(getMockNewsItems(category))
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [category])

  const handleNewsClick = (newsItem: NewsItem) => {
    const url = newsItem.link
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const formatTime = (time: string) => {
    try {
      const date = new Date(time)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / (1000 * 60))
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (minutes < 60) {
        return `${minutes} min ago`
      } else if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`
      } else {
        return `${days} day${days > 1 ? 's' : ''} ago`
      }
    } catch {
      return time
    }
  }

  return (
    <div
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}
    >
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
          📰 Market News {loading && <span className='text-sm text-gray-500 ml-2'>Loading...</span>}
        </h2>
        <button className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors'>
          View All →
        </button>
      </div>

      {error && (
        <div className='mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg'>
          <p className='text-sm text-yellow-800 dark:text-yellow-200'>
            ⚠️ Using fallback data: {error}
          </p>
        </div>
      )}

      <div className='space-y-4'>
        {newsItems.map(newsItem => (
          <div
            key={newsItem.uuid}
            onClick={() => handleNewsClick(newsItem)}
            className='flex items-start space-x-4 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group'
          >
            {/* News Source Icon */}
            <div className='flex-shrink-0'>
              <div className='w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center'>
                <span className='text-white font-semibold text-sm'>{newsItem.logo}</span>
              </div>
            </div>

            {/* News Content */}
            <div className='flex-1 min-w-0'>
              <div className='flex items-center space-x-2 mb-2'>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  {formatTime(newsItem.time)}
                </span>
                <span className='text-xs text-gray-300 dark:text-gray-600'>•</span>
                <span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>
                  {newsItem.publisher}
                </span>
              </div>

              <h3 className='text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
                {newsItem.title}
              </h3>
            </div>

            {/* Arrow Indicator */}
            <div className='flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* View More Button */}
      <div className='mt-6 text-center'>
        <button className='px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
          More Market News
        </button>
      </div>
    </div>
  )
}
