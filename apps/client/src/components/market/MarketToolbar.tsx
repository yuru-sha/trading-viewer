import React from 'react'

export type MarketSection = 'market-summary' | 'stocks' | 'crypto' | 'futures' | 'forex' | 'economic-indicators' | 'brokers'

interface MarketToolbarProps {
  activeSection: MarketSection
  onSectionChange: (section: MarketSection) => void
}

export const MarketToolbar: React.FC<MarketToolbarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const sections: { key: MarketSection; label: string }[] = [
    { key: 'market-summary', label: 'Market Summary' },
    { key: 'stocks', label: 'Stocks' },
    { key: 'crypto', label: 'Crypto' },
    { key: 'futures', label: 'Futures' },
    { key: 'forex', label: 'Forex' },
    { key: 'economic-indicators', label: 'Economic Indicators' },
    { key: 'brokers', label: 'Brokers' },
  ]

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleSectionClick = (section: MarketSection) => {
    onSectionChange(section)
    scrollToSection(section)
  }

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            {sections.map((section) => (
              <button
                key={section.key}
                onClick={() => handleSectionClick(section.key)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                  activeSection === section.key
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}