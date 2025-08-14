import React, { useState, useEffect } from 'react'
import { Button, Input, Loading } from '@trading-viewer/ui'
import { useApp, useAppActions } from '../contexts/AppContext'
import { api } from '../lib/apiClient'
import { apiService } from '../services/base/ApiService'

interface SearchResult {
  description: string
  displaySymbol: string
  symbol: string
  type: string
}

const SearchPage: React.FC = () => {
  const { state } = useApp()
  const {
    setSelectedSymbol,
    setError,
    addToWatchlist,
    removeFromWatchlist,
  } = useAppActions()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [addingToWatchlist, setAddingToWatchlist] = useState<Set<string>>(new Set())
  const [watchlistItems, setWatchlistItems] = useState<
    Array<{ symbol: string; name: string; addedAt: string }>
  >([])

  // ユーザーのウォッチリストを取得
  const fetchWatchlist = async () => {
    try {
      const response = await apiService.get('/watchlist')
      if (response.success && response.data?.watchlist) {
        setWatchlistItems(response.data.watchlist)
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error)
    }
  }

  // ウォッチリストから削除
  const handleRemoveFromWatchlist = async (symbol: string) => {
    try {
      const response = await apiService.delete(`/watchlist/${symbol}`)
      if (response.success) {
        // ウォッチリストを再取得して表示を更新
        await fetchWatchlist()
        console.log(`Removed ${symbol} from watchlist`)
      } else {
        setError(`Failed to remove ${symbol} from watchlist`)
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove from watchlist')
    }
  }

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setHasSearched(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const results = await api.market.searchSymbols({ q: query, limit: 20 })
      setSearchResults(results.symbols || [])
      setHasSearched(true)
    } catch (error) {
      console.error('Search failed:', error)
      setError(error instanceof Error ? error.message : 'Search failed')
      setSearchResults([])
      setHasSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToWatchlist = async (symbol: string, name: string) => {
    try {
      setAddingToWatchlist(prev => new Set(prev).add(symbol))

      const response = await apiService.post('/watchlist', {
        symbol: symbol.toUpperCase(),
        name: name,
      })

      if (response.success) {
        setError(null)
        // ウォッチリストを再取得して表示を更新
        await fetchWatchlist()
        console.log(`Added ${symbol} to watchlist`)
      } else {
        setError(`Failed to add ${symbol} to watchlist`)
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)

      // 409 Conflict (既に存在) の場合は情報メッセージとして扱う
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any
        if (apiError.response?.status === 409) {
          console.log(`${symbol} is already in watchlist`)
          // 既に追加済みの場合はエラーではなく、リストを更新するだけ
          await fetchWatchlist()
          setError(null) // エラーメッセージをクリア
          return
        }
      }

      setError(error instanceof Error ? error.message : 'Failed to add to watchlist')
    } finally {
      setAddingToWatchlist(prev => {
        const newSet = new Set(prev)
        newSet.delete(symbol)
        return newSet
      })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(searchQuery)
  }

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol)
    // Optionally redirect to charts page
    setTimeout(() => {
      window.location.href = '/charts'
    }, 100)
  }

  // 初期ロード時にウォッチリストを取得
  useEffect(() => {
    fetchWatchlist()
  }, [])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const popularSymbols = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NFLX', name: 'Netflix Inc.' },
  ]

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Search Symbols</h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          Find stocks, ETFs, cryptocurrencies, and other financial instruments
        </p>
      </div>

      {/* Search Form */}
      <div className='mb-8'>
        <form onSubmit={handleSearch} className='flex gap-4 max-w-2xl'>
          <div className='flex-1'>
            <Input
              type='text'
              placeholder='Enter symbol or company name (e.g., AAPL, Apple)'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full !bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white !border-gray-300 dark:!border-gray-600'
            />
          </div>
          <Button type='submit' variant='primary' disabled={loading || !searchQuery.trim()}>
            <svg className='w-5 h-5 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
            Search
          </Button>
        </form>
      </div>

      {/* Current Selection */}
      {state.selectedSymbol && (
        <div className='mb-8 bg-blue-50 dark:bg-blue-900 rounded-lg p-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-medium text-blue-900 dark:text-blue-100'>
                Currently Selected
              </h3>
              <p className='text-2xl font-bold text-blue-700 dark:text-blue-300'>
                {state.selectedSymbol} • {state.timeframe}
              </p>
            </div>
            <Button variant='secondary' onClick={() => (window.location.href = '/charts')}>
              View Chart
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className='flex justify-center items-center h-32'>
          <Loading size='lg' text='Searching...' />
        </div>
      )}

      {/* Search Results */}
      {!loading && hasSearched && (
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
            Search Results ({searchResults.length})
          </h2>

          {searchResults.length > 0 ? (
            <div className='bg-white dark:bg-gray-800 shadow rounded-lg'>
              <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className='p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors'
                    onClick={() => handleSymbolSelect(result.symbol)}
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex-1'>
                        <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
                          {result.displaySymbol || result.symbol}
                        </h3>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>
                          {result.description}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
                          Type: {result.type}
                        </p>
                      </div>
                      <div className='flex items-center space-x-2'>
                        {/* Watchlist button */}
                        {watchlistItems.some(w => w.symbol === result.symbol) ? (
                          <button
                            className='p-1.5 rounded-full transition-colors text-green-500'
                            title='Already in watchlist'
                            disabled
                          >
                            <svg
                              className='w-4 h-4'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M5 13l4 4L19 7'
                              />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              handleAddToWatchlist(result.symbol, result.description)
                            }}
                            disabled={addingToWatchlist.has(result.symbol)}
                            className={`p-1.5 rounded-full transition-colors ${
                              addingToWatchlist.has(result.symbol)
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-green-500'
                            }`}
                            title='Add to watchlist'
                          >
                            {addingToWatchlist.has(result.symbol) ? (
                              <svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
                                <circle
                                  className='opacity-25'
                                  cx='12'
                                  cy='12'
                                  r='10'
                                  stroke='currentColor'
                                  strokeWidth='4'
                                ></circle>
                                <path
                                  className='opacity-75'
                                  fill='currentColor'
                                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                                ></path>
                              </svg>
                            ) : (
                              <svg
                                className='w-4 h-4'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                                />
                              </svg>
                            )}
                          </button>
                        )}

                        {/* Status indicators */}
                        <div className='flex items-center space-x-1'>
                          {state.selectedSymbol === result.symbol && (
                            <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                              Selected
                            </span>
                          )}
                        </div>

                        <svg
                          className='w-5 h-5 text-gray-400'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M9 5l7 7-7 7'
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className='text-center py-8'>
              <svg
                className='mx-auto h-12 w-12 text-gray-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                />
              </svg>
              <h3 className='mt-2 text-sm font-medium text-gray-900 dark:text-white'>
                No results found
              </h3>
              <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                Try searching with a different term or symbol.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Watchlist */}
      {watchlistItems.length > 0 && !hasSearched && (
        <div className='mb-8'>
          <div>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center'>
                <svg
                  className='w-5 h-5 text-green-500 mr-2'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                  />
                </svg>
                Watchlist ({watchlistItems.length})
              </h2>
              <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'>
                {watchlistItems.map(item => (
                  <div
                    key={item.symbol}
                    className='bg-white dark:bg-gray-800 shadow rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-green-400'
                    onClick={() => handleSymbolSelect(item.symbol)}
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <h3 className='text-sm font-medium text-gray-900 dark:text-white'>
                          {item.symbol}
                        </h3>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleRemoveFromWatchlist(item.symbol)
                        }}
                        className='text-green-500 hover:text-green-600 transition-colors'
                        title='Remove from watchlist'
                      >
                        <svg
                          className='w-4 h-4'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </div>
      )}

      {/* Popular Symbols */}
      {!hasSearched && (
        <div>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
            Popular Symbols
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {popularSymbols.map(item => (
              <div
                key={item.symbol}
                className='bg-white dark:bg-gray-800 shadow rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer'
                onClick={() => handleSymbolSelect(item.symbol)}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
                      {item.symbol}
                    </h3>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>{item.name}</p>
                  </div>
                  <div className='flex items-center space-x-2'>
                    {/* Watchlist button */}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (watchlistItems.some(w => w.symbol === item.symbol)) {
                          handleRemoveFromWatchlist(item.symbol)
                        } else {
                          handleAddToWatchlist(item.symbol, item.name)
                        }
                      }}
                      className={`p-1.5 rounded-full transition-colors ${
                        watchlistItems.some(w => w.symbol === item.symbol)
                          ? 'text-green-500 hover:text-green-600'
                          : 'text-gray-400 hover:text-green-500'
                      }`}
                      title={
                        watchlistItems.some(w => w.symbol === item.symbol)
                          ? 'Remove from watchlist'
                          : 'Add to watchlist'
                      }
                    >
                      <svg
                        className='w-4 h-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d={
                            watchlistItems.some(w => w.symbol === item.symbol)
                              ? 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
                              : 'M12 6v6m0 0v6m0-6h6m-6 0H6'
                          }
                        />
                      </svg>
                    </button>

                    {/* Status indicators */}
                    <div className='flex items-center space-x-1'>
                      {watchlistItems.some(w => w.symbol === item.symbol) && (
                        <span className='inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
                          W
                        </span>
                      )}
                      {state.selectedSymbol === item.symbol && (
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchPage
