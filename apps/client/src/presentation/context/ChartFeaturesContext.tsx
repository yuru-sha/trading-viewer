import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react'
import { ChartContainerRef } from '@/presentation/components/chart/ChartContainer'
import { ChartSettings as ChartSettingsType } from '@/presentation/components/chart/ChartSettings'
import { useChartSettings } from '@/presentation/hooks/useChartSettings'
import { useIndicators } from '@/presentation/hooks/useIndicators'
import { useChartWatchlist } from '@/presentation/hooks/useChartWatchlist'
import { useChartAlerts } from '@/presentation/hooks/useChartAlerts'
import { useChartControlsContext } from './ChartControlsContext'
import { useAuth } from './AuthContext'
import { api } from '@/infrastructure/adapters/apiClient'
import { log } from '@/infrastructure/services/LoggerService'

// ===== Separate Context Types =====

type ChartSettingsContextType = {
  chartSettings: ChartSettingsType
  handleSettingsChange: (settings: ChartSettingsType) => void
  showDrawingTools: boolean
  setShowDrawingTools: (show: boolean) => void
  showFooter: boolean
  setShowFooter: (show: boolean) => void
}

type ChartDataContextType = {
  indicatorsQuery: ReturnType<typeof useIndicators>
}

type ChartUserFeaturesContextType = {
  watchlistState: ReturnType<typeof useChartWatchlist>[0]
  watchlistActions: ReturnType<typeof useChartWatchlist>[1]
  alertState: ReturnType<typeof useChartAlerts>[0]
  alertActions: ReturnType<typeof useChartAlerts>[1]
}

type ChartActionsContextType = {
  chartInstanceRef: React.RefObject<ChartContainerRef>
  takeScreenshot: () => void
  loadDefaultChart: () => void
  isLoadingChart: boolean
}

// ===== Context Definitions =====

const ChartSettingsContext = createContext<ChartSettingsContextType | null>(null)
const ChartDataContext = createContext<ChartDataContextType | null>(null)
const ChartUserFeaturesContext = createContext<ChartUserFeaturesContextType | null>(null)
const ChartActionsContext = createContext<ChartActionsContextType | null>(null)

// ===== New Hook Definitions =====

export const useNewChartSettings = () => {
  const context = useContext(ChartSettingsContext)
  if (!context) {
    throw new Error('useNewChartSettings must be used within a ChartSettingsProvider')
  }
  return context
}

export const useChartData = () => {
  const context = useContext(ChartDataContext)
  if (!context) {
    throw new Error('useChartData must be used within a ChartDataProvider')
  }
  return context
}

export const useChartUserFeatures = () => {
  const context = useContext(ChartUserFeaturesContext)
  if (!context) {
    throw new Error('useChartUserFeatures must be used within a ChartUserFeaturesProvider')
  }
  return context
}

export const useChartActions = () => {
  const context = useContext(ChartActionsContext)
  if (!context) {
    throw new Error('useChartActions must be used within a ChartActionsProvider')
  }
  return context
}

// ===== Individual Providers =====

type ChartSettingsProviderProps = {
  children: React.ReactNode
}

export const ChartSettingsProvider: React.FC<ChartSettingsProviderProps> = ({ children }) => {
  const {
    chartSettings,
    handleSettingsChange,
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,
  } = useChartSettings()

  const contextValue: ChartSettingsContextType = {
    chartSettings,
    handleSettingsChange,
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,
  }

  return (
    <ChartSettingsContext.Provider value={contextValue}>{children}</ChartSettingsContext.Provider>
  )
}

type ChartDataProviderProps = {
  children: React.ReactNode
  currentSymbol: string
}

export const ChartDataProvider: React.FC<ChartDataProviderProps> = ({
  children,
  currentSymbol,
}) => {
  const { controlsState } = useChartControlsContext()
  const selectedTimeframe = controlsState.selectedTimeframe

  const indicatorsQuery = useIndicators(currentSymbol, selectedTimeframe)

  const contextValue: ChartDataContextType = {
    indicatorsQuery,
  }

  return <ChartDataContext.Provider value={contextValue}>{children}</ChartDataContext.Provider>
}

type ChartUserFeaturesProviderProps = {
  children: React.ReactNode
  currentSymbol: string
}

export const ChartUserFeaturesProvider: React.FC<ChartUserFeaturesProviderProps> = ({
  children,
  currentSymbol,
}) => {
  const [watchlistState, watchlistActions] = useChartWatchlist(currentSymbol)
  const [alertState, alertActions] = useChartAlerts(currentSymbol)

  const contextValue: ChartUserFeaturesContextType = {
    watchlistState,
    watchlistActions,
    alertState,
    alertActions,
  }

  return (
    <ChartUserFeaturesContext.Provider value={contextValue}>
      {children}
    </ChartUserFeaturesContext.Provider>
  )
}

type ChartActionsProviderProps = {
  children: React.ReactNode
  currentSymbol: string
}

export const ChartActionsProvider: React.FC<ChartActionsProviderProps> = ({
  children,
  currentSymbol,
}) => {
  const { isAuthenticated } = useAuth()
  const { controlsState } = useChartControlsContext()
  const selectedTimeframe = controlsState.selectedTimeframe
  const { handleSettingsChange, chartSettings } = useNewChartSettings()

  const chartInstanceRef = useRef<ChartContainerRef>(null)
  const [isLoadingChart, setIsLoadingChart] = React.useState(false)

  const takeScreenshot = useCallback(() => {
    if (chartInstanceRef.current?.takeScreenshot) {
      const filename = `${currentSymbol}-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`
      chartInstanceRef.current.takeScreenshot(filename)
    } else {
      log.business.warn('Screenshot functionality not available for current chart')
    }
  }, [currentSymbol])

  const loadDefaultChart = useCallback(async () => {
    if (!isAuthenticated || !currentSymbol || !selectedTimeframe) return

    try {
      setIsLoadingChart(true)
      const response = await api.charts.getDefaultChart(currentSymbol, selectedTimeframe)

      if (response.success && response.data) {
        const chartData = response.data

        try {
          const savedSettings = JSON.parse(chartData.chartSettings)
          const savedIndicators = JSON.parse(chartData.indicators)

          handleSettingsChange({
            ...chartSettings,
            chartType: chartData.chartType as 'candlestick' | 'line' | 'area',
            ...savedSettings,
            indicators: savedIndicators,
          })

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
      log.business.info('No default chart found', {
        symbol: currentSymbol,
        timeframe: selectedTimeframe,
      })
    } finally {
      setIsLoadingChart(false)
    }
  }, [isAuthenticated, currentSymbol, selectedTimeframe, chartSettings, handleSettingsChange])

  useEffect(() => {
    if (isAuthenticated && currentSymbol && selectedTimeframe) {
      loadDefaultChart()
    }
  }, [isAuthenticated, currentSymbol, selectedTimeframe, loadDefaultChart])

  const contextValue: ChartActionsContextType = {
    chartInstanceRef,
    takeScreenshot,
    loadDefaultChart,
    isLoadingChart,
  }

  return (
    <ChartActionsContext.Provider value={contextValue}>{children}</ChartActionsContext.Provider>
  )
}

// ===== Combined Provider =====

type ChartFeaturesProviderProps = {
  children: React.ReactNode
  currentSymbol: string
}

export const ChartContextProvider: React.FC<ChartFeaturesProviderProps> = ({
  children,
  currentSymbol,
}) => {
  return (
    <ChartSettingsProvider>
      <ChartDataProvider currentSymbol={currentSymbol}>
        <ChartUserFeaturesProvider currentSymbol={currentSymbol}>
          <ChartActionsProvider currentSymbol={currentSymbol}>{children}</ChartActionsProvider>
        </ChartUserFeaturesProvider>
      </ChartDataProvider>
    </ChartSettingsProvider>
  )
}

// ===== Legacy Compatibility =====

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

export const ChartFeaturesProvider: React.FC<ChartFeaturesProviderProps> = ({
  children,
  currentSymbol,
}) => {
  const { isAuthenticated } = useAuth()
  const { controlsState } = useChartControlsContext()
  const selectedTimeframe = controlsState.selectedTimeframe

  const {
    chartSettings,
    handleSettingsChange,
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,
  } = useChartSettings()

  const indicatorsQuery = useIndicators(currentSymbol, selectedTimeframe)
  const [watchlistState, watchlistActions] = useChartWatchlist(currentSymbol)
  const [alertState, alertActions] = useChartAlerts(currentSymbol)

  const chartInstanceRef = useRef<ChartContainerRef>(null)

  const takeScreenshot = useCallback(() => {
    if (chartInstanceRef.current?.takeScreenshot) {
      const filename = `${currentSymbol}-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.png`
      chartInstanceRef.current.takeScreenshot(filename)
    } else {
      log.business.warn('Screenshot functionality not available for current chart')
    }
  }, [currentSymbol])

  const [isLoadingChart, setIsLoadingChart] = React.useState(false)

  const loadDefaultChart = useCallback(async () => {
    if (!isAuthenticated || !currentSymbol || !selectedTimeframe) return

    try {
      setIsLoadingChart(true)
      const response = await api.charts.getDefaultChart(currentSymbol, selectedTimeframe)

      if (response.success && response.data) {
        const chartData = response.data

        try {
          const savedSettings = JSON.parse(chartData.chartSettings)
          const savedIndicators = JSON.parse(chartData.indicators)

          handleSettingsChange({
            ...chartSettings,
            chartType: chartData.chartType as 'candlestick' | 'line' | 'area',
            ...savedSettings,
            indicators: savedIndicators,
          })

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
      log.business.info('No default chart found', {
        symbol: currentSymbol,
        timeframe: selectedTimeframe,
      })
    } finally {
      setIsLoadingChart(false)
    }
  }, [isAuthenticated, currentSymbol, selectedTimeframe, chartSettings, handleSettingsChange])

  useEffect(() => {
    if (isAuthenticated && currentSymbol && selectedTimeframe) {
      loadDefaultChart()
    }
  }, [isAuthenticated, currentSymbol, selectedTimeframe, loadDefaultChart])

  const contextValue: ChartFeaturesContextType = {
    chartSettings,
    handleSettingsChange,
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,
    indicatorsQuery,
    watchlistState,
    watchlistActions,
    alertState,
    alertActions,
    chartInstanceRef,
    takeScreenshot,
    loadDefaultChart,
    isLoadingChart,
  }

  return (
    <ChartFeaturesContext.Provider value={contextValue}>{children}</ChartFeaturesContext.Provider>
  )
}
