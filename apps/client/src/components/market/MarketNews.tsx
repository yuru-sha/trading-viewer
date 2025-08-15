import React from 'react'

interface NewsItem {
  title: string
  source: string
  time: string
  logo: string
  url?: string
  uuid?: string
  publisher?: string
  link?: string
}

interface MarketNewsProps {
  className?: string
  category?: 'japan' | 'world' | 'crypto' | 'general'
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
        
        console.log(`🗞️ Fetching news for category: ${category}`)
        const response = await fetch(`/api/news/${category}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch news: ${response.statusText}`)
        }
        
        const result = await response.json()
        
        if (result.success && result.data) {
          setNewsItems(result.data)
          console.log(`✅ Loaded ${result.data.length} news articles for ${category}`)
        } else {
          throw new Error('No news data received')
        }
        
      } catch (err) {
        console.error('Failed to fetch news:', err)
        setError(err instanceof Error ? err.message : 'Failed to load news')
        // Fallback to mock data
        setNewsItems(getMockNewsItems())
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [category])

  // Mock news data as fallback
  const getMockNewsItems = (): NewsItem[] => {
    switch (category) {
      case 'japan':
        return [
          {
            title: 'Bank of Japan Maintains Ultra-Low Interest Rates Despite Inflation Pressures',
            source: 'Nikkei',
            time: '30 min ago',
            logo: 'N'
          },
          {
            title: 'Toyota Reports Record Q3 Earnings on Strong Hybrid Vehicle Sales',
            source: 'Reuters',
            time: '1 hour ago',
            logo: 'R'
          },
          {
            title: 'SoftBank Vision Fund Posts First Profit in Six Quarters',
            source: 'Bloomberg',
            time: '2 hours ago',
            logo: 'B'
          },
          {
            title: 'Japanese Semiconductor Stocks Surge on TSMC Expansion Plans',
            source: 'Nikkei',
            time: '3 hours ago',
            logo: 'N'
          },
          {
            title: 'Sony Raises Full-Year Forecast on PlayStation 5 Strong Sales',
            source: 'Financial Times',
            time: '4 hours ago',
            logo: 'FT'
          },
          {
            title: 'Yen Weakens to 150 Against Dollar as BOJ Keeps Policy Unchanged',
            source: 'Reuters',
            time: '5 hours ago',
            logo: 'R'
          }
        ]
      case 'world':
        return [
          {
            title: 'Apple Unveils AI Strategy, Stock Jumps 5% in After-Hours Trading',
            source: 'CNBC',
            time: '30 min ago',
            logo: 'C'
          },
          {
            title: 'Microsoft Beats Earnings Estimates on Cloud Growth Acceleration',
            source: 'Bloomberg',
            time: '1 hour ago',
            logo: 'B'
          },
          {
            title: 'Tesla Announces New Gigafactory in Mexico, Production to Start 2025',
            source: 'Reuters',
            time: '2 hours ago',
            logo: 'R'
          },
          {
            title: 'NVIDIA Becomes First Chipmaker to Reach $1.5 Trillion Market Cap',
            source: 'Financial Times',
            time: '3 hours ago',
            logo: 'FT'
          },
          {
            title: 'Amazon Prime Day Sales Hit Record $12.7 Billion',
            source: 'MarketWatch',
            time: '4 hours ago',
            logo: 'MW'
          },
          {
            title: 'Meta Platforms Announces $40B Share Buyback Program',
            source: 'CNBC',
            time: '5 hours ago',
            logo: 'C'
          }
        ]
      case 'crypto':
        return [
          {
            title: 'Bitcoin Surges Past $45,000 on ETF Approval Speculation',
            source: 'CoinDesk',
            time: '30 min ago',
            logo: 'CD'
          },
          {
            title: 'Ethereum Upgrade "Dencun" Successfully Deployed on Mainnet',
            source: 'CoinTelegraph',
            time: '1 hour ago',
            logo: 'CT'
          },
          {
            title: 'SEC Files Lawsuit Against Major Crypto Exchange for Securities Violations',
            source: 'Reuters',
            time: '2 hours ago',
            logo: 'R'
          },
          {
            title: 'MicroStrategy Purchases Additional 5,000 Bitcoin',
            source: 'Bloomberg',
            time: '3 hours ago',
            logo: 'B'
          },
          {
            title: 'Solana Network Outage Resolved After 5 Hours of Downtime',
            source: 'CoinDesk',
            time: '4 hours ago',
            logo: 'CD'
          },
          {
            title: 'Major Banks Launch Blockchain-Based Cross-Border Payment System',
            source: 'Financial Times',
            time: '5 hours ago',
            logo: 'FT'
          }
        ]
      default:
        return [
          {
            title: 'Fed Minutes Show Officials Debated Pace of Rate Cuts Amid Economic Uncertainty',
            source: 'Reuters',
            time: '30 min ago',
            logo: 'R'
          },
          {
            title: 'Tech Stocks Rally as AI Earnings Beat Expectations Across Major Players',
            source: 'Bloomberg',
            time: '1 hour ago',
            logo: 'B'
          },
          {
            title: 'Oil Prices Surge 3% on Middle East Supply Concerns and OPEC+ Production Cuts',
            source: 'CNBC',
            time: '2 hours ago',
            logo: 'C'
          },
          {
            title: 'Dollar Strengthens Against Major Currencies as Bond Yields Continue to Rise',
            source: 'Financial Times',
            time: '3 hours ago',
            logo: 'FT'
          },
          {
            title: 'Crypto Market Sees $2B Inflow as Bitcoin ETF Approval Hopes Rise',
            source: 'CoinDesk',
            time: '4 hours ago',
            logo: 'CD'
          },
          {
            title: 'European Markets Open Higher on Strong Manufacturing Data from Germany',
            source: 'MarketWatch',
            time: '5 hours ago',
            logo: 'MW'
          }
        ]
    }
  }

  const handleNewsClick = (newsItem: NewsItem) => {
    const url = newsItem.link || newsItem.url
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      // In real app, navigate to full article
      console.log('Navigate to news:', newsItem.title)
    }
  }

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          📰 Market News {loading && <span className="text-sm text-gray-500 ml-2">Loading...</span>}
        </h2>
        <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
          View All →
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Using fallback data: {error}
          </p>
        </div>
      )}
      
      <div className="space-y-4">
        {newsItems.map((newsItem, index) => (
          <div
            key={index}
            onClick={() => handleNewsClick(newsItem)}
            className="flex items-start space-x-4 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
          >
            {/* News Source Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {newsItem.logo}
                </span>
              </div>
            </div>
            
            {/* News Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {newsItem.time}
                </span>
                <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {newsItem.source}
                </span>
              </div>
              
              <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {newsItem.title}
              </h3>
            </div>
            
            {/* Arrow Indicator */}
            <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
      
      {/* View More Button */}
      <div className="mt-6 text-center">
        <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          More Market News
        </button>
      </div>
    </div>
  )
}