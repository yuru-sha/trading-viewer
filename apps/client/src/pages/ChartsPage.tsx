import React, { useState, useRef } from 'react'
import { Button } from '@trading-viewer/ui'
import { ChartType } from '@trading-viewer/shared'
import ChartContainer, { ChartContainerRef } from '../components/chart/ChartContainer'
import ChartHeader from '../components/chart/ChartHeader'
import ChartFooter from '../components/chart/ChartFooter'
import ChartSettings, { ChartSettings as ChartSettingsType } from '../components/chart/ChartSettings'
import { useChartControls } from '../hooks/useChartControls'
import { useSymbolManagement } from '../hooks/useSymbolManagement'
import { useIndicators } from '../hooks/useIndicators'

const ChartsPage: React.FC = () => {
  // Chart controls hook
  const [controlsState, controlsActions] = useChartControls('D', 'candle', 'UTC')

  // Symbol management hook
  const [symbolState, symbolActions] = useSymbolManagement('AAPL', controlsState.selectedTimeframe)

  // Indicators management hook (separated from chart settings)
  const indicatorsManager = useIndicators()

  // Drawing tools sidebar visibility state (temporary UI state, not persistent setting)
  const [showDrawingTools, setShowDrawingTools] = useState(true)

  // Footer visibility state (temporary UI state, not persistent setting)
  const [showFooter, setShowFooter] = useState(true)

  // Chart settings state (simplified - no indicators)
  const [chartSettings, setChartSettings] = useState<ChartSettingsType>({
    chartType: 'candlestick',
    timeframe: '1d',
    showVolume: true,
    showGridlines: true,
    showPeriodHigh: true,
    showPeriodLow: true,
    periodWeeks: 52,
    colors: {
      bullish: '#10b981',
      bearish: '#ef4444',
      volume: '#8b5cf6',
      grid: '#e5e7eb',
      background: '#ffffff',
    },
  })

  // Chart instance ref for accessing screenshot functionality
  const chartInstanceRef = useRef<ChartContainerRef>(null)

  // Handle screenshot
  const takeScreenshot = () => {
    if (chartInstanceRef.current?.takeScreenshot) {
      const filename = `${symbolState.currentSymbol}-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`
      chartInstanceRef.current.takeScreenshot(filename)
    } else {
      console.warn('Screenshot functionality not available')
    }
  }

  // Handle save template
  const saveTemplate = () => {
    console.log('Save template functionality would be implemented here')
  }

  // Handle chart settings change
  const handleSettingsChange = (newSettings: ChartSettingsType) => {
    setChartSettings(newSettings)
  }

  // Handle timeframe change (bridge between controls and symbol management)
  const handleTimeframeChange = (timeframe: string) => {
    controlsActions.setSelectedTimeframe(timeframe)
    symbolActions.handleTimeframeChange(timeframe)
    controlsActions.setShowTimeframeDropdown(false)
  }

  // Handle chart type change
  const handleChartTypeChange = (type: ChartType) => {
    controlsActions.setChartType(type)
    controlsActions.setShowChartTypeDropdown(false)
  }

  // Handle timezone change
  const handleTimezoneChange = (timezone: string) => {
    controlsActions.setSelectedTimezone(timezone)
    controlsActions.setShowTimezoneDropdown(false)
  }

  return (
    <div className='h-screen flex flex-col bg-white dark:bg-gray-900'>
      <ChartHeader
        currentSymbol={symbolState.currentSymbol}
        selectedTimeframe={controlsState.selectedTimeframe}
        chartType={controlsState.chartType === 'candlestick' ? 'candle' : controlsState.chartType}
        showSymbolSearch={controlsState.showSymbolSearch}
        showTimeframeDropdown={controlsState.showTimeframeDropdown}
        showChartTypeDropdown={controlsState.showChartTypeDropdown}
        showIndicatorsDropdown={controlsState.showIndicatorsDropdown}
        isFullscreen={controlsState.isFullscreen}
        onSymbolSearchToggle={controlsActions.toggleSymbolSearch}
        onTimeframeChange={handleTimeframeChange}
        onChartTypeChange={handleChartTypeChange}
        onSymbolChange={symbolActions.handleSymbolChange}
        onTimeframeDropdownToggle={controlsActions.toggleTimeframeDropdown}
        onChartTypeDropdownToggle={controlsActions.toggleChartTypeDropdown}
        onIndicatorsDropdownToggle={controlsActions.toggleIndicatorsDropdown}
        onSaveTemplate={saveTemplate}
        onToggleFullscreen={controlsActions.toggleFullscreen}
        onTakeScreenshot={takeScreenshot}
        onCloseDropdowns={controlsActions.closeAllDropdowns}
        chartSettings={chartSettings}
        onSettingsChange={handleSettingsChange}
        showDrawingTools={showDrawingTools}
        onToggleDrawingTools={() => setShowDrawingTools(!showDrawingTools)}
        showFooter={showFooter}
        onToggleFooter={() => setShowFooter(!showFooter)}
      />

      {/* Chart Content */}
      <div className='flex-1 overflow-hidden'>
        {symbolState.loading ? (
          <div className='h-full flex items-center justify-center'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4'></div>
              <p className='text-gray-600 dark:text-gray-400'>Loading {symbolState.currentSymbol} chart...</p>
            </div>
          </div>
        ) : symbolState.chartData.length > 0 ? (
          <div className='h-full'>
            <ChartContainer
              ref={chartInstanceRef}
              symbol={symbolState.currentSymbol}
              data={symbolState.chartData}
              currentPrice={symbolState.quoteData?.c}
              isLoading={symbolState.loading}
              isRealTime={true}
              onSymbolChange={symbolActions.handleSymbolChange}
              className='h-full'
              chartType={controlsState.chartType === 'candlestick' ? 'candle' : controlsState.chartType}
              timeframe={controlsState.selectedTimeframe}
              showGridlines={chartSettings.showGridlines}
              showDrawingTools={showDrawingTools}
              showPeriodHigh={chartSettings.showPeriodHigh}
              showPeriodLow={chartSettings.showPeriodLow}
              periodWeeks={chartSettings.periodWeeks}
            />
          </div>
        ) : (
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
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                No Chart Data
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
                Unable to load chart data for {symbolState.currentSymbol}
              </p>
              <Button
                variant='primary'
                onClick={() => symbolActions.fetchData(symbolState.currentSymbol)}
                className='text-sm'
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>

      {showFooter && (
        <ChartFooter
          dataSource={symbolState.dataSource}
          isConnected={true}
          currentTime={controlsState.currentTime}
          selectedTimezone={controlsState.selectedTimezone}
          showTimezoneDropdown={controlsState.showTimezoneDropdown}
          onTimezoneChange={handleTimezoneChange}
          onTimezoneDropdownToggle={controlsActions.toggleTimezoneDropdown}
        />
      )}

    </div>
  )
}

export default ChartsPage