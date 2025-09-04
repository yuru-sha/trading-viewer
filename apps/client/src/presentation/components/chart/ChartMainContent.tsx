import React from 'react'
import { useChartSymbol } from '@/presentation/context/ChartSymbolContext'
import { useChartControlsContext } from '@/presentation/context/ChartControlsContext'
import { useChartFeatures } from '@/presentation/context/ChartFeaturesContext'
import ChartContainer from '@/presentation/components/chart/ChartContainer'
import ChartLoadingState from '@/presentation/components/chart/ChartLoadingState'
import ChartErrorState from '@/presentation/components/chart/ChartErrorState'

const ChartMainContent: React.FC = () => {
  const { symbolState, symbolActions } = useChartSymbol()
  const { controlsState } = useChartControlsContext()
  const { chartSettings, showDrawingTools, chartInstanceRef } = useChartFeatures()

  if (symbolState.loading) {
    return <ChartLoadingState symbol={symbolState.currentSymbol} />
  }

  if (symbolState.chartData.length === 0) {
    return (
      <ChartErrorState
        symbol={symbolState.currentSymbol}
        onRetry={() => symbolActions.fetchData(symbolState.currentSymbol)}
      />
    )
  }

  return (
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
        showVolume={chartSettings.showVolume}
        colors={chartSettings.colors}
      />
    </div>
  )
}

export default ChartMainContent
