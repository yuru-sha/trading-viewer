import React, { useEffect, useState } from 'react'
import { Loading } from '@trading-viewer/ui'
import { useApp, useAppActions } from '../contexts/AppContext'
import { api } from '../lib/apiClient'
import { useWebSocket } from '../hooks/useWebSocket'

const DashboardPage: React.FC = () => {
  const { state } = useApp()
  const { setError } = useAppActions()
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [apiInfo, setApiInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // WebSocket connection (use default URL from hook)
  const {
    isConnected,
    isConnecting,
    error: wsError,
  } = useWebSocket({
    autoConnect: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

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

        // Try to fetch API info
        try {
          const info = await api.info.getInfo()
          setApiInfo(info)
        } catch (err) {
          console.warn('API info fetch failed:', err)
          setApiInfo({
            name: 'TradingViewer API',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            endpoints: {
              market: '/api/market/*',
              health: '/health',
            },
          })
        }
      } catch (error) {
        console.error('Unexpected error in dashboard:', error)
        // Don't set error to prevent blocking the UI
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-900 flex justify-center items-center'>
        <Loading size='lg' text='Loading dashboard...' />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Trading Dashboard</h1>
          <p className='mt-2 text-gray-600 dark:text-gray-400'>
            Monitor market data and manage your trading activities
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* System Status */}
          <div className='lg:col-span-1'>
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
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
                          : isConnecting
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Disconnected'}
                    </span>
                  </div>

                  <div className='pt-2 border-t border-gray-700'>
                    <p className='text-xs text-gray-500'>
                      Last updated: {new Date(healthStatus.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Current Selection */}
            <div className='mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
                Current Selection
              </h3>

              {state.selectedSymbol ? (
                <div className='space-y-2'>
                  <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                    {state.selectedSymbol}
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    Timeframe: {state.timeframe}
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    Theme: {state.theme}
                  </div>
                </div>
              ) : (
                <p className='text-gray-600 dark:text-gray-400 text-sm'>
                  No symbol selected. Go to the search page to select a symbol.
                </p>
              )}
            </div>

            {/* Navigation Actions */}
            <div className='mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>Navigation</h3>

              <div className='space-y-3'>
                <a
                  href='/charts'
                  className='flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                >
                  <svg
                    className='w-5 h-5 text-green-500 mr-3'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                    />
                  </svg>
                  <div className='text-left'>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>View Charts</p>
                    <p className='text-xs text-gray-600 dark:text-gray-400'>
                      Analyze market data with real-time charts
                    </p>
                  </div>
                </a>

                <a
                  href='/search'
                  className='flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                >
                  <svg
                    className='w-5 h-5 text-blue-500 mr-3'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                    />
                  </svg>
                  <div className='text-left'>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>
                      Search Symbols
                    </p>
                    <p className='text-xs text-gray-600 dark:text-gray-400'>
                      Find trading instruments
                    </p>
                  </div>
                </a>

                <a
                  href='/watchlist'
                  className='flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                >
                  <svg
                    className='w-5 h-5 text-red-500 mr-3'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
                    />
                  </svg>
                  <div className='text-left'>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>
                      My Watchlist
                    </p>
                    <p className='text-xs text-gray-600 dark:text-gray-400'>
                      Manage your tracked symbols
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className='lg:col-span-2'>
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
                API Information
              </h3>

              {apiInfo && (
                <div className='space-y-4'>
                  <div>
                    <dt className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                      Service Name
                    </dt>
                    <dd className='mt-1 text-sm text-gray-900 dark:text-white'>{apiInfo.name}</dd>
                  </div>

                  <div>
                    <dt className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                      Version
                    </dt>
                    <dd className='mt-1 text-sm text-gray-900 dark:text-white'>
                      {apiInfo.version}
                    </dd>
                  </div>

                  <div>
                    <dt className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                      Available Endpoints
                    </dt>
                    <dd className='mt-1'>
                      <div className='bg-gray-100 dark:bg-gray-700 rounded-md p-3'>
                        <pre className='text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap'>
                          {JSON.stringify(apiInfo.endpoints, null, 2)}
                        </pre>
                      </div>
                    </dd>
                  </div>
                </div>
              )}
            </div>

            {/* Market Overview */}
            <div className='mt-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
              <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
                Market Overview
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='p-4 bg-gray-100 dark:bg-gray-700 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>S&P 500</p>
                      <p className='text-lg font-bold text-green-600 dark:text-green-400'>
                        4,567.89
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>+1.23%</p>
                      <p className='text-xs text-green-600 dark:text-green-400'>+55.43</p>
                    </div>
                  </div>
                </div>

                <div className='p-4 bg-gray-100 dark:bg-gray-700 rounded-lg'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>NASDAQ</p>
                      <p className='text-lg font-bold text-red-600 dark:text-red-400'>15,234.56</p>
                    </div>
                    <div className='text-right'>
                      <p className='text-xs text-gray-600 dark:text-gray-400'>-0.45%</p>
                      <p className='text-xs text-red-600 dark:text-red-400'>-68.79</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className='mt-4 text-center'>
                <a
                  href='/charts'
                  className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors'
                >
                  View Full Market Data
                  <svg
                    className='ml-2 w-4 h-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 7l5 5m0 0l-5 5m5-5H6'
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
