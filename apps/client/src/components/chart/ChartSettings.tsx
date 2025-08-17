import React, { useState } from 'react'
import { Button } from '@trading-viewer/ui'

export interface ChartSettingsProps {
  settings: ChartSettings
  onSettingsChange: (settings: ChartSettings) => void
  className?: string
}

export interface ChartSettings {
  chartType: 'candlestick' | 'line' | 'area'
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M'
  showVolume: boolean
  showGridlines: boolean
  showPeriodHigh: boolean
  showPeriodLow: boolean
  periodWeeks: number // 週数指定（デフォルト 52 週）
  showDrawingTools?: boolean
  colors: {
    bullish: string
    bearish: string
    volume: string
    grid: string
    background: string
  }
}

const defaultSettings: ChartSettings = {
  chartType: 'candlestick',
  timeframe: '1d',
  showVolume: true,
  showGridlines: true,
  showPeriodHigh: true,
  showPeriodLow: true,
  periodWeeks: 52, // デフォルト 52 週
  colors: {
    bullish: '#10b981',
    bearish: '#ef4444',
    volume: '#8b5cf6',
    grid: '#e5e7eb',
    background: '#ffffff',
  },
}

export const ChartSettings: React.FC<ChartSettingsProps> = ({
  settings,
  onSettingsChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'style'>('general')

  const updateSettings = (updates: Partial<ChartSettings>) => {
    onSettingsChange({ ...settings, ...updates })
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className='flex items-center px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
        title='Chart settings'
      >
        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
          />
        </svg>
      </button>
    )
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[80vh] overflow-hidden'>
        <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Chart Settings</h3>
          <button
            onClick={() => setIsOpen(false)}
            className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
          >
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-gray-200 dark:border-gray-700'>
          {[
            { id: 'general', label: 'General' },
            { id: 'style', label: 'Style' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className='p-4 max-h-96 overflow-y-auto'>
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className='space-y-4'>
              {/* Display Options */}
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-600 dark:text-gray-300'>
                  Display Options
                </label>
                <div className='space-y-2'>
                  <label className='flex items-center'>
                    <input
                      type='checkbox'
                      checked={settings.showGridlines}
                      onChange={e => updateSettings({ showGridlines: e.target.checked })}
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                    <span className='ml-2 text-sm text-gray-600 dark:text-gray-300'>
                      Show Gridlines
                    </span>
                  </label>

                  {/* Period Settings */}
                  <div className='mt-4'>
                    <label className='block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2'>
                      Period High/Low Settings
                    </label>
                    <div className='flex items-center space-x-4 mb-3'>
                      <label className='text-sm text-gray-600 dark:text-gray-300'>
                        Period (weeks):
                      </label>
                      <input
                        type='number'
                        value={settings.periodWeeks}
                        onChange={e =>
                          updateSettings({
                            periodWeeks: Math.max(1, parseInt(e.target.value) || 52),
                          })
                        }
                        className='w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white'
                        min='1'
                        max='260'
                        placeholder='52'
                      />
                    </div>
                    <label className='flex items-center mb-2'>
                      <input
                        type='checkbox'
                        checked={settings.showPeriodHigh}
                        onChange={e => updateSettings({ showPeriodHigh: e.target.checked })}
                        className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                      />
                      <span className='ml-2 text-sm text-gray-600 dark:text-gray-300'>
                        Show {settings.periodWeeks}W High
                      </span>
                    </label>
                    <label className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={settings.showPeriodLow}
                        onChange={e => updateSettings({ showPeriodLow: e.target.checked })}
                        className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                      />
                      <span className='ml-2 text-sm text-gray-600 dark:text-gray-300'>
                        Show {settings.periodWeeks}W Low
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Style Tab */}
          {activeTab === 'style' && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                {Object.entries(settings.colors).map(([key, value]) => (
                  <div key={key}>
                    <label className='block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 capitalize'>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <div className='flex items-center space-x-2'>
                      <input
                        type='color'
                        value={value}
                        onChange={e =>
                          updateSettings({
                            colors: { ...settings.colors, [key]: e.target.value },
                          })
                        }
                        className='w-8 h-8 rounded border border-gray-300 dark:border-gray-600'
                      />
                      <span className='text-sm text-gray-600 dark:text-gray-400 font-mono'>
                        {value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700'>
          <Button variant='secondary' onClick={() => onSettingsChange(defaultSettings)}>
            Reset to Default
          </Button>
          <div className='flex space-x-2'>
            <Button variant='secondary' onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant='primary' onClick={() => setIsOpen(false)}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChartSettings
