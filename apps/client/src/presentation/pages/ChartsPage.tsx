import React, { useEffect, useState } from 'react'
import { ChartType } from '@trading-viewer/shared'
import { ChartProviders } from '@/presentation/context/ChartProviders'
import { useChartSymbol } from '@/presentation/context/ChartSymbolContext'
import { useChartControlsContext } from '@/presentation/context/ChartControlsContext'
import { useChartFeatures } from '@/presentation/context/ChartFeaturesContext'
import { useAuthRedirect } from '@/presentation/hooks/useAuthRedirect'
import ChartHeader from '@/presentation/components/chart/ChartHeader'
import ChartFooter from '@/presentation/components/chart/ChartFooter'
import ChartMainContent from '@/presentation/components/chart/ChartMainContent'
import ChartModals from '@/presentation/components/chart/ChartModals'

const ChartsPageContent: React.FC = () => {
  // 認証状態監視とセッション切れ時の自動リダイレクト
  const { isAuthenticated, isLoading } = useAuthRedirect()

  // New provider hooks
  const { symbolFromUrl, symbolState, symbolActions } = useChartSymbol()
  const {
    controlsState,
    controlsActions,
    handleTimeframeChange,
    handleChartTypeChange,
    handleTimezoneChange,
  } = useChartControlsContext()
  const {
    chartSettings,
    handleSettingsChange,
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,
    watchlistState,
    watchlistActions,
    alertActions,
    takeScreenshot,
    loadDefaultChart,
  } = useChartFeatures()

  // Track the last processed symbol to prevent infinite loops
  const [lastProcessedSymbol, setLastProcessedSymbol] = useState<string | null>(null)

  // Update symbol when URL changes (only direct URL access, not programmatic changes)
  useEffect(() => {
    if (symbolFromUrl !== symbolState.currentSymbol && symbolFromUrl !== lastProcessedSymbol) {
      setLastProcessedSymbol(symbolFromUrl)
      // Use the original symbol management handler to avoid URL update loop
      symbolActions.fetchData(symbolFromUrl)
    }
  }, [symbolFromUrl, symbolState.currentSymbol, lastProcessedSymbol, symbolActions])

  // 認証ローディング中は何も表示しない
  if (isLoading) {
    return (
      <div className='h-screen flex items-center justify-center bg-white dark:bg-gray-900'>
        <div className='text-gray-500'>Loading...</div>
      </div>
    )
  }

  // 認証されていない場合は何も表示しない（useAuthRedirect がリダイレクトを処理）
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className='h-screen flex flex-col bg-white dark:bg-gray-900'>
      <ChartHeader
        currentSymbol={symbolState.currentSymbol}
        selectedTimeframe={controlsState.selectedTimeframe}
        chartType={
          (controlsState.chartType === 'candlestick'
            ? 'candle'
            : controlsState.chartType) as ChartType
        }
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
        onSaveTemplate={loadDefaultChart}
        onToggleFullscreen={controlsActions.toggleFullscreen}
        onTakeScreenshot={takeScreenshot}
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
    <ChartProviders>
      <ChartsPageContent />
    </ChartProviders>
  )
}

export default ChartsPage
