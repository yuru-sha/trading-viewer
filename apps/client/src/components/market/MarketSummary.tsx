import React, { useState, useEffect } from 'react'
import { api } from '../../lib/apiClient'
import { MiniChart } from './MiniChart'

interface RankingItem {
  symbol: string
  shortName?: string
  longName?: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  marketCap?: number
  averageDailyVolume3Month?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
}

interface MarketIndex {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

interface EarningsEvent {
  symbol: string
  companyName: string
  date: string
  time: string
  type: 'Earnings' | 'Dividend'
  quarter: string
}

interface MarketSummaryProps {
  activeCategory: 'indices' | 'stocks' | 'crypto' | 'futures' | 'forex' | 'bonds' | 'etf'
}

export const MarketSummary: React.FC<MarketSummaryProps> = ({ activeCategory }) => {
  const [gainers, setGainers] = useState<RankingItem[]>([])
  const [losers, setLosers] = useState<RankingItem[]>([])
  const [mostActive, setMostActive] = useState<RankingItem[]>([])
  const [trending, setTrending] = useState<RankingItem[]>([])
  const [indices, setIndices] = useState<MarketIndex[]>([])
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [indicesLoading, setIndicesLoading] = useState(true)

  useEffect(() => {
    const fetchRankingData = async () => {
      try {
        setLoading(true)

        const [gainersRes, losersRes, activeRes, trendingRes] = await Promise.all([
          api.rankings.getGainers({ count: 6 }),
          api.rankings.getLosers({ count: 6 }),
          api.rankings.getMostActive({ count: 6 }),
          api.rankings.getTrending({ count: 6 }),
        ])

        setGainers(gainersRes.data.slice(0, 5))
        setLosers(losersRes.data)
        setMostActive(activeRes.data)
        setTrending(trendingRes.data)

        // Generate mock earnings data
        setEarnings([
          {
            symbol: 'AAPL',
            companyName: 'Apple Inc.',
            date: 'Today',
            time: 'After Market',
            type: 'Earnings',
            quarter: 'Q3 2024',
          },
          {
            symbol: 'GOOGL',
            companyName: 'Alphabet Inc.',
            date: 'Tomorrow',
            time: 'After Market',
            type: 'Earnings',
            quarter: 'Q3 2024',
          },
          {
            symbol: 'MSFT',
            companyName: 'Microsoft Corp.',
            date: 'Oct 24',
            time: 'After Market',
            type: 'Earnings',
            quarter: 'Q1 2025',
          },
          {
            symbol: 'TSLA',
            companyName: 'Tesla Inc.',
            date: 'Oct 25',
            time: 'After Market',
            type: 'Earnings',
            quarter: 'Q3 2024',
          },
        ])
      } catch {
        // Failed to fetch ranking data
      } finally {
        setLoading(false)
      }
    }

    fetchRankingData()
  }, [])

  useEffect(() => {
    const fetchIndicesData = async () => {
      try {
        setIndicesLoading(true)
        const indicesRes = await api.market.getIndices()
        setIndices(indicesRes.data)
      } catch {
        // Failed to fetch indices data
      } finally {
        setIndicesLoading(false)
      }
    }

    fetchIndicesData()
  }, [])

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(0)}K`
    }
    return volume.toString()
  }

  const RankingCard: React.FC<{
    title: string
    items: RankingItem[]
    type: 'gainers' | 'losers' | 'active' | 'trending'
    showViewAll?: boolean
  }> = ({ title, items, type, showViewAll = true }) => (
    <div className='bg-white dark:bg-gray-800 rounded-lg p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>{title}</h3>
        {showViewAll && (
          <button className='text-sm text-blue-600 dark:text-blue-400 hover:underline'>
            View All →
          </button>
        )}
      </div>

      {loading ? (
        <div className='space-y-3'>
          {Array.from({ length: type === 'gainers' ? 5 : 6 }).map((_, i) => (
            <div key={i} className='animate-pulse flex items-center space-x-3'>
              <div className='w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full'></div>
              <div className='flex-1 space-y-1'>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-24'></div>
                <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-16'></div>
              </div>
              <div className='text-right space-y-1'>
                <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-16'></div>
                <div className='h-3 bg-gray-200 dark:bg-gray-700 rounded w-12'></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className='space-y-3'>
          {items.map((item, index) => (
            <div
              key={item.symbol}
              className='flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer'
            >
              <div className='flex items-center space-x-3'>
                <div className='w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center'>
                  <span className='text-xs font-medium text-blue-600 dark:text-blue-300'>
                    {item.symbol.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className='text-sm font-medium text-gray-900 dark:text-white'>
                    {item.symbol}
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400'>
                    {type === 'active'
                      ? formatVolume(item.regularMarketVolume)
                      : item.shortName?.slice(0, 20)}
                  </div>
                </div>
              </div>

              <div className='text-right'>
                <div className='text-sm font-medium text-gray-900 dark:text-white'>
                  {formatPrice(item.regularMarketPrice)}
                </div>
                <div
                  className={`text-xs font-medium ${
                    item.regularMarketChangePercent >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {item.regularMarketChangePercent >= 0 ? '+' : ''}
                  {item.regularMarketChangePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className='space-y-8'>
      {/* Market Indices Section */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Major Indices</h2>
          <button className='text-sm text-blue-600 dark:text-blue-400 hover:underline'>
            View All →
          </button>
        </div>

        {indicesLoading ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className='animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg p-4 h-32'
              ></div>
            ))}
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {indices.slice(0, 4).map(index => (
              <div
                key={index.symbol}
                className='bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer'
              >
                <div className='flex items-center justify-between mb-2'>
                  <div className='text-sm font-medium text-gray-600 dark:text-gray-300'>
                    {index.name}
                  </div>
                  <div
                    className={`text-xs px-2 py-1 rounded ${
                      index.changePercent >= 0
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    {index.changePercent >= 0 ? '+' : ''}
                    {index.changePercent.toFixed(2)}%
                  </div>
                </div>

                <div className='mb-3'>
                  <div className='text-xl font-bold text-gray-900 dark:text-white'>
                    {index.price.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div
                    className={`text-sm ${
                      index.change >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {index.change >= 0 ? '+' : ''}
                    {index.change.toFixed(2)}
                  </div>
                </div>

                <div className='h-12'>
                  <MiniChart
                    symbol={index.symbol}
                    isPositive={index.changePercent >= 0}
                    width={120}
                    height={48}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rankings Section */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <RankingCard title='Most Active' items={mostActive} type='active' />
        <RankingCard title='Most Volatile' items={trending} type='trending' />
        <RankingCard title='Top Gainers' items={gainers} type='gainers' />
        <RankingCard title='Top Losers' items={losers} type='losers' />
      </div>

      {/* Earnings Calendar - TradingView Style */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>Earnings Calendar</h3>
          <button className='text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium'>
            View All →
          </button>
        </div>

        <div className='space-y-3'>
          {earnings.map((earning, index) => (
            <div
              key={index}
              className='flex items-center space-x-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer'
            >
              {/* Company Icon */}
              <div className='w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0'>
                <span className='text-white font-semibold text-sm'>{earning.symbol.charAt(0)}</span>
              </div>

              {/* Company Info */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center space-x-2 mb-1'>
                  <span className='font-semibold text-gray-900 dark:text-white text-sm'>
                    {earning.symbol}
                  </span>
                  <span className='px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded text-xs font-medium'>
                    {earning.type}
                  </span>
                </div>
                <div className='text-sm text-gray-600 dark:text-gray-400 truncate'>
                  {earning.companyName}
                </div>
              </div>

              {/* Quarter Info */}
              <div className='text-right flex-shrink-0'>
                <div className='text-sm font-medium text-gray-900 dark:text-white'>
                  {earning.quarter}
                </div>
                <div className='text-xs text-gray-500 dark:text-gray-400'>
                  {earning.date} • {earning.time}
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className='text-gray-400 dark:text-gray-500'>
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
          <button className='px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'>
            View More Earnings
          </button>
        </div>
      </div>

      {/* Market News */}
      <div className='bg-white dark:bg-gray-800 rounded-lg p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Market News</h3>
          <button className='text-sm text-blue-600 dark:text-blue-400 hover:underline'>
            Read More →
          </button>
        </div>

        <div className='space-y-4'>
          {[
            {
              title: 'Saudi Wealth Fund Sold Meta, Shopify, PayPal Stakes in Second Quarter',
              source: 'Reuters',
              time: '1 hour ago',
              logo: 'R',
            },
            {
              title: 'Dollar Extends Gains as September Fed Rate Cut Expectations Fade',
              source: 'FISCO',
              time: '2 hours ago',
              logo: 'F',
            },
            {
              title: 'NY Market Opens Higher as July PPI Beats Expectations Significantly',
              source: 'DZH Financial Research Inc',
              time: '4 hours ago',
              logo: 'D',
            },
          ].map((news, index) => (
            <div
              key={index}
              className='flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer'
            >
              <div className='flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400'>
                <div className='w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center'>
                  <span className='text-xs font-medium'>{news.logo}</span>
                </div>
                <span>{news.time}</span>
                <span>•</span>
                <span>{news.source}</span>
              </div>

              <div className='flex-1'>
                <div className='text-sm text-gray-900 dark:text-white line-clamp-2'>
                  {news.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
