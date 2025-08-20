import React, { useState, useEffect } from 'react'
import { Icon } from '@ui'
import { ChartType, POPULAR_SYMBOLS, CHART_TIMEFRAMES } from '@trading-viewer/shared'
import { useApp, useAppActions } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import SymbolSearch from '../SymbolSearch'
import ChartSettings, { ChartSettings as ChartSettingsType } from './ChartSettings'
import UserDropdown from '../UserDropdown'
import IndicatorsDropdown from './IndicatorsDropdown'
import { api } from '../../lib/apiClient'

interface ChartHeaderProps {
  currentSymbol: string
  selectedTimeframe: string
  chartType: ChartType
  showSymbolSearch: boolean
  showTimeframeDropdown: boolean
  showChartTypeDropdown: boolean
  showIndicatorsDropdown: boolean
  isFullscreen: boolean
  onSymbolSearchToggle: () => void
  onTimeframeChange: (timeframe: string) => void
  onChartTypeChange: (type: ChartType) => void
  onSymbolChange: (symbol: string) => void
  onTimeframeDropdownToggle: () => void
  onChartTypeDropdownToggle: () => void
  onIndicatorsDropdownToggle: () => void
  onSaveTemplate: () => void
  onToggleFullscreen: () => void
  onTakeScreenshot: () => void
  onCloseDropdowns: () => void
  chartSettings?: ChartSettingsType
  onSettingsChange?: (settings: ChartSettingsType) => void
  showDrawingTools?: boolean
  onToggleDrawingTools?: () => void
  showFooter?: boolean
  onToggleFooter?: () => void
  // Alert props
  currentPrice?: number
  onOpenAlerts?: () => void
  activeAlertsCount?: number
  // Watchlist props
  onAddToWatchlist?: () => void
  isInWatchlist?: boolean
  // Alert creation props
  onCreateAlert?: () => void
}

const ChartHeader: React.FC<ChartHeaderProps> = ({
  currentSymbol,
  selectedTimeframe,
  chartType,
  showSymbolSearch,
  showTimeframeDropdown,
  showChartTypeDropdown,
  showIndicatorsDropdown,
  isFullscreen,
  onSymbolSearchToggle,
  onTimeframeChange,
  onChartTypeChange,
  onSymbolChange,
  onTimeframeDropdownToggle,
  onChartTypeDropdownToggle,
  onIndicatorsDropdownToggle,
  onSaveTemplate,
  onToggleFullscreen,
  onTakeScreenshot,
  onCloseDropdowns,
  chartSettings,
  onSettingsChange,
  showDrawingTools,
  onToggleDrawingTools,
  showFooter,
  onToggleFooter,
  // Alert props
  currentPrice,
  onOpenAlerts,
  activeAlertsCount,
  // Watchlist props
  onAddToWatchlist,
  isInWatchlist,
  // Alert creation props
  onCreateAlert,
}) => {
  const { state } = useApp()
  const { setTheme } = useAppActions()
  const { user, isAuthenticated } = useAuth()
  const [watchlistSymbols, setWatchlistSymbols] = useState<Array<{ symbol: string; name: string }>>(
    []
  )

  // Fetch watchlist symbols on mount
  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const response = await api.watchlist.get()
        // Transform watchlist data to expected format
        const symbols =
          response.data?.watchlist?.map(item => ({
            symbol: item.symbol,
            name: item.name,
          })) || []
        setWatchlistSymbols(symbols)
      } catch {
        console.log('Failed to fetch watchlist, showing empty list')
        // Don't fallback to popular symbols - show empty watchlist instead
        setWatchlistSymbols([])
      }
    }
    fetchWatchlist()
  }, [])

  const toggleTheme = () => {
    setTheme(state.theme === 'dark' ? 'light' : 'dark')
  }

  const handleSymbolSelect = (symbol: string) => {
    onSymbolChange(symbol)
    onSymbolSearchToggle()
  }

  return (
    <>
      {/* Header */}
      <div className='flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 py-2'>
        <div className='flex items-center justify-between'>
          {/* Left - Symbol and Tools */}
          <div className='flex items-center'>
            {/* Symbol Selector Button */}
            <button
              onClick={onSymbolSearchToggle}
              className='flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
              title='Search and select trading symbol'
            >
              <div className='flex items-center space-x-2'>
                <span className='font-semibold text-gray-900 dark:text-white'>{currentSymbol}</span>
                <svg
                  className='w-4 h-4 text-gray-500 dark:text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 9l-7 7-7-7'
                  />
                </svg>
              </div>
            </button>

            {/* Separator */}
            <div className='mx-3 h-5 w-px bg-gray-300 dark:bg-gray-600'></div>

            {/* Timeframe Dropdown */}
            <div className='relative'>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onTimeframeDropdownToggle()
                }}
                className='flex items-center space-x-1 px-2 py-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                title='Select chart timeframe'
              >
                <span>
                  {CHART_TIMEFRAMES.find(tf => tf.value === selectedTimeframe)?.label || '1D'}
                </span>
                <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 9l-7 7-7-7'
                  />
                </svg>
              </button>
              {showTimeframeDropdown && (
                <div className='absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50'>
                  {CHART_TIMEFRAMES.map(tf => (
                    <button
                      key={tf.value}
                      onClick={e => {
                        e.stopPropagation()
                        onTimeframeChange(tf.value)
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-sm ${
                        selectedTimeframe === tf.value
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Separator */}
            <div className='mx-3 h-5 w-px bg-gray-300 dark:bg-gray-600'></div>

            {/* Chart Type Dropdown */}
            <div className='relative'>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onChartTypeDropdownToggle()
                }}
                className='flex items-center space-x-1 px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                title='Select chart type'
              >
                {chartType === 'candle' ? (
                  <Icon name='AlignHorizontalDistributeCenter' className='w-4 h-4' />
                ) : chartType === 'line' ? (
                  <Icon name='TrendingUpDown' className='w-4 h-4' />
                ) : (
                  <Icon name='ChartNoAxesCombined' className='w-4 h-4' />
                )}
                <svg className='w-3 h-3 ml-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 9l-7 7-7-7'
                  />
                </svg>
              </button>
              {showChartTypeDropdown && (
                <div className='absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50'>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onChartTypeChange('candle')
                    }}
                    className={`flex items-center space-x-2 w-full px-3 py-1.5 text-sm ${
                      chartType === 'candle'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon name='AlignHorizontalDistributeCenter' className='w-4 h-4' />
                    <span>Candlestick</span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onChartTypeChange('line')
                    }}
                    className={`flex items-center space-x-2 w-full px-3 py-1.5 text-sm ${
                      chartType === 'line'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon name='TrendingUpDown' className='w-4 h-4' />
                    <span>Line</span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onChartTypeChange('area')
                    }}
                    className={`flex items-center space-x-2 w-full px-3 py-1.5 text-sm ${
                      chartType === 'area'
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon name='ChartNoAxesCombined' className='w-4 h-4' />
                    <span>Area</span>
                  </button>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className='mx-3 h-5 w-px bg-gray-300 dark:bg-gray-600'></div>

            {/* Indicators Dropdown */}
            <div className='relative'>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onIndicatorsDropdownToggle()
                }}
                className='flex items-center space-x-1 px-2 py-1 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                title='Select technical indicators'
              >
                <Icon name='ChartNoAxesCombined' className='w-4 h-4' />
                <span>Indicators</span>
                <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 9l-7 7-7-7'
                  />
                </svg>
              </button>
              {console.log('🔍 ChartHeader: IndicatorsDropdown props:', {
                symbol: currentSymbol,
                timeframe: selectedTimeframe,
                isOpen: showIndicatorsDropdown,
              })}
              <IndicatorsDropdown
                symbol={currentSymbol}
                timeframe={selectedTimeframe}
                isOpen={showIndicatorsDropdown}
                onClose={onIndicatorsDropdownToggle}
                showVolume={chartSettings?.showVolume}
                onToggleVolume={show => onSettingsChange?.({ ...chartSettings!, showVolume: show })}
              />
            </div>
          </div>

          {/* Center - Empty space */}
          <div></div>

          {/* Right - Action Buttons */}
          <div className='flex items-center space-x-1'>
            {/* Add to Watchlist Button */}
            {onAddToWatchlist && isAuthenticated && (
              <button
                onClick={onAddToWatchlist}
                className={`flex items-center px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${
                  isInWatchlist ? 'text-red-500 dark:text-red-400' : ''
                }`}
                title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
              >
                <Icon name='Heart' className={`w-4 h-4 ${isInWatchlist ? 'fill-current' : ''}`} />
              </button>
            )}

            {/* Create Alert Button */}
            {onCreateAlert && isAuthenticated && (
              <button
                onClick={onCreateAlert}
                className='flex items-center px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                title='Create Price Alert'
              >
                <Icon name='BellPlus' className='w-4 h-4' />
              </button>
            )}

            {/* Alert Button */}
            {onOpenAlerts && (
              <button
                onClick={onOpenAlerts}
                className='relative flex items-center px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                title='Price Alerts'
              >
                <Icon name='Bell' className='w-4 h-4' />
                {activeAlertsCount && activeAlertsCount > 0 && (
                  <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center'>
                    {activeAlertsCount > 9 ? '9+' : activeAlertsCount}
                  </span>
                )}
              </button>
            )}

            {/* Save Button */}
            <button
              onClick={onSaveTemplate}
              className='flex items-center px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
              title='Save Template'
            >
              <Icon name='Save' className='w-4 h-4' />
            </button>

            {/* Separator */}
            <div className='mx-2 h-5 w-px bg-gray-300 dark:bg-gray-600'></div>

            {/* Drawing Tools Toggle */}
            <button
              onClick={onToggleDrawingTools}
              className='flex items-center px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
              title={showDrawingTools ? 'Hide drawing tools sidebar' : 'Show drawing tools sidebar'}
            >
              {showDrawingTools ? (
                <Icon name='PanelLeftClose' className='w-4 h-4' />
              ) : (
                <Icon name='PanelLeftOpen' className='w-4 h-4' />
              )}
            </button>

            {/* Footer Toggle */}
            <button
              onClick={onToggleFooter}
              className='flex items-center px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
              title={showFooter ? 'Hide footer' : 'Show footer'}
            >
              {showFooter ? (
                <Icon name='PanelBottomClose' className='w-4 h-4' />
              ) : (
                <Icon name='PanelBottomOpen' className='w-4 h-4' />
              )}
            </button>

            {/* Settings Component */}
            <ChartSettings
              settings={
                chartSettings || {
                  chartType: chartType === 'candle' ? 'candlestick' : chartType,
                  timeframe: selectedTimeframe as any,
                  showVolume: true,
                  showGridlines: true,
                  showPeriodHigh: true,
                  showPeriodLow: true,
                  periodWeeks: 52,
                  indicators: {
                    sma: { enabled: false, periods: [20, 50] },
                    ema: { enabled: false, periods: [12, 26] },
                    rsi: { enabled: false, period: 14 },
                  },
                  colors: {
                    bullish: '#22c55e',
                    bearish: '#ef4444',
                    volume: '#a855f7',
                    grid: '#4b5563',
                    background: '#111827',
                  },
                }
              }
              onSettingsChange={onSettingsChange || (() => {})}
              className=''
            />

            {/* Fullscreen */}
            <button
              onClick={onToggleFullscreen}
              className='flex items-center px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Icon name='Minimize' className='w-4 h-4' />
              ) : (
                <Icon name='Maximize' className='w-4 h-4' />
              )}
            </button>

            {/* Screenshot */}
            <button
              onClick={onTakeScreenshot}
              className='flex items-center px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
              title='Take Screenshot'
            >
              <Icon name='Camera' className='w-4 h-4' />
            </button>

            {/* Separator */}
            <div className='mx-2 h-5 w-px bg-gray-300 dark:bg-gray-600'></div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className='flex items-center px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
              title={state.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {state.theme === 'dark' ? (
                <Icon name='Sun' className='w-4 h-4' />
              ) : (
                <Icon name='Moon' className='w-4 h-4' />
              )}
            </button>

            {/* Auth Section */}
            <div className='mx-2 h-5 w-px bg-gray-300 dark:bg-gray-600'></div>

            {isAuthenticated && user ? (
              <UserDropdown />
            ) : (
              <button
                onClick={() => window.open('/login', '_blank')}
                className='flex items-center px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors'
                title='Login'
              >
                <Icon name='LogIn' className='w-4 h-4 mr-2' />
                <span className='text-sm font-medium'>Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Symbol Search Modal */}
      {showSymbolSearch && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4'>
            {/* Modal Header */}
            <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Select Symbol</h3>
              <button
                onClick={onSymbolSearchToggle}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
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

            {/* Search Input */}
            <div className='p-4'>
              <SymbolSearch
                onSymbolSelect={handleSymbolSelect}
                currentSymbol={currentSymbol}
                className='w-full'
              />
            </div>

            {/* Watchlist Symbols */}
            <div className='px-4 pb-4'>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-3'>
                {watchlistSymbols.length > 0 ? 'Your Watchlist' : 'Watchlist'}
              </p>
              {watchlistSymbols.length > 0 ? (
                <div className='grid grid-cols-2 gap-2'>
                  {watchlistSymbols.map(({ symbol, name }) => (
                    <button
                      key={symbol}
                      onClick={() => handleSymbolSelect(symbol)}
                      className={`text-left px-3 py-2 rounded-lg transition-colors ${
                        currentSymbol === symbol
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className='font-medium text-gray-900 dark:text-white'>{symbol}</div>
                      <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                        {name}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className='text-center py-4'>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    No symbols in watchlist
                  </p>
                  <a
                    href='/watchlist'
                    className='text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block'
                  >
                    Add symbols
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ChartHeader
