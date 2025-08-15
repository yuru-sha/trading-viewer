import React from 'react'
import { NewsItem } from '@trading-viewer/shared'

interface NewsCardProps {
  news: NewsItem
  compact?: boolean
}

export const NewsCard: React.FC<NewsCardProps> = ({ news, compact = false }) => {
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  const getThumbnail = () => {
    if (news.thumbnail?.resolutions && news.thumbnail.resolutions.length > 0) {
      // Use the smallest resolution for compact mode, medium for regular
      const resolution = compact
        ? news.thumbnail.resolutions[0]
        : news.thumbnail.resolutions[Math.floor(news.thumbnail.resolutions.length / 2)] ||
          news.thumbnail.resolutions[0]
      return resolution.url
    }
    return null
  }

  const thumbnailUrl = getThumbnail()

  if (compact) {
    return (
      <div className='flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'>
        {thumbnailUrl && (
          <div className='flex-shrink-0'>
            <img
              src={thumbnailUrl}
              alt=''
              className='w-16 h-12 object-cover rounded'
              onError={e => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
        )}
        <div className='flex-1 min-w-0'>
          <a href={news.link} target='_blank' rel='noopener noreferrer' className='block group'>
            <h3 className='text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
              {news.title}
            </h3>
            <div className='flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400'>
              <span>{news.publisher}</span>
              <span>•</span>
              <span>{formatTimestamp(news.providerPublishTime)}</span>
            </div>
            {news.relatedTickers && news.relatedTickers.length > 0 && (
              <div className='flex gap-1 mt-1'>
                {news.relatedTickers.slice(0, 3).map((ticker, index) => (
                  <span
                    key={index}
                    className='inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  >
                    {ticker}
                  </span>
                ))}
              </div>
            )}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden'>
      {thumbnailUrl && (
        <div className='aspect-video w-full overflow-hidden'>
          <img
            src={thumbnailUrl}
            alt=''
            className='w-full h-full object-cover hover:scale-105 transition-transform duration-300'
            onError={e => {
              const target = e.target as HTMLImageElement
              target.parentElement!.style.display = 'none'
            }}
          />
        </div>
      )}
      <div className='p-4'>
        <a href={news.link} target='_blank' rel='noopener noreferrer' className='block group'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white line-clamp-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
            {news.title}
          </h3>
        </a>

        <div className='flex items-center justify-between mt-3'>
          <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
            <span className='font-medium'>{news.publisher}</span>
            <span>•</span>
            <span>{formatTimestamp(news.providerPublishTime)}</span>
          </div>

          {news.relatedTickers && news.relatedTickers.length > 0 && (
            <div className='flex gap-1'>
              {news.relatedTickers.slice(0, 5).map((ticker, index) => (
                <span
                  key={index}
                  className='inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                >
                  {ticker}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
