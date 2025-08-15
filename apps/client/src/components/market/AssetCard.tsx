import React, { useState } from 'react'

interface AssetCardProps {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  logo?: string
  volume?: number
  marketCap?: number
  onClick?: () => void
  showChart?: boolean
}

type ChartType = 'area' | 'candle'

// Generate mock chart data
const generateMockChartData = (changePercent: number) => {
  const points = 20
  const data = []
  let value = 100

  for (let i = 0; i < points; i++) {
    const trend = changePercent > 0 ? 0.02 : -0.02
    const volatility = (Math.random() - 0.5) * 0.05
    value *= 1 + trend + volatility
    data.push(value)
  }

  return data
}

// Simple SVG chart component
const MiniChart: React.FC<{ data: number[]; isPositive: boolean; type: ChartType }> = ({
  data,
  isPositive,
  type,
}) => {
  const width = 120
  const height = 40
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  if (type === 'area') {
    const pathData = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * width
        const y = height - ((value - min) / range) * height
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')

    const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`

    return (
      <svg width={width} height={height} className='overflow-visible'>
        <defs>
          <linearGradient
            id={`gradient-${isPositive ? 'green' : 'red'}`}
            x1='0'
            y1='0'
            x2='0'
            y2='1'
          >
            <stop offset='0%' stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
            <stop offset='100%' stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <path
          d={areaData}
          fill={`url(#gradient-${isPositive ? 'green' : 'red'})`}
          className='transition-all duration-300'
        />
        <path
          d={pathData}
          fill='none'
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth='1.5'
          className='transition-all duration-300'
        />
      </svg>
    )
  }

  // Candle chart (simplified as rectangles)
  const candleWidth = width / data.length - 1
  return (
    <svg width={width} height={height}>
      {data.map((value, index) => {
        const x = (index / data.length) * width
        const normalized = (value - min) / range
        const candleHeight = Math.max(normalized * height * 0.8, 2)
        const y = height - candleHeight

        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={candleWidth}
            height={candleHeight}
            fill={isPositive ? '#10b981' : '#ef4444'}
            className='transition-all duration-300'
          />
        )
      })}
    </svg>
  )
}

export const AssetCard: React.FC<AssetCardProps> = ({
  symbol,
  name,
  price,
  change,
  changePercent,
  logo,
  volume,
  marketCap,
  onClick,
  showChart = true,
}) => {
  const isPositive = changePercent >= 0
  const [chartType, setChartType] = useState<ChartType>('area')
  const chartData = generateMockChartData(changePercent)

  return (
    <div
      className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600 min-w-[240px]'
      onClick={onClick}
    >
      <div className='flex items-start space-x-3'>
        {/* Logo/Icon */}
        <div className='w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0'>
          {logo ? (
            <img src={logo} alt={symbol} className='w-6 h-6 rounded-full' />
          ) : (
            <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
              {symbol.charAt(0)}
            </span>
          )}
        </div>

        <div className='flex-1 min-w-0'>
          {/* Symbol and Name */}
          <div className='flex items-center space-x-2 mb-1'>
            <span className='font-medium text-gray-900 dark:text-white text-sm'>{symbol}</span>
          </div>
          <div className='text-xs text-gray-500 dark:text-gray-400 truncate mb-2'>{name}</div>

          {/* Price */}
          <div className='text-lg font-semibold text-gray-900 dark:text-white mb-1'>
            {price.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          {/* Change */}
          <div
            className={`text-sm font-medium ${
              isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {change.toFixed(2)} ({isPositive ? '+' : ''}
            {changePercent.toFixed(2)}%)
          </div>

          {/* Mini Chart */}
          {showChart && (
            <div className='mt-3'>
              <div className='flex items-center justify-between mb-1'>
                <div className='flex space-x-1'>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setChartType('area')
                    }}
                    className={`p-1 rounded text-xs transition-colors ${
                      chartType === 'area'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                    title='Area Chart'
                  >
                    📈
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setChartType('candle')
                    }}
                    className={`p-1 rounded text-xs transition-colors ${
                      chartType === 'candle'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                    title='Candle Chart'
                  >
                    📊
                  </button>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onClick?.()
                  }}
                  className='text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors'
                >
                  ⛶
                </button>
              </div>
              <div className='bg-gray-50 dark:bg-gray-800 rounded p-2'>
                <MiniChart data={chartData} isPositive={isPositive} type={chartType} />
              </div>
            </div>
          )}

          {/* Additional Info */}
          {(volume || marketCap) && (
            <div className='mt-2 text-xs text-gray-500 dark:text-gray-400'>
              {volume && <div>Vol: {volume.toLocaleString()}</div>}
              {marketCap && (
                <div>
                  Cap:{' '}
                  {marketCap > 1000000000
                    ? `${(marketCap / 1000000000).toFixed(1)}B`
                    : `${(marketCap / 1000000).toFixed(1)}M`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
