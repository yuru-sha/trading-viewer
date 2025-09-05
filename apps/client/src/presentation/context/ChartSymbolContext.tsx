import React, { createContext, useContext, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSymbolManagement } from '@/presentation/hooks/useSymbolManagement'
import { log } from '@/infrastructure/services/LoggerService'

interface ChartSymbolContextType {
  // URL Management
  symbolFromUrl: string

  // Symbol State & Actions
  symbolState: ReturnType<typeof useSymbolManagement>[0]
  symbolActions: ReturnType<typeof useSymbolManagement>[1]

  // URL-integrated symbol change handler
  handleSymbolChange: (symbol: string) => void
}

const ChartSymbolContext = createContext<ChartSymbolContextType | null>(null)

export const useChartSymbol = () => {
  const context = useContext(ChartSymbolContext)
  if (!context) {
    throw new Error('useChartSymbol must be used within a ChartSymbolProvider')
  }
  return context
}

interface ChartSymbolProviderProps {
  children: React.ReactNode
  defaultTimeframe?: string
}

export const ChartSymbolProvider: React.FC<ChartSymbolProviderProps> = ({
  children,
  defaultTimeframe = 'D',
}) => {
  // Get symbol from URL params
  const [searchParams, setSearchParams] = useSearchParams()
  const symbolFromUrl = searchParams.get('symbol') || 'AAPL'

  // Symbol management hook with URL param as initial value
  const [symbolState, symbolActions] = useSymbolManagement(symbolFromUrl, defaultTimeframe)

  // Handle symbol change with URL update
  const handleSymbolChange = useCallback(
    (symbol: string) => {
      log.business.info('Symbol change requested', {
        newSymbol: symbol,
        currentSymbol: symbolFromUrl,
      })

      // Update URL parameter
      setSearchParams(
        prev => {
          const newParams = new URLSearchParams(prev)
          newParams.set('symbol', symbol)
          log.business.info('Symbol URL parameter updated', {
            urlParams: newParams.toString(),
            symbol,
          })
          return newParams
        },
        { replace: true }
      )

      // Call original symbol change handler
      symbolActions.handleSymbolChange(symbol)
    },
    [setSearchParams, symbolActions, symbolFromUrl]
  )

  const contextValue: ChartSymbolContextType = {
    symbolFromUrl,
    symbolState,
    symbolActions: {
      ...symbolActions,
      handleSymbolChange, // Override with URL-updating version
    },
    handleSymbolChange,
  }

  return <ChartSymbolContext.Provider value={contextValue}>{children}</ChartSymbolContext.Provider>
}
