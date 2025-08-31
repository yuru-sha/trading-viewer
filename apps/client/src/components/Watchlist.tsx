import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@trading-viewer/ui'
import { api } from '../lib/apiClient'
import ConfirmDialog from './common/ConfirmDialog'
import { log } from '../services/logger'

interface WatchlistSymbol {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  lastUpdate: number
}

interface WatchlistProps {
  currentSymbol?: string
  onSymbolSelect: (symbol: string) => void
  className?: string
}

// Default watchlist symbols
const defaultSymbols = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
]

export const Watchlist: React.FC<WatchlistProps> = ({
  currentSymbol,
  onSymbolSelect,
  className = '',
}) => {
  const [watchlist, setWatchlist] = useState<WatchlistSymbol[]>([])
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<{ symbol: string; name: string } | null>(null)

  const fetchWatchlistData = useCallback(
    async (symbols: Array<{ symbol: string; name: string }>) => {
      setLoading(true)
      try {
        const promises = symbols.map(async ({ symbol, name }) => {
          try {
            const quote = await api.market.getQuote(symbol)
            return {
              symbol,
              name,
              price: quote.c,
              change: quote.d,
              changePercent: quote.dp,
              lastUpdate: Date.now(),
            }
          } catch (error) {
            log.business.warn(`Failed to fetch data for ${symbol}`, error, {
              operation: 'watchlist_quote_fetch',
              symbol,
            })
            return {
              symbol,
              name,
              price: 0,
              change: 0,
              changePercent: 0,
              lastUpdate: Date.now(),
            }
          }
        })

        const results = await Promise.all(promises)
        setWatchlist(results)

        // Save to localStorage
        const symbolsToSave = symbols.map(s => ({ symbol: s.symbol, name: s.name }))
        localStorage.setItem('tradingviewer-watchlist', JSON.stringify(symbolsToSave))
      } catch (error) {
        log.business.error('Failed to fetch watchlist data', error, {
          operation: 'watchlist_batch_fetch',
          symbolCount: symbols.length,
        })
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tradingviewer-watchlist')
    if (saved) {
      try {
        const symbols = JSON.parse(saved)
        fetchWatchlistData(symbols)
      } catch {
        // If parsing fails, use default symbols
        fetchWatchlistData(defaultSymbols)
      }
    } else {
      fetchWatchlistData(defaultSymbols)
    }
  }, [fetchWatchlistData])

  // Remove symbol from watchlist
  const removeFromWatchlist = (symbol: string) => {
    const updatedWatchlist = watchlist.filter(item => item.symbol !== symbol)
    setWatchlist(updatedWatchlist)

    // Save to localStorage
    const symbolsToSave = updatedWatchlist.map(item => ({ symbol: item.symbol, name: item.name }))
    localStorage.setItem('tradingviewer-watchlist', JSON.stringify(symbolsToSave))
    setDeleteConfirm(null)
  }

  // Refresh watchlist data
  const refreshWatchlist = () => {
    const symbols = watchlist.map(item => ({ symbol: item.symbol, name: item.name }))
    fetchWatchlistData(symbols)
  }

  // Format price change
  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`
  }

  // Get time since last update
  const getTimeSinceUpdate = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}
    >
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center space-x-2'>
          <svg
            className='w-5 h-5 text-gray-600 dark:text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
            />
          </svg>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Watchlist</h3>
          <span className='text-sm text-gray-500 dark:text-gray-400'>({watchlist.length})</span>
        </div>

        <div className='flex items-center space-x-2'>
          <button
            onClick={refreshWatchlist}
            disabled={loading}
            className='p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50'
            title='Refresh watchlist'
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className='p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 9l-7 7-7-7'
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Watchlist Items */}
      {isExpanded && (
        <div className='max-h-96 overflow-y-auto'>
          {loading && watchlist.length === 0 ? (
            <div className='p-4 text-center'>
              <div className='animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600 mx-auto mb-2'></div>
              <p className='text-sm text-gray-500 dark:text-gray-400'>Loading watchlist...</p>
            </div>
          ) : watchlist.length > 0 ? (
            <div className='divide-y divide-gray-200 dark:divide-gray-700'>
              {watchlist.map(item => (
                <div
                  key={item.symbol}
                  role='button'
                  tabIndex={0}
                  className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    currentSymbol === item.symbol ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => onSymbolSelect(item.symbol)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSymbolSelect(item.symbol)
                    }
                  }}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm font-semibold text-gray-900 dark:text-white truncate'>
                          {item.symbol}
                        </span>
                        <div className='flex items-center space-x-1'>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              window.open(`/charts?symbol=${item.symbol}`, '_blank')
                            }}
                            className='p-1 text-gray-400 hover:text-blue-500 transition-colors'
                            title='Open in new tab'
                          >
                            <svg
                              className='w-3 h-3'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                              />
                            </svg>
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setDeleteConfirm({ symbol: item.symbol, name: item.name })
                            }}
                            className='p-1 text-gray-400 hover:text-red-500 transition-colors'
                            title='Remove from watchlist'
                          >
                            <svg
                              className='w-3 h-3'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M6 18L18 6M6 6l12 12'
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                        {item.name}
                      </p>

                      <div className='mt-1 flex items-center justify-between'>
                        <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                          ${item.price.toFixed(2)}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            item.change >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatChange(item.change, item.changePercent)}
                        </span>
                      </div>

                      <p className='text-xs text-gray-400 mt-1'>
                        Updated {getTimeSinceUpdate(item.lastUpdate)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='p-6 text-center'>
              <svg
                className='w-12 h-12 text-gray-400 mx-auto mb-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                />
              </svg>
              <h3 className='text-sm font-medium text-gray-900 dark:text-white mb-2'>
                Empty Watchlist
              </h3>
              <p className='text-xs text-gray-500 dark:text-gray-400 mb-4'>
                Add symbols to track their prices
              </p>
              <Button
                variant='primary'
                size='sm'
                onClick={() => fetchWatchlistData(defaultSymbols)}
                disabled={false}
                className='text-xs'
              >
                Load Default Symbols
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onConfirm={() => {
          if (deleteConfirm) {
            removeFromWatchlist(deleteConfirm.symbol)
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
        title='Delete Selected Items'
        message={`Are you sure you want to remove 1 item from your watchlist? This action cannot be undone.`}
        confirmText='Delete'
        cancelText='Cancel'
      />
    </div>
  )
}

export default Watchlist
