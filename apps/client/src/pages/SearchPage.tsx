import React, { useState, useEffect } from 'react'
import { Button, Input, Loading } from '@trading-viewer/ui'
import { useApp, useAppActions } from '../contexts/AppContext'
import { api } from '../lib/apiClient'

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
    addToFavorites,
    removeFromFavorites,
  } = useAppActions()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

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
                        {/* Favorites button */}
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            if (state.favorites.includes(result.symbol)) {
                              removeFromFavorites(result.symbol)
                            } else {
                              addToFavorites(result.symbol)
                            }
                          }}
                          className={`p-1.5 rounded-full transition-colors ${
                            state.favorites.includes(result.symbol)
                              ? 'text-yellow-500 hover:text-yellow-600'
                              : 'text-gray-400 hover:text-yellow-500'
                          }`}
                          title={
                            state.favorites.includes(result.symbol)
                              ? 'Remove from favorites'
                              : 'Add to favorites'
                          }
                        >
                          <svg
                            className='w-4 h-4'
                            fill={state.favorites.includes(result.symbol) ? 'currentColor' : 'none'}
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
                            />
                          </svg>
                        </button>

                        {/* Watchlist button */}
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            if (state.watchlist.includes(result.symbol)) {
                              removeFromWatchlist(result.symbol)
                            } else {
                              addToWatchlist(result.symbol)
                            }
                          }}
                          className={`p-1.5 rounded-full transition-colors ${
                            state.watchlist.includes(result.symbol)
                              ? 'text-green-500 hover:text-green-600'
                              : 'text-gray-400 hover:text-green-500'
                          }`}
                          title={
                            state.watchlist.includes(result.symbol)
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
                                state.watchlist.includes(result.symbol)
                                  ? 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
                                  : 'M12 6v6m0 0v6m0-6h6m-6 0H6'
                              }
                            />
                          </svg>
                        </button>

                        {/* Status indicators */}
                        <div className='flex items-center space-x-1'>
                          {state.favorites.includes(result.symbol) && (
                            <span className='inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'>
                              ★
                            </span>
                          )}
                          {state.watchlist.includes(result.symbol) && (
                            <span className='inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
                              W
                            </span>
                          )}
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

      {/* Watchlist and Favorites */}
      {(state.watchlist.length > 0 || state.favorites.length > 0) && !hasSearched && (
        <div className='mb-8 space-y-6'>
          {/* Favorites */}
          {state.favorites.length > 0 && (
            <div>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center'>
                <svg
                  className='w-5 h-5 text-yellow-500 mr-2'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' />
                </svg>
                Favorites ({state.favorites.length})
              </h2>
              <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'>
                {state.favorites.map(symbol => (
                  <div
                    key={symbol}
                    className='bg-white dark:bg-gray-800 shadow rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-yellow-400'
                    onClick={() => handleSymbolSelect(symbol)}
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <h3 className='text-sm font-medium text-gray-900 dark:text-white'>
                          {symbol}
                        </h3>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          removeFromFavorites(symbol)
                        }}
                        className='text-yellow-500 hover:text-yellow-600 transition-colors'
                        title='Remove from favorites'
                      >
                        <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                          <path d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Watchlist */}
          {state.watchlist.length > 0 && (
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
                Watchlist ({state.watchlist.length})
              </h2>
              <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'>
                {state.watchlist.map(symbol => (
                  <div
                    key={symbol}
                    className='bg-white dark:bg-gray-800 shadow rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-green-400'
                    onClick={() => handleSymbolSelect(symbol)}
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <h3 className='text-sm font-medium text-gray-900 dark:text-white'>
                          {symbol}
                        </h3>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          removeFromWatchlist(symbol)
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
          )}
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
                    {/* Favorites button */}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (state.favorites.includes(item.symbol)) {
                          removeFromFavorites(item.symbol)
                        } else {
                          addToFavorites(item.symbol)
                        }
                      }}
                      className={`p-1.5 rounded-full transition-colors ${
                        state.favorites.includes(item.symbol)
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-gray-400 hover:text-yellow-500'
                      }`}
                      title={
                        state.favorites.includes(item.symbol)
                          ? 'Remove from favorites'
                          : 'Add to favorites'
                      }
                    >
                      <svg
                        className='w-4 h-4'
                        fill={state.favorites.includes(item.symbol) ? 'currentColor' : 'none'}
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
                        />
                      </svg>
                    </button>

                    {/* Watchlist button */}
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (state.watchlist.includes(item.symbol)) {
                          removeFromWatchlist(item.symbol)
                        } else {
                          addToWatchlist(item.symbol)
                        }
                      }}
                      className={`p-1.5 rounded-full transition-colors ${
                        state.watchlist.includes(item.symbol)
                          ? 'text-green-500 hover:text-green-600'
                          : 'text-gray-400 hover:text-green-500'
                      }`}
                      title={
                        state.watchlist.includes(item.symbol)
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
                            state.watchlist.includes(item.symbol)
                              ? 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
                              : 'M12 6v6m0 0v6m0-6h6m-6 0H6'
                          }
                        />
                      </svg>
                    </button>

                    {/* Status indicators */}
                    <div className='flex items-center space-x-1'>
                      {state.favorites.includes(item.symbol) && (
                        <span className='inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'>
                          ★
                        </span>
                      )}
                      {state.watchlist.includes(item.symbol) && (
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
