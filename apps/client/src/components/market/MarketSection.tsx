import React from 'react'

interface MarketSectionProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  showViewAll?: boolean
  onViewAll?: () => void
}

export const MarketSection: React.FC<MarketSectionProps> = ({
  title,
  subtitle,
  children,
  className = '',
  showViewAll = false,
  onViewAll
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            View all →
          </button>
        )}
      </div>
      {children}
    </div>
  )
}