import React, { createContext, useContext, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChartType } from '@trading-viewer/shared'
import { ChartContainerRef } from '../components/chart/ChartContainer'
import { ChartSettings as ChartSettingsType } from '../components/chart/ChartSettings'
import { useChartControls } from '../hooks/useChartControls'
import { useSymbolManagement } from '../hooks/useSymbolManagement'
import { useIndicators } from '../hooks/useIndicators'
import { useChartWatchlist } from '../hooks/useChartWatchlist'
import { useChartAlerts } from '../hooks/useChartAlerts'
import { useChartSettings } from '../hooks/useChartSettings'

interface ChartContextType {
  // URL & Symbol Management
  symbolFromUrl: string
  symbolState: ReturnType<typeof useSymbolManagement>[0]
  symbolActions: ReturnType<typeof useSymbolManagement>[1]

  // Chart Controls
  controlsState: ReturnType<typeof useChartControls>[0]
  controlsActions: ReturnType<typeof useChartControls>[1]

  // Chart Settings
  chartSettings: ChartSettingsType
  handleSettingsChange: (settings: ChartSettingsType) => void

  // UI State
  showDrawingTools: boolean
  setShowDrawingTools: (show: boolean) => void
  showFooter: boolean
  setShowFooter: (show: boolean) => void

  // Indicators
  indicatorsManager: ReturnType<typeof useIndicators>

  // Watchlist
  watchlistState: ReturnType<typeof useChartWatchlist>[0]
  watchlistActions: ReturnType<typeof useChartWatchlist>[1]

  // Alerts
  alertState: ReturnType<typeof useChartAlerts>[0]
  alertActions: ReturnType<typeof useChartAlerts>[1]

  // Chart Reference
  chartInstanceRef: React.RefObject<ChartContainerRef>

  // Action Handlers
  handleTimeframeChange: (timeframe: string) => void
  handleChartTypeChange: (type: ChartType) => void
  handleTimezoneChange: (timezone: string) => void
  takeScreenshot: () => void
  saveTemplate: () => void
}

const ChartContext = createContext<ChartContextType | null>(null)

export const useChartContext = () => {
  const context = useContext(ChartContext)
  if (!context) {
    throw new Error('useChartContext must be used within a ChartProvider')
  }
  return context
}

interface ChartProviderProps {
  children: React.ReactNode
}

export const ChartProvider: React.FC<ChartProviderProps> = ({ children }) => {
  console.warn('ChartProvider is deprecated. Use ChartProviders from ChartProviders.tsx instead.')

  // Get symbol from URL params
  const [searchParams, setSearchParams] = useSearchParams()
  const symbolFromUrl = searchParams.get('symbol') || 'AAPL'

  // Chart controls hook
  const [controlsState, controlsActions] = useChartControls('D', 'candle', 'UTC')

  // Symbol management hook with URL param as initial value
  const [symbolState, symbolActions] = useSymbolManagement(
    symbolFromUrl,
    controlsState.selectedTimeframe
  )

  // Chart settings hook
  const {
    chartSettings,
    handleSettingsChange,
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,
  } = useChartSettings()

  // Indicators management hook
  const indicatorsManager = useIndicators()

  // Watchlist management hook
  const [watchlistState, watchlistActions] = useChartWatchlist(symbolState.currentSymbol)

  // Alerts management hook
  const [alertState, alertActions] = useChartAlerts(symbolState.currentSymbol)

  // Chart instance ref for accessing screenshot functionality
  const chartInstanceRef = useRef<ChartContainerRef>(null)

  // Handle symbol change with URL update
  const handleSymbolChange = useCallback(
    (symbol: string) => {
      console.log('🔄 ChartContext: Symbol change requested:', symbol)

      // Update URL parameter
      setSearchParams(
        prev => {
          const newParams = new URLSearchParams(prev)
          newParams.set('symbol', symbol)
          console.log('🔄 ChartContext: URL updated to:', newParams.toString())
          return newParams
        },
        { replace: true }
      )

      // Call original symbol change handler
      symbolActions.handleSymbolChange(symbol)
    },
    [setSearchParams, symbolActions]
  )

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

  const contextValue: ChartContextType = {
    // URL & Symbol Management
    symbolFromUrl,
    symbolState,
    symbolActions: {
      ...symbolActions,
      handleSymbolChange, // Override with URL-updating version
    },

    // Chart Controls
    controlsState,
    controlsActions,

    // Chart Settings
    chartSettings,
    handleSettingsChange,

    // UI State
    showDrawingTools,
    setShowDrawingTools,
    showFooter,
    setShowFooter,

    // Indicators
    indicatorsManager,

    // Watchlist
    watchlistState,
    watchlistActions,

    // Alerts
    alertState,
    alertActions,

    // Chart Reference
    chartInstanceRef,

    // Action Handlers
    handleTimeframeChange,
    handleChartTypeChange,
    handleTimezoneChange,
    takeScreenshot,
    saveTemplate,
  }

  return <ChartContext.Provider value={contextValue}>{children}</ChartContext.Provider>
}
