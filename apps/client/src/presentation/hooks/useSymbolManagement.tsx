import React, { useState, useEffect, useCallback } from 'react'
import { QuoteData, ApiCandleData, DataSourceInfo } from '@trading-viewer/shared'
import { api } from '@/infrastructure/adapters/apiClient'
import { useApp, useAppActions } from '@/presentation/context/AppContext'
import { useWebSocket } from '@/presentation/hooks/useWebSocket'
import { PriceData } from '@/infrastructure/utils/indicators'
import { log } from '@/infrastructure/services/LoggerService'

interface SymbolManagementState {
  currentSymbol: string
  quoteData: QuoteData | null
  candleData: ApiCandleData | null
  dataSource: DataSourceInfo | null
  loading: boolean
  chartData: PriceData[]
}

interface SymbolManagementActions {
  fetchData: (symbol: string, timeframe?: string) => Promise<void>
  handleSymbolChange: (symbol: string) => void
  handleTimeframeChange: (timeframe: string) => void
}

export const useSymbolManagement = (
  defaultSymbol: string = 'AAPL',
  initialTimeframe: string = 'D'
): [SymbolManagementState, SymbolManagementActions] => {
  const { state } = useApp()
  const { setSelectedSymbol, setTimeframe, setError } = useAppActions()
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null)
  const [candleData, setCandleData] = useState<ApiCandleData | null>(null)
  const [dataSource, setDataSource] = useState<DataSourceInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState(initialTimeframe)
  const [lastFetchedSymbol, setLastFetchedSymbol] = useState<string | null>(null)

  // URL からの symbol を優先し、次に AppContext、最後にデフォルト
  const currentSymbol = defaultSymbol || state.selectedSymbol || 'AAPL'

  // WebSocket for real-time data
  const { isConnected, lastQuote, subscribe, unsubscribe } = useWebSocket({
    autoConnect: true,
  })

  const fetchData = useCallback(
    async (symbol: string, timeframe: string = selectedTimeframe) => {
      if (!symbol) return

      log.business.info('Fetching data for symbol', {
        operation: 'fetch_data',
        symbol,
        timeframe,
      })

      try {
        setLoading(true)
        setError(null)

        const fromTime =
          Math.floor(Date.now() / 1000) -
          (timeframe === 'M'
            ? 86400 * 365 // 1 year for monthly
            : timeframe === 'W'
              ? 86400 * 180 // 6 months for weekly
              : timeframe === 'D'
                ? 86400 * 90 // 3 months for daily
                : 86400 * 7) // 1 week for intraday

        const [quote, candles] = await Promise.all([
          api.market.getQuote(symbol),
          api.market.getCandleData({
            symbol,
            resolution: timeframe,
            from: fromTime,
            to: Math.floor(Date.now() / 1000),
          }),
        ])

        setQuoteData(quote)
        setCandleData(candles)
        setLastFetchedSymbol(symbol)

        // Update global state
        if (symbol !== state.selectedSymbol) {
          setSelectedSymbol(symbol)
        }
      } catch (error) {
        log.business.error('Failed to fetch chart data', error as Error, {
          operation: 'fetch_data',
          symbol,
          timeframe,
        })
        setError(error instanceof Error ? error.message : 'Failed to load chart data')
      } finally {
        setLoading(false)
      }
    },
    [selectedTimeframe, setError, state.selectedSymbol, setSelectedSymbol]
  )

  const handleSymbolChange = useCallback(
    (symbol: string) => {
      log.business.info('Symbol change requested', {
        operation: 'symbol_change',
        newSymbol: symbol,
        currentSymbol,
      })

      if (currentSymbol && isConnected) {
        unsubscribe(currentSymbol)
      }

      // fetchData will update AppContext state
      fetchData(symbol)
      if (isConnected) {
        subscribe(symbol)
      }
    },
    [currentSymbol, isConnected, fetchData, subscribe, unsubscribe]
  )

  const handleTimeframeChange = useCallback(
    (timeframe: string) => {
      setSelectedTimeframe(timeframe)
      setTimeframe(timeframe) // Update global state
      fetchData(currentSymbol, timeframe)
    },
    [currentSymbol, fetchData, setTimeframe]
  )

  // Fetch data source info on mount
  useEffect(() => {
    const fetchDataSource = async () => {
      try {
        const dataSourceInfo = await api.market.getDataSource()
        setDataSource(dataSourceInfo)
      } catch (error) {
        log.business.error('Failed to fetch data source info', error as Error, {
          operation: 'fetch_data_source',
        })
      }
    }
    fetchDataSource()
  }, [])

  // Initial data fetch when component mounts or symbol changes - prevent infinite loop
  useEffect(() => {
    if (currentSymbol && currentSymbol !== lastFetchedSymbol) {
      fetchData(currentSymbol)
    }
  }, [currentSymbol, lastFetchedSymbol, fetchData])

  // Separate effect for WebSocket subscription management
  useEffect(() => {
    if (isConnected && currentSymbol) {
      subscribe(currentSymbol)
    }

    return () => {
      if (currentSymbol && isConnected) {
        unsubscribe(currentSymbol)
      }
    }
  }, [currentSymbol, isConnected, subscribe, unsubscribe])

  // Update quote data from WebSocket
  useEffect(() => {
    if (lastQuote) {
      setQuoteData(lastQuote)
    }
  }, [lastQuote])

  // Convert API data to chart format
  const chartData: PriceData[] = React.useMemo(() => {
    if (!candleData || !candleData.c || candleData.c.length === 0) return []

    const baseChartData = candleData.c
      .map((close, index) => ({
        timestamp: candleData.t[index],
        open: candleData.o[index],
        high: candleData.h[index],
        low: candleData.l[index],
        close: close,
        volume: candleData.v?.[index] || 0,
      }))
      .filter(
        item =>
          item.timestamp &&
          item.open !== undefined &&
          item.high !== undefined &&
          item.low !== undefined &&
          item.close !== undefined
      )
      .sort((a, b) => a.timestamp - b.timestamp)

    // Update the latest candle with real-time data if available
    if (quoteData && baseChartData.length > 0) {
      const latestCandle = baseChartData[baseChartData.length - 1]
      const updatedCandle = {
        ...latestCandle,
        close: quoteData.c,
        high: Math.max(latestCandle.high, quoteData.c),
        low: Math.min(latestCandle.low, quoteData.c),
      }

      return [...baseChartData.slice(0, -1), updatedCandle]
    }

    return baseChartData
  }, [candleData, quoteData])

  const state_: SymbolManagementState = {
    currentSymbol,
    quoteData,
    candleData,
    dataSource,
    loading,
    chartData,
  }

  const actions: SymbolManagementActions = {
    fetchData,
    handleSymbolChange,
    handleTimeframeChange,
  }

  return [state_, actions]
}
