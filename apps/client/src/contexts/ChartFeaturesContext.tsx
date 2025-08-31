import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react'
import { ChartContainerRef } from '../components/chart/ChartContainer'
import { ChartSettings as ChartSettingsType } from '../components/chart/ChartSettings'
import { useChartSettings } from '../hooks/useChartSettings'
import { useIndicators } from '../hooks/useIndicators'
import { useChartWatchlist } from '../hooks/useChartWatchlist'
import { useChartAlerts } from '../hooks/useChartAlerts'
import { useChartControlsContext } from './ChartControlsContext'
import { useAuth } from './AuthContext'
import { api } from '../lib/apiClient'
import { log } from '../services/logger'

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
  loadDefaultChart: () => void
  isLoadingChart: boolean
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
  const { isAuthenticated } = useAuth()
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
      log.business.warn('Screenshot functionality not available for current chart')
    }
  }, [currentSymbol])

  // Chart restoration state
  const [isLoadingChart, setIsLoadingChart] = React.useState(false)

  // Load default chart for current symbol/timeframe
  const loadDefaultChart = useCallback(async () => {
    if (!isAuthenticated || !currentSymbol || !selectedTimeframe) return

    try {
      setIsLoadingChart(true)
      const response = await api.charts.getDefaultChart(currentSymbol, selectedTimeframe)

      if (response.success && response.data) {
        const chartData = response.data

        // Parse and apply chart settings
        try {
          const savedSettings = JSON.parse(chartData.chartSettings)
          const savedIndicators = JSON.parse(chartData.indicators)

          // Apply settings to chart
          handleSettingsChange({
            ...chartSettings,
            chartType: chartData.chartType as any,
            ...savedSettings,
            indicators: savedIndicators,
          })

          // TODO: Apply drawing tools when drawing tools are implemented
          // const savedDrawingTools = JSON.parse(chartData.drawingTools)

          log.business.info('Default chart loaded successfully', {
            chartName: chartData.name,
            symbol: currentSymbol,
            timeframe: selectedTimeframe,
          })
        } catch (parseError) {
          log.business.error('Error parsing saved chart data', parseError as Error, {
            symbol: currentSymbol,
            timeframe: selectedTimeframe,
          })
        }
      }
    } catch {
      // No default chart found or error - this is not necessarily an error
      log.business.info('No default chart found', {
        symbol: currentSymbol,
        timeframe: selectedTimeframe,
      })
    } finally {
      setIsLoadingChart(false)
    }
  }, [isAuthenticated, currentSymbol, selectedTimeframe, chartSettings, handleSettingsChange])

  // Load default chart when symbol or timeframe changes
  useEffect(() => {
    if (isAuthenticated && currentSymbol && selectedTimeframe) {
      loadDefaultChart()
    }
  }, [isAuthenticated, currentSymbol, selectedTimeframe])

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
    loadDefaultChart,
    isLoadingChart,
  }

  return (
    <ChartFeaturesContext.Provider value={contextValue}>{children}</ChartFeaturesContext.Provider>
  )
}
