import React from 'react'
import { ChartSymbolProvider } from './ChartSymbolContext'
import { ChartControlsProvider } from './ChartControlsContext'
import { ChartFeaturesProvider } from './ChartFeaturesContext'
import { useChartSymbol } from './ChartSymbolContext'

interface ChartProvidersProps {
  children: React.ReactNode
}

// Higher-order component that provides chart symbol for nested providers
const ChartFeaturesWithSymbol: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { symbolState } = useChartSymbol()

  return (
    <ChartFeaturesProvider currentSymbol={symbolState.currentSymbol}>
      {children}
    </ChartFeaturesProvider>
  )
}

// Higher-order component that provides controls with timeframe sync
const ChartControlsWithSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { symbolActions } = useChartSymbol()

  return (
    <ChartControlsProvider onTimeframeChange={symbolActions.handleTimeframeChange}>
      {children}
    </ChartControlsProvider>
  )
}

/**
 * Hierarchical chart providers that manage different aspects of chart functionality
 *
 * Provider Hierarchy:
 * 1. ChartSymbolProvider - Symbol management and URL integration
 * 2. ChartControlsProvider - Chart controls (timeframe, chart type, timezone)
 * 3. ChartFeaturesProvider - Chart features (settings, indicators, watchlist, alerts)
 *
 * Each provider has a single responsibility and can be used independently
 */
export const ChartProviders: React.FC<ChartProvidersProps> = ({ children }) => {
  return (
    <ChartSymbolProvider>
      <ChartControlsWithSync>
        <ChartFeaturesWithSymbol>{children}</ChartFeaturesWithSymbol>
      </ChartControlsWithSync>
    </ChartSymbolProvider>
  )
}

// Individual providers for more granular control
export { ChartSymbolProvider, ChartControlsProvider, ChartFeaturesProvider }
