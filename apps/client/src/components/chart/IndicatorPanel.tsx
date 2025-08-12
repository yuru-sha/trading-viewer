import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
} from 'recharts'
import {
  calculateRSI,
  calculateMACD,
  calculateSMA,
  calculateEMA,
  PriceData,
  RSIResult,
  MACDResult,
} from '../../utils/indicators'

interface IndicatorPanelProps {
  data: PriceData[]
  height?: number
  className?: string
}

// RSI Indicator Component
const RSIChart: React.FC<{ data: RSIResult[]; height: number }> = ({ data, height }) => {
  return (
    <div style={{ height }}>
      <div className='flex items-center justify-between mb-2'>
        <h4 className='text-sm font-medium text-gray-900 dark:text-white'>RSI (14)</h4>
        {data.length > 0 && (
          <span
            className={`text-sm font-medium ${
              data[data.length - 1].rsi > 70
                ? 'text-red-600 dark:text-red-400'
                : data[data.length - 1].rsi < 30
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {data[data.length - 1].rsi.toFixed(2)}
          </span>
        )}
      </div>
      <ResponsiveContainer width='100%' height='80%'>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' className='dark:stroke-gray-600' />
          <XAxis
            dataKey='timestamp'
            tickFormatter={timestamp => new Date(timestamp * 1000).toLocaleDateString()}
            fontSize={10}
            stroke='#6b7280'
            interval='preserveStartEnd'
          />
          <YAxis domain={[0, 100]} fontSize={10} stroke='#6b7280' width={35} />
          <Tooltip
            formatter={(value: number) => [value.toFixed(2), 'RSI']}
            labelFormatter={(timestamp: number) => new Date(timestamp * 1000).toLocaleString()}
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg)',
              border: '1px solid var(--tooltip-border)',
              borderRadius: '4px',
              fontSize: '11px',
            }}
          />

          {/* Overbought/Oversold lines */}
          <ReferenceLine y={70} stroke='#ef4444' strokeDasharray='2 2' />
          <ReferenceLine y={30} stroke='#10b981' strokeDasharray='2 2' />
          <ReferenceLine y={50} stroke='#6b7280' strokeDasharray='1 1' opacity={0.5} />

          <Line
            type='monotone'
            dataKey='rsi'
            stroke='#8b5cf6'
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: '#8b5cf6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// MACD Indicator Component
const MACDChart: React.FC<{ data: MACDResult[]; height: number }> = ({ data, height }) => {
  const chartData = data.map(item => ({
    ...item,
    positiveHistogram: item.histogram > 0 ? item.histogram : 0,
    negativeHistogram: item.histogram < 0 ? item.histogram : 0,
  }))

  return (
    <div style={{ height }}>
      <div className='flex items-center justify-between mb-2'>
        <h4 className='text-sm font-medium text-gray-900 dark:text-white'>MACD (12,26,9)</h4>
        {data.length > 0 && (
          <div className='flex space-x-3 text-xs'>
            <span className='text-blue-600 dark:text-blue-400'>
              MACD: {data[data.length - 1].macd.toFixed(4)}
            </span>
            <span className='text-orange-600 dark:text-orange-400'>
              Signal: {data[data.length - 1].signal.toFixed(4)}
            </span>
          </div>
        )}
      </div>
      <ResponsiveContainer width='100%' height='80%'>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' className='dark:stroke-gray-600' />
          <XAxis
            dataKey='timestamp'
            tickFormatter={timestamp => new Date(timestamp * 1000).toLocaleDateString()}
            fontSize={10}
            stroke='#6b7280'
            interval='preserveStartEnd'
          />
          <YAxis
            fontSize={10}
            stroke='#6b7280'
            width={45}
            tickFormatter={value => value.toFixed(3)}
          />
          <Tooltip
            formatter={(value: number, name: string) => [value.toFixed(4), name]}
            labelFormatter={(timestamp: number) => new Date(timestamp * 1000).toLocaleString()}
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg)',
              border: '1px solid var(--tooltip-border)',
              borderRadius: '4px',
              fontSize: '11px',
            }}
          />

          <ReferenceLine y={0} stroke='#6b7280' strokeDasharray='1 1' opacity={0.5} />

          {/* Histogram bars */}
          <Area
            type='monotone'
            dataKey='positiveHistogram'
            stackId='histogram'
            stroke='#10b981'
            fill='#10b981'
            fillOpacity={0.6}
          />
          <Area
            type='monotone'
            dataKey='negativeHistogram'
            stackId='histogram'
            stroke='#ef4444'
            fill='#ef4444'
            fillOpacity={0.6}
          />

          {/* MACD and Signal lines */}
          <Line
            type='monotone'
            dataKey='macd'
            stroke='#3b82f6'
            strokeWidth={2}
            dot={false}
            name='MACD'
          />
          <Line
            type='monotone'
            dataKey='signal'
            stroke='#f59e0b'
            strokeWidth={2}
            dot={false}
            name='Signal'
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Moving Averages Overlay Component
const MovingAverageInfo: React.FC<{ data: PriceData[] }> = ({ data }) => {
  const sma20 = useMemo(() => calculateSMA(data, 20), [data])
  const sma50 = useMemo(() => calculateSMA(data, 50), [data])
  const ema12 = useMemo(() => calculateEMA(data, 12), [data])
  const ema26 = useMemo(() => calculateEMA(data, 26), [data])

  const latest = data[data.length - 1]
  const latestPrice = latest?.close || 0

  const getMAValues = () => {
    return {
      sma20: sma20[sma20.length - 1]?.value || 0,
      sma50: sma50[sma50.length - 1]?.value || 0,
      ema12: ema12[ema12.length - 1]?.value || 0,
      ema26: ema26[ema26.length - 1]?.value || 0,
    }
  }

  const maValues = getMAValues()

  const getMATrend = (price: number, ma: number) => {
    if (price > ma) return { color: 'text-green-600 dark:text-green-400', trend: '↑' }
    if (price < ma) return { color: 'text-red-600 dark:text-red-400', trend: '↓' }
    return { color: 'text-gray-600 dark:text-gray-400', trend: '→' }
  }

  return (
    <div className='grid grid-cols-2 gap-4'>
      <div>
        <h4 className='text-sm font-medium text-gray-900 dark:text-white mb-2'>
          Simple Moving Averages
        </h4>
        <div className='space-y-1 text-xs'>
          <div className='flex justify-between items-center'>
            <span className='text-gray-600 dark:text-gray-400'>SMA(20):</span>
            <div className='flex items-center space-x-1'>
              <span className='font-medium'>${maValues.sma20.toFixed(2)}</span>
              <span className={getMATrend(latestPrice, maValues.sma20).color}>
                {getMATrend(latestPrice, maValues.sma20).trend}
              </span>
            </div>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-gray-600 dark:text-gray-400'>SMA(50):</span>
            <div className='flex items-center space-x-1'>
              <span className='font-medium'>${maValues.sma50.toFixed(2)}</span>
              <span className={getMATrend(latestPrice, maValues.sma50).color}>
                {getMATrend(latestPrice, maValues.sma50).trend}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className='text-sm font-medium text-gray-900 dark:text-white mb-2'>
          Exponential Moving Averages
        </h4>
        <div className='space-y-1 text-xs'>
          <div className='flex justify-between items-center'>
            <span className='text-gray-600 dark:text-gray-400'>EMA(12):</span>
            <div className='flex items-center space-x-1'>
              <span className='font-medium'>${maValues.ema12.toFixed(2)}</span>
              <span className={getMATrend(latestPrice, maValues.ema12).color}>
                {getMATrend(latestPrice, maValues.ema12).trend}
              </span>
            </div>
          </div>
          <div className='flex justify-between items-center'>
            <span className='text-gray-600 dark:text-gray-400'>EMA(26):</span>
            <div className='flex items-center space-x-1'>
              <span className='font-medium'>${maValues.ema26.toFixed(2)}</span>
              <span className={getMATrend(latestPrice, maValues.ema26).color}>
                {getMATrend(latestPrice, maValues.ema26).trend}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const IndicatorPanel: React.FC<IndicatorPanelProps> = ({
  data,
  height = 300,
  className = '',
}) => {
  const rsiData = useMemo(() => calculateRSI(data, 14), [data])
  const macdData = useMemo(() => calculateMACD(data, 12, 26, 9), [data])

  if (!data.length) {
    return (
      <div
        className={`flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-700 rounded ${className}`}
      >
        <p className='text-gray-500 dark:text-gray-400'>No data available for indicators</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Moving Averages Summary */}
      <div className='bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700'>
        <MovingAverageInfo data={data} />
      </div>

      {/* RSI Chart */}
      <div className='bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700'>
        <RSIChart data={rsiData} height={height * 0.4} />
      </div>

      {/* MACD Chart */}
      <div className='bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700'>
        <MACDChart data={macdData} height={height * 0.6} />
      </div>
    </div>
  )
}

export default IndicatorPanel
