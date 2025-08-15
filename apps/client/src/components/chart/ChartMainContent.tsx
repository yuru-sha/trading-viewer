import React from 'react'
import { useChartContext } from '../../contexts/ChartContext'
import ChartContainer from './ChartContainer'
import ChartLoadingState from './ChartLoadingState'
import ChartErrorState from './ChartErrorState'

const ChartMainContent: React.FC = () => {
  const {
    symbolState,
    symbolActions,
    controlsState,
    chartSettings,
    showDrawingTools,
    chartInstanceRef,
  } = useChartContext()

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
      />
    </div>
  )
}

export default ChartMainContent
