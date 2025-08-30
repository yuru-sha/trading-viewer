import React from 'react'

interface ChartLoadingStateProps {
  symbol: string
}

const ChartLoadingState: React.FC<ChartLoadingStateProps> = ({ symbol }) => {
  return (
    <div className='h-full flex items-center justify-center'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4'></div>
        <p className='text-gray-600 dark:text-gray-400'>Loading {symbol} chart...</p>
      </div>
    </div>
  )
}

export default ChartLoadingState
