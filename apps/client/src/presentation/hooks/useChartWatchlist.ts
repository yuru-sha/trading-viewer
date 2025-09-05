import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/presentation/context/AuthContext'
import { api } from '@/infrastructure/adapters/apiClient'
import { log } from '@/infrastructure/services/LoggerService'

interface WatchlistState {
  isInWatchlist: boolean
  watchlistLoading: boolean
}

interface WatchlistActions {
  handleWatchlistToggle: () => Promise<void>
  checkWatchlistStatus: () => Promise<void>
}

export const useChartWatchlist = (currentSymbol: string): [WatchlistState, WatchlistActions] => {
  const { isAuthenticated } = useAuth()
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  // Check if current symbol is in watchlist
  const checkWatchlistStatus = useCallback(async () => {
    if (!isAuthenticated || !currentSymbol) return

    try {
      const response = await api.watchlist.get()
      const isSymbolInWatchlist = response.data?.watchlist?.some(
        (item: { symbol: string }) => item.symbol === currentSymbol
      )
      setIsInWatchlist(!!isSymbolInWatchlist)
    } catch {
      log.business.error('Failed to check watchlist status', { currentSymbol })
      setIsInWatchlist(false)
    }
  }, [isAuthenticated, currentSymbol])

  useEffect(() => {
    checkWatchlistStatus()
  }, [currentSymbol, isAuthenticated, checkWatchlistStatus])

  // Get symbol name for display
  const getSymbolName = (symbol: string): string => {
    const symbolNames = {
      AAPL: 'Apple Inc.',
      GOOGL: 'Alphabet Inc.',
      MSFT: 'Microsoft Corporation',
      TSLA: 'Tesla, Inc.',
      AMZN: 'Amazon.com Inc.',
      NVDA: 'NVIDIA Corporation',
      META: 'Meta Platforms, Inc.',
      NFLX: 'Netflix, Inc.',
    }
    return symbolNames[symbol as keyof typeof symbolNames] || `${symbol} Inc.`
  }

  // Handle watchlist add/remove
  const handleWatchlistToggle = async () => {
    if (!isAuthenticated || watchlistLoading) return

    setWatchlistLoading(true)
    try {
      if (isInWatchlist) {
        // Remove from watchlist
        await api.watchlist.remove(currentSymbol)
        setIsInWatchlist(false)
        log.business.info('Symbol removed from watchlist', { symbol: currentSymbol })
      } else {
        // Add to watchlist
        const symbolName = getSymbolName(currentSymbol)
        await api.watchlist.add(currentSymbol, symbolName)
        setIsInWatchlist(true)
        log.business.info('Symbol added to watchlist', { symbol: currentSymbol })
      }
    } catch {
      log.business.error('Failed to toggle watchlist', { symbol: currentSymbol, isInWatchlist })
    } finally {
      setWatchlistLoading(false)
    }
  }

  return [
    {
      isInWatchlist,
      watchlistLoading,
    },
    {
      handleWatchlistToggle,
      checkWatchlistStatus,
    },
  ]
}
