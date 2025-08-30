import React from 'react'
import { Button } from '@trading-viewer/ui'

interface ChartErrorStateProps {
  symbol: string
  onRetry: () => void
}

const ChartErrorState: React.FC<ChartErrorStateProps> = ({ symbol, onRetry }) => {
  return (
    <div className='h-full flex items-center justify-center'>
      <div className='text-center'>
        <div className='bg-gray-100 dark:bg-gray-800 rounded-full p-6 mx-auto w-16 h-16 mb-4'>
          <svg
            className='w-4 h-4 mx-auto text-gray-400'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
            />
          </svg>
        </div>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>No Chart Data</h3>
        <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
          Unable to load chart data for {symbol}
        </p>
        <Button variant='primary' onClick={onRetry} className='text-sm' disabled={false}>
          Try Again
        </Button>
      </div>
    </div>
  )
}

export default ChartErrorState
