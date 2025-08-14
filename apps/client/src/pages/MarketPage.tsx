import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '@trading-viewer/ui'
import { useApp, useAppActions } from '../contexts/AppContext'
import { api } from '../lib/apiClient'
import { useWebSocket } from '../hooks/useWebSocket'

interface MarketData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
}

const MarketPage: React.FC = () => {
  const { state } = useApp()
  const { setError } = useAppActions()
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [dataSource, setDataSource] = useState<any>(null)
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Major market symbols to display
  const majorSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA']

  // WebSocket for real-time updates
  const { isConnected, lastQuote } = useWebSocket({
    autoConnect: true,
  })

  const getCompanyName = (symbol: string): string => {
    const companies = {
      AAPL: 'Apple Inc.',
      GOOGL: 'Alphabet Inc.',
      MSFT: 'Microsoft Corporation',
      TSLA: 'Tesla, Inc.',
      AMZN: 'Amazon.com Inc.',
      NVDA: 'NVIDIA Corporation',
    }
    return companies[symbol as keyof typeof companies] || symbol
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch data source info
        const dataSourceInfo = await api.market.getDataSource()
        setDataSource(dataSourceInfo)

        // Try to fetch health status
        try {
          const health = await api.health.check()
          setHealthStatus(health)
        } catch (err) {
          console.warn('Health check failed:', err)
          setHealthStatus({
            status: 'error',
            database: 'unknown',
            timestamp: new Date().toISOString(),
          })
        }

        // Fetch quotes for major symbols
        const quotes = await Promise.all(
          majorSymbols.map(async (symbol) => {
            try {
              const quote = await api.market.getQuote(symbol)
              return {
                symbol,
                name: getCompanyName(symbol),
                price: quote.c,
                change: quote.d,
                changePercent: quote.dp,
                high: quote.h,
                low: quote.l,
              }
            } catch (err) {
              console.warn(`Failed to fetch quote for ${symbol}:`, err)
              return null
            }
          })
        )

        const validQuotes = quotes.filter(Boolean) as MarketData[]
        setMarketData(validQuotes)
      } catch (error) {
        console.error('Failed to fetch market data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load market data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // Remove setError dependency

  // Update market data with WebSocket quotes
  useEffect(() => {
    if (lastQuote && lastQuote.symbol) {
      setMarketData(prev => 
        prev.map(item => 
          item.symbol === lastQuote.symbol 
            ? {
                ...item,
                price: lastQuote.data.c,
                change: lastQuote.data.d,
                changePercent: lastQuote.data.dp,
                high: lastQuote.data.h,
                low: lastQuote.data.l,
              }
            : item
        )
      )
    }
  }, [lastQuote])

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center'>
        <Loading size='lg' text='Loading market data...' />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Market Dashboard</h1>
          <div className='mt-2 flex items-center space-x-4'>
            <p className='text-gray-600 dark:text-gray-400'>
              Real-time market data and top performing stocks
            </p>
            {dataSource && (
              <div className='flex items-center space-x-2'>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className='text-xs text-gray-500'>
                  {dataSource.description} {isConnected ? '(Live)' : '(Disconnected)'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
          {/* Market Data - Main Content */}
          <div className='lg:col-span-3'>
            {/* Top Stocks Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8'>
              {marketData.map((stock) => (
                <Link
                  key={stock.symbol}
                  to={`/charts?symbol=${stock.symbol}`}
                  className='block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6'
                >
                  <div className='flex items-center justify-between mb-2'>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                      {stock.symbol}
                    </h3>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      stock.change >= 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                  
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                    {stock.name}
                  </p>
                  
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-2xl font-bold text-gray-900 dark:text-white'>
                        ${stock.price.toFixed(2)}
                      </span>
                      <span className={`text-sm font-medium ${
                        stock.change >= 0 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className='flex justify-between text-xs text-gray-500'>
                      <span>H: ${stock.high.toFixed(2)}</span>
                      <span>L: ${stock.low.toFixed(2)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <Link
                to='/search'
                className='bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 text-center transition-colors'
              >
                <div className='text-3xl mb-3'>🔍</div>
                <h3 className='text-lg font-semibold mb-2'>Search Symbols</h3>
                <p className='text-sm text-blue-100'>
                  Find and explore trading instruments
                </p>
              </Link>

              <Link
                to='/watchlist'
                className='bg-green-600 hover:bg-green-700 text-white rounded-lg p-6 text-center transition-colors'
              >
                <div className='text-3xl mb-3'>❤️</div>
                <h3 className='text-lg font-semibold mb-2'>My Watchlist</h3>
                <p className='text-sm text-green-100'>
                  Track your favorite symbols
                </p>
              </Link>

              <Link
                to='/charts'
                className='bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-6 text-center transition-colors'
              >
                <div className='text-3xl mb-3'>📊</div>
                <h3 className='text-lg font-semibold mb-2'>Advanced Charts</h3>
                <p className='text-sm text-purple-100'>
                  Full-featured charting tools
                </p>
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div className='lg:col-span-1'>
            {/* System Status */}
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
                System Status
              </h3>

              {healthStatus && (
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Server</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        healthStatus.status === 'ok'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {healthStatus.status === 'ok' ? 'OK' : healthStatus.status}
                    </span>
                  </div>

                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>Database</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        healthStatus.database === 'connected'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {healthStatus.database === 'connected' ? 'Connected' : healthStatus.database}
                    </span>
                  </div>

                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-gray-600 dark:text-gray-400'>WebSocket</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isConnected
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
                    <p className='text-xs text-gray-500'>
                      Last updated: {new Date(healthStatus.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Current Selection */}
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
                Current Selection
              </h3>

              {state.selectedSymbol ? (
                <div className='space-y-2'>
                  <div className='text-xl font-bold text-blue-600 dark:text-blue-400'>
                    {state.selectedSymbol}
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    Timeframe: {state.timeframe}
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    Theme: {state.theme}
                  </div>
                  <Link
                    to={`/charts?symbol=${state.selectedSymbol}`}
                    className='inline-flex items-center mt-3 px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700'
                  >
                    View Chart
                  </Link>
                </div>
              ) : (
                <p className='text-gray-600 dark:text-gray-400 text-sm'>
                  No symbol selected. Click on any stock above to view its chart.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className='mt-8 text-center text-sm text-gray-500'>
          <p>Market data updates every 5 seconds • Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  )
}

export default MarketPage
