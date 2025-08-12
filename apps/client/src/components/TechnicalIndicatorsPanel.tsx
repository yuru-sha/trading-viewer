import React, { useState } from 'react'
import { Button } from '@trading-viewer/ui'

interface TechnicalIndicators {
  sma?: { enabled: boolean; periods: number[] }
  ema?: { enabled: boolean; periods: number[] }
  rsi?: { enabled: boolean; period: number }
  macd?: { enabled: boolean; fastPeriod: number; slowPeriod: number; signalPeriod: number }
  bollingerBands?: { enabled: boolean; period: number; standardDeviations: number }
}

interface TechnicalIndicatorsPanelProps {
  indicators: TechnicalIndicators
  onIndicatorsChange: (indicators: TechnicalIndicators) => void
  className?: string
}

export const TechnicalIndicatorsPanel: React.FC<TechnicalIndicatorsPanelProps> = ({
  indicators,
  onIndicatorsChange,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateIndicator = <K extends keyof TechnicalIndicators>(
    key: K,
    value: TechnicalIndicators[K]
  ) => {
    onIndicatorsChange({
      ...indicators,
      [key]: value,
    })
  }

  const toggleIndicator = (key: keyof TechnicalIndicators) => {
    const current = indicators[key]
    if (current) {
      updateIndicator(key, { ...current, enabled: !current.enabled })
    }
  }

  const IndicatorToggle: React.FC<{
    title: string
    enabled: boolean
    onToggle: () => void
    color: string
  }> = ({ title, enabled, onToggle, color }) => (
    <button
      onClick={onToggle}
      className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors ${
        enabled
          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
          : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
      }`}
    >
      <div className='flex items-center space-x-2'>
        <div
          className={`w-3 h-3 rounded-full ${enabled ? 'opacity-100' : 'opacity-50'}`}
          style={{ backgroundColor: color }}
        />
        <span className='font-medium'>{title}</span>
      </div>
      <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
    </button>
  )

  if (!isExpanded) {
    return (
      <div className={`${className}`}>
        <Button
          variant='secondary'
          size='sm'
          onClick={() => setIsExpanded(true)}
          className='flex items-center space-x-2'
        >
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
            />
          </svg>
          <span>Indicators</span>
        </Button>
      </div>
    )
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg ${className}`}
    >
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
          Technical Indicators
        </h3>
        <button
          onClick={() => setIsExpanded(false)}
          className='p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
        >
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className='p-4 space-y-4 max-h-96 overflow-y-auto'>
        {/* Moving Averages */}
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
            Moving Averages
          </h4>
          <div className='space-y-2'>
            <IndicatorToggle
              title={`SMA (${indicators.sma?.periods.join(', ') || '20, 50'})`}
              enabled={indicators.sma?.enabled || false}
              onToggle={() => toggleIndicator('sma')}
              color='#ff6b35'
            />
            <IndicatorToggle
              title={`EMA (${indicators.ema?.periods.join(', ') || '12, 26'})`}
              enabled={indicators.ema?.enabled || false}
              onToggle={() => toggleIndicator('ema')}
              color='#9b59b6'
            />
          </div>
        </div>

        {/* Bollinger Bands */}
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>Volatility</h4>
          <div className='space-y-2'>
            <IndicatorToggle
              title={`Bollinger Bands (${indicators.bollingerBands?.period || 20}, ${indicators.bollingerBands?.standardDeviations || 2})`}
              enabled={indicators.bollingerBands?.enabled || false}
              onToggle={() => toggleIndicator('bollingerBands')}
              color='#95a5a6'
            />
          </div>
        </div>

        {/* Oscillators */}
        <div>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>Oscillators</h4>
          <div className='space-y-2'>
            <IndicatorToggle
              title={`RSI (${indicators.rsi?.period || 14})`}
              enabled={indicators.rsi?.enabled || false}
              onToggle={() => toggleIndicator('rsi')}
              color='#e67e22'
            />
            <IndicatorToggle
              title={`MACD (${indicators.macd?.fastPeriod || 12}, ${indicators.macd?.slowPeriod || 26}, ${indicators.macd?.signalPeriod || 9})`}
              enabled={indicators.macd?.enabled || false}
              onToggle={() => toggleIndicator('macd')}
              color='#3498db'
            />
          </div>
        </div>

        {/* Preset Configurations */}
        <div className='pt-4 border-t border-gray-200 dark:border-gray-600'>
          <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
            Quick Presets
          </h4>
          <div className='grid grid-cols-2 gap-2'>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => {
                onIndicatorsChange({
                  sma: { enabled: true, periods: [20, 50] },
                  ema: { enabled: false, periods: [12, 26] },
                  rsi: { enabled: false, period: 14 },
                  macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
                  bollingerBands: { enabled: false, period: 20, standardDeviations: 2 },
                })
              }}
              className='text-xs'
            >
              Trend Following
            </Button>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => {
                onIndicatorsChange({
                  sma: { enabled: false, periods: [20, 50] },
                  ema: { enabled: false, periods: [12, 26] },
                  rsi: { enabled: true, period: 14 },
                  macd: { enabled: true, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
                  bollingerBands: { enabled: false, period: 20, standardDeviations: 2 },
                })
              }}
              className='text-xs'
            >
              Momentum
            </Button>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => {
                onIndicatorsChange({
                  sma: { enabled: false, periods: [20, 50] },
                  ema: { enabled: false, periods: [12, 26] },
                  rsi: { enabled: false, period: 14 },
                  macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
                  bollingerBands: { enabled: true, period: 20, standardDeviations: 2 },
                })
              }}
              className='text-xs'
            >
              Volatility
            </Button>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => {
                onIndicatorsChange({
                  sma: { enabled: false, periods: [20, 50] },
                  ema: { enabled: false, periods: [12, 26] },
                  rsi: { enabled: false, period: 14 },
                  macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
                  bollingerBands: { enabled: false, period: 20, standardDeviations: 2 },
                })
              }}
              className='text-xs'
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TechnicalIndicatorsPanel
