import React from 'react'
import { DataSourceInfo, TIMEZONES } from '@trading-viewer/shared'

interface ChartFooterProps {
  dataSource: DataSourceInfo | null
  isConnected: boolean
  currentTime: Date
  selectedTimezone: string
  showTimezoneDropdown: boolean
  onTimezoneChange: (timezone: string) => void
  onTimezoneDropdownToggle: () => void
}

const ChartFooter: React.FC<ChartFooterProps> = ({
  dataSource,
  isConnected,
  currentTime,
  selectedTimezone,
  showTimezoneDropdown,
  onTimezoneChange,
  onTimezoneDropdownToggle,
}) => {
  const formatTime = (date: Date, timezone: string) => {
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const parts = formatter.formatToParts(date)
    const year = parts.find(part => part.type === 'year')?.value
    const month = parts.find(part => part.type === 'month')?.value
    const day = parts.find(part => part.type === 'day')?.value
    const hour = parts.find(part => part.type === 'hour')?.value
    const minute = parts.find(part => part.type === 'minute')?.value
    const second = parts.find(part => part.type === 'second')?.value

    const timezoneLabel = timezone

    return `${year}/${month}/${day} ${hour}:${minute}:${second}(${timezoneLabel})`
  }

  return (
    <div className='flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-3 py-2'>
      <div className='flex items-center justify-between'>
        {/* Left - Market Status */}
        <div className='flex items-center space-x-4'>
          {dataSource && (
            <div className='flex items-center space-x-1'>
              <div
                className={`w-2 h-2 rounded-full ${
                  dataSource.isMockData ? 'bg-orange-500' : 'bg-green-500'
                } ${!dataSource.isMockData && isConnected ? 'animate-pulse' : ''}`}
              ></div>
              <span
                className={`text-xs font-medium ${
                  dataSource.isMockData
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {dataSource.status}
              </span>
            </div>
          )}
          <span className='text-xs text-gray-500 dark:text-gray-400'>
            {dataSource ? dataSource.description : 'Market Data by Finnhub'}
          </span>
        </div>

        {/* Right - Current Time (Clickable) */}
        <div className='relative'>
          <button
            onClick={e => {
              e.stopPropagation()
              onTimezoneDropdownToggle()
            }}
            className='flex items-center space-x-2 px-3 py-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
          >
            <span>{formatTime(currentTime, selectedTimezone)}</span>
          </button>
          {showTimezoneDropdown && (
            <div className='absolute bottom-full right-0 mb-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-[180px]'>
              {TIMEZONES.map(tz => (
                <button
                  key={tz.value}
                  onClick={e => {
                    e.stopPropagation()
                    onTimezoneChange(tz.value)
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-sm ${
                    selectedTimezone === tz.value
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className='flex justify-between items-center'>
                    <span>{tz.label}</span>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>{tz.offset}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChartFooter
