import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/apiClient'

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
  const checkWatchlistStatus = async () => {
    if (!isAuthenticated || !currentSymbol) return

    try {
      const response = await api.watchlist.get()
      const isSymbolInWatchlist = response.data?.watchlist?.some(
        (item: any) => item.symbol === currentSymbol
      )
      setIsInWatchlist(!!isSymbolInWatchlist)
    } catch {
      console.error('Operation failed')
      setIsInWatchlist(false)
    }
  }

  useEffect(() => {
    checkWatchlistStatus()
  }, [currentSymbol, isAuthenticated])

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
        console.log(`${currentSymbol} removed from watchlist`)
      } else {
        // Add to watchlist
        const symbolName = getSymbolName(currentSymbol)
        await api.watchlist.add(currentSymbol, symbolName)
        setIsInWatchlist(true)
        console.log(`${currentSymbol} added to watchlist`)
      }
    } catch {
      console.error('Operation failed')
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
