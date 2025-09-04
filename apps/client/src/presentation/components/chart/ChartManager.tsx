import React, { forwardRef, useMemo } from 'react'
import {
  BaseChartProps,
  ChartRef,
  DEFAULT_CHART_SETTINGS,
} from '@/presentation/components/BaseChart'
import { ChartContainer } from '@/presentation/components/chart/ChartContainer'
import { OptimizedChartContainer } from '@/presentation/components/OptimizedChartContainer'
import { LazyEChartsWrapper } from '@/presentation/components/chart/LazyEChartsWrapper'

export type ChartVariant = 'standard' | 'optimized' | 'lazy'

interface ChartManagerProps extends BaseChartProps {
  variant?: ChartVariant
  performanceMode?: 'high' | 'balanced' | 'low'
}

// Chart variant selector based on performance requirements
const getChartComponent = (variant: ChartVariant) => {
  switch (variant) {
    case 'optimized':
      return OptimizedChartContainer
    case 'lazy':
      return LazyEChartsWrapper
    case 'standard':
    default:
      return ChartContainer
  }
}

// Auto-select optimal chart variant based on data size and performance mode
const selectOptimalVariant = (
  dataLength: number,
  performanceMode: string,
  explicitVariant?: ChartVariant
): ChartVariant => {
  if (explicitVariant) return explicitVariant

  // Auto-selection logic
  if (performanceMode === 'high' || dataLength > 10000) {
    return 'optimized'
  } else if (performanceMode === 'low' || dataLength > 5000) {
    return 'lazy'
  }
  return 'standard'
}

export const ChartManager = forwardRef<ChartRef, ChartManagerProps>(
  (
    {
      variant,
      performanceMode = 'balanced',
      data,
      symbol,
      chartType = DEFAULT_CHART_SETTINGS.chartType,
      timeframe,
      showGridlines = DEFAULT_CHART_SETTINGS.showGridlines,
      showVolume = DEFAULT_CHART_SETTINGS.showVolume,
      showDrawingTools = DEFAULT_CHART_SETTINGS.showDrawingTools,
      showPeriodHigh = DEFAULT_CHART_SETTINGS.showPeriodHigh,
      showPeriodLow = DEFAULT_CHART_SETTINGS.showPeriodLow,
      periodWeeks,
      isRealTime = DEFAULT_CHART_SETTINGS.isRealTime,
      currentPrice,
      isLoading,
      onSymbolChange,
      className,
      indicators,
      ...props
    },
    ref
  ) => {
    // Select optimal chart variant
    const selectedVariant = useMemo(
      () => selectOptimalVariant(data.length, performanceMode, variant),
      [data.length, performanceMode, variant]
    )

    // Get the appropriate chart component
    const ChartComponent = useMemo(() => getChartComponent(selectedVariant), [selectedVariant])

    // Memoize chart props to prevent unnecessary re-renders
    const chartProps = useMemo(
      () => ({
        data,
        symbol,
        chartType,
        timeframe,
        showGridlines,
        showVolume,
        showDrawingTools,
        showPeriodHigh,
        showPeriodLow,
        periodWeeks,
        isRealTime,
        currentPrice,
        isLoading,
        onSymbolChange,
        className,
        indicators,
        ...props,
      }),
      [
        data,
        symbol,
        chartType,
        timeframe,
        showGridlines,
        showVolume,
        showDrawingTools,
        showPeriodHigh,
        showPeriodLow,
        periodWeeks,
        isRealTime,
        currentPrice,
        isLoading,
        onSymbolChange,
        className,
        indicators,
        props,
      ]
    )

    return <ChartComponent ref={ref} {...chartProps} />
  }
)

ChartManager.displayName = 'ChartManager'

export default ChartManager
