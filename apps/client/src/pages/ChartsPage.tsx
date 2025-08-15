import React, { useEffect } from 'react'
import { ChartProvider, useChartContext } from '../contexts/ChartContext'
import ChartHeader from '../components/chart/ChartHeader'
import ChartFooter from '../components/chart/ChartFooter'
import ChartMainContent from '../components/chart/ChartMainContent'
import ChartModals from '../components/chart/ChartModals'

const ChartsPageContent: React.FC = () => {
  const {
    symbolFromUrl,
    symbolState,
    symbolActions,
    controlsState,
    controlsActions,
    chartSettings,
    handleSettingsChange,
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,
    watchlistState,
    watchlistActions,
    alertActions,
    handleTimeframeChange,
    handleChartTypeChange,
    handleTimezoneChange,
    takeScreenshot,
    saveTemplate,
  } = useChartContext()

  // Update symbol when URL changes
  useEffect(() => {
    if (symbolFromUrl !== symbolState.currentSymbol) {
      symbolActions.handleSymbolChange(symbolFromUrl)
    }
  }, [symbolFromUrl, symbolState.currentSymbol, symbolActions])

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
        // Watchlist props
        onAddToWatchlist={watchlistActions.handleWatchlistToggle}
        isInWatchlist={watchlistState.isInWatchlist}
        // Alert creation props
        onCreateAlert={alertActions.handleCreateAlert}
        currentPrice={symbolState.quoteData?.c}
      />

      {/* Chart Content */}
      <div className='flex-1 overflow-hidden'>
        <ChartMainContent />
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

      <ChartModals />
    </div>
  )
}

const ChartsPage: React.FC = () => {
  return (
    <ChartProvider>
      <ChartsPageContent />
    </ChartProvider>
  )
}

export default ChartsPage
