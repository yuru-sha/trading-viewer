import React, { createContext, useContext, useRef, useCallback } from 'react'
import { ChartContainerRef } from '../components/chart/ChartContainer'
import { ChartSettings as ChartSettingsType } from '../components/chart/ChartSettings'
import { useChartSettings } from '../hooks/useChartSettings'
import { useIndicators } from '../hooks/useIndicators'
import { useChartWatchlist } from '../hooks/useChartWatchlist'
import { useChartAlerts } from '../hooks/useChartAlerts'
import { useChartControlsContext } from './ChartControlsContext'

interface ChartFeaturesContextType {
  // Chart Settings
  chartSettings: ChartSettingsType
  handleSettingsChange: (settings: ChartSettingsType) => void

  // UI State
  showDrawingTools: boolean
  setShowDrawingTools: (show: boolean) => void
  showFooter: boolean
  setShowFooter: (show: boolean) => void

  // Indicators
  indicatorsQuery: ReturnType<typeof useIndicators>

  // Watchlist
  watchlistState: ReturnType<typeof useChartWatchlist>[0]
  watchlistActions: ReturnType<typeof useChartWatchlist>[1]

  // Alerts
  alertState: ReturnType<typeof useChartAlerts>[0]
  alertActions: ReturnType<typeof useChartAlerts>[1]

  // Chart Reference & Actions
  chartInstanceRef: React.RefObject<ChartContainerRef>
  takeScreenshot: () => void
  saveTemplate: () => void
}

const ChartFeaturesContext = createContext<ChartFeaturesContextType | null>(null)

export const useChartFeatures = () => {
  const context = useContext(ChartFeaturesContext)
  if (!context) {
    throw new Error('useChartFeatures must be used within a ChartFeaturesProvider')
  }
  return context
}

interface ChartFeaturesProviderProps {
  children: React.ReactNode
  currentSymbol: string
}

export const ChartFeaturesProvider: React.FC<ChartFeaturesProviderProps> = ({
  children,
  currentSymbol,
}) => {
  // Get timeframe from chart controls context
  const { controlsState } = useChartControlsContext()
  const selectedTimeframe = controlsState.selectedTimeframe

  // Chart settings hook
  const {
    chartSettings,
    handleSettingsChange,
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,
  } = useChartSettings()

  // Indicators management hook (API integrated) - now with timeframe
  const indicatorsQuery = useIndicators(currentSymbol, selectedTimeframe)

  // Watchlist management hook
  const [watchlistState, watchlistActions] = useChartWatchlist(currentSymbol)

  // Alerts management hook
  const [alertState, alertActions] = useChartAlerts(currentSymbol)

  // Chart instance ref for accessing screenshot functionality
  const chartInstanceRef = useRef<ChartContainerRef>(null)

  // Handle screenshot
  const takeScreenshot = useCallback(() => {
    if (chartInstanceRef.current?.takeScreenshot) {
      const filename = `${currentSymbol}-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`
      chartInstanceRef.current.takeScreenshot(filename)
    } else {
      console.warn('Screenshot functionality not available')
    }
  }, [currentSymbol])

  // Handle save template
  const saveTemplate = useCallback(() => {
    console.log('Save template functionality would be implemented here')
  }, [])

  const contextValue: ChartFeaturesContextType = {
    // Chart Settings
    chartSettings,
    handleSettingsChange,

    // UI State
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,

    // Indicators
    indicatorsQuery,

    // Watchlist
    watchlistState,
    watchlistActions,

    // Alerts
    alertState,
    alertActions,

    // Chart Reference & Actions
    chartInstanceRef,
    takeScreenshot,
    saveTemplate,
  }

  return (
    <ChartFeaturesContext.Provider value={contextValue}>{children}</ChartFeaturesContext.Provider>
  )
}
