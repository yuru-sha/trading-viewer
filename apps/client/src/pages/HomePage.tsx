import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@trading-viewer/ui'
import { useApp } from '../contexts/AppContext'

const HomePage: React.FC = () => {
  const { state } = useApp()

  const features = [
    {
      name: 'Real-time Charts',
      description: 'View live market data with interactive charting tools',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
          />
        </svg>
      ),
    },
    {
      name: 'Symbol Search',
      description: 'Find and analyze any stock, crypto, or forex symbol',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
          />
        </svg>
      ),
    },
    {
      name: 'Technical Analysis',
      description: 'Advanced indicators and drawing tools for market analysis',
      icon: (
        <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
      ),
    },
  ]

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
      {/* Hero Section */}
      <div className='text-center mb-16'>
        <h1 className='text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6'>
          <span className='block'>Professional</span>
          <span className='block text-blue-600 dark:text-blue-400'>Trading Charts</span>
        </h1>

        <p className='max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl'>
          Advanced charting platform with real-time market data, technical indicators, and intuitive
          analysis tools for traders and investors.
        </p>

        <div className='max-w-md mx-auto mt-8 sm:flex sm:justify-center md:mt-12'>
          <div className='rounded-md shadow'>
            <Link to='/dashboard'>
              <Button variant='primary' size='lg' className='w-full'>
                Start Trading
              </Button>
            </Link>
          </div>
          <div className='mt-3 rounded-md shadow sm:mt-0 sm:ml-3'>
            <Link to='/charts'>
              <Button variant='secondary' size='lg' className='w-full'>
                View Charts
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className='mb-16'>
        <div className='max-w-4xl mx-auto'>
          <h2 className='text-3xl font-extrabold text-gray-900 dark:text-white text-center mb-12'>
            Everything you need for trading
          </h2>

          <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3'>
            {features.map((feature, index) => (
              <div
                key={index}
                className='bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow'
              >
                <div className='flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-md mb-4'>
                  <div className='text-blue-600 dark:text-blue-400'>{feature.icon}</div>
                </div>

                <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
                  {feature.name}
                </h3>

                <p className='text-gray-500 dark:text-gray-400'>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Status */}
      {state.selectedSymbol && (
        <div className='bg-blue-50 dark:bg-blue-900 rounded-lg p-6 text-center'>
          <h3 className='text-lg font-medium text-blue-900 dark:text-blue-100 mb-2'>
            Currently Viewing
          </h3>
          <p className='text-2xl font-bold text-blue-700 dark:text-blue-300'>
            {state.selectedSymbol} • {state.timeframe}
          </p>
          <Link to='/charts' className='mt-4 inline-block'>
            <Button variant='primary'>View Chart</Button>
          </Link>
        </div>
      )}
    </div>
  )
}

export default HomePage
