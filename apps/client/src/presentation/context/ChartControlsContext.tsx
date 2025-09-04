import React, { createContext, useContext, useCallback } from 'react'
import { log } from '@/infrastructure/services/LoggerService'
import { ChartType } from '@trading-viewer/shared'
import { useChartControls } from '@/presentation/hooks/useChartControls'

interface ChartControlsContextType {
  // Controls State & Actions
  controlsState: ReturnType<typeof useChartControls>[0]
  controlsActions: ReturnType<typeof useChartControls>[1]

  // Enhanced action handlers
  handleTimeframeChange: (timeframe: string) => void
  handleChartTypeChange: (type: ChartType) => void
  handleTimezoneChange: (timezone: string) => void
}

const ChartControlsContext = createContext<ChartControlsContextType | null>(null)

export const useChartControlsContext = () => {
  const context = useContext(ChartControlsContext)
  if (!context) {
    log.error(
      'Chart controls context error: useChartControlsContext must be used within a ChartControlsProvider'
    )
    throw new Error('useChartControlsContext must be used within a ChartControlsProvider')
  }
  return context
}

interface ChartControlsProviderProps {
  children: React.ReactNode
  defaultTimeframe?: string
  defaultChartType?: ChartType
  defaultTimezone?: string
  onTimeframeChange?: (timeframe: string) => void
}

export const ChartControlsProvider: React.FC<ChartControlsProviderProps> = ({
  children,
  defaultTimeframe = 'D',
  defaultChartType = 'candle',
  defaultTimezone = 'UTC',
  onTimeframeChange,
}) => {
  // Chart controls hook
  const [controlsState, controlsActions] = useChartControls(
    defaultTimeframe,
    defaultChartType as ChartType,
    defaultTimezone
  )

  // Handle timeframe change (bridge between controls and external handlers)
  const handleTimeframeChange = useCallback(
    (timeframe: string) => {
      controlsActions.setSelectedTimeframe(timeframe)
      controlsActions.setShowTimeframeDropdown(false)

      // Notify external handler if provided
      if (onTimeframeChange) {
        onTimeframeChange(timeframe)
      }
    },
    [controlsActions, onTimeframeChange]
  )

  // Handle chart type change
  const handleChartTypeChange = useCallback(
    (type: ChartType) => {
      controlsActions.setChartType(type)
      controlsActions.setShowChartTypeDropdown(false)
    },
    [controlsActions]
  )

  // Handle timezone change
  const handleTimezoneChange = useCallback(
    (timezone: string) => {
      controlsActions.setSelectedTimezone(timezone)
      controlsActions.setShowTimezoneDropdown(false)
    },
    [controlsActions]
  )

  const contextValue: ChartControlsContextType = {
    controlsState,
    controlsActions,
    handleTimeframeChange,
    handleChartTypeChange,
    handleTimezoneChange,
  }

  return (
    <ChartControlsContext.Provider value={contextValue}>{children}</ChartControlsContext.Provider>
  )
}
