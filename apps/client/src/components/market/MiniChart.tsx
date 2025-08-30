import React from 'react'

interface MiniChartProps {
  symbol: string
  data?: number[]
  isPositive?: boolean
  width?: number
  height?: number
}

export const MiniChart: React.FC<MiniChartProps> = ({
  symbol,
  data,
  isPositive = true,
  width = 120,
  height = 40,
}) => {
  // Generate mock chart data if not provided
  const chartData =
    data ||
    Array.from({ length: 20 }, (_, i) => {
      const baseValue = 100
      const trend = isPositive ? 0.5 : -0.5
      const noise = (Math.random() - 0.5) * 2
      return baseValue + i * trend + noise
    })

  // Calculate SVG path
  const createPath = (points: number[]) => {
    if (points.length === 0) return ''

    const minValue = Math.min(...points)
    const maxValue = Math.max(...points)
    const range = maxValue - minValue || 1

    const pathPoints = points.map((value, index) => {
      const x = (index / (points.length - 1)) * width
      const y = height - ((value - minValue) / range) * height
      return `${x},${y}`
    })

    return `M ${pathPoints.join(' L ')}`
  }

  const pathD = createPath(chartData)
  const strokeColor = isPositive ? '#10b981' : '#ef4444' // green or red

  return (
    <div className='flex items-center justify-center'>
      <svg
        width={width}
        height={height}
        className='overflow-visible'
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Chart line */}
        <path
          d={pathD}
          fill='none'
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap='round'
          strokeLinejoin='round'
        />

        {/* Fill area under the curve */}
        <defs>
          <linearGradient id={`gradient-${symbol}`} x1='0%' y1='0%' x2='0%' y2='100%'>
            <stop offset='0%' stopColor={strokeColor} stopOpacity='0.2' />
            <stop offset='100%' stopColor={strokeColor} stopOpacity='0.05' />
          </linearGradient>
        </defs>

        <path
          d={`${pathD} L ${width},${height} L 0,${height} Z`}
          fill={`url(#gradient-${symbol})`}
        />
      </svg>
    </div>
  )
}
