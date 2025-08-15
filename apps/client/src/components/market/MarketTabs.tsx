import React from 'react'

export type MarketCategory = 'indices' | 'stocks' | 'crypto' | 'futures' | 'forex' | 'bonds' | 'etf'

interface MarketTabsProps {
  activeCategory: MarketCategory
  onCategoryChange: (category: MarketCategory) => void
}

export const MarketTabs: React.FC<MarketTabsProps> = ({
  activeCategory,
  onCategoryChange,
}) => {
  const tabs: { key: MarketCategory; label: string; icon: string }[] = [
    { key: 'indices', label: 'Indices', icon: '📈' },
    { key: 'stocks', label: 'Stocks', icon: '📊' },
    { key: 'crypto', label: 'Crypto', icon: '₿' },
    { key: 'futures', label: 'Futures', icon: '⏰' },
    { key: 'forex', label: 'Forex', icon: '💱' },
    { key: 'bonds', label: 'Bonds', icon: '📝' },
    { key: 'etf', label: 'ETF', icon: '📦' },
  ]

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
      <nav className="flex space-x-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onCategoryChange(tab.key)}
            className={`
              flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
              ${
                activeCategory === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}