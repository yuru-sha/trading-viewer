import React, { useState, useEffect, useRef } from 'react'
import { api } from '@/infrastructure/adapters/apiClient'
import { log } from '@/infrastructure/services/LoggerService'

interface SymbolResult {
  symbol: string
  description: string
  displaySymbol: string
  type: string
  currency: string
  exchange: string
}

interface SymbolSearchProps {
  onSymbolSelect: (symbol: string) => void
  currentSymbol?: string
  className?: string
}

export const SymbolSearch: React.FC<SymbolSearchProps> = ({
  onSymbolSelect,
  currentSymbol,
  className = '',
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SymbolResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Search symbols with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true)
        const response = await api.market.searchSymbols({ q: query, limit: 10 })
        const symbolResults = response.symbols.map(symbol => ({
          ...symbol,
          currency: 'USD', // Default currency as NormalizedSymbol doesn't have currency
          exchange: 'NASDAQ', // Default exchange as NormalizedSymbol doesn't have exchange
        }))
        setResults(symbolResults)
        setIsOpen(true)
        setSelectedIndex(-1)
      } catch (error) {
        log.business.error('Failed to search symbols', error, {
          operation: 'symbol_search',
          query,
        })
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSymbolSelect = (symbol: string) => {
    onSymbolSelect(symbol)
    setQuery('')
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length && results[selectedIndex]) {
          handleSymbolSelect(results[selectedIndex].symbol)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    if (!e.target.value.trim()) {
      setIsOpen(false)
    }
  }

  const handleInputFocus = () => {
    if (results.length > 0) {
      setIsOpen(true)
    }
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className='relative'>
        <input
          ref={inputRef}
          type='text'
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder='Search symbols...'
          className='w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400
                     placeholder-gray-500 dark:placeholder-gray-400 transition-colors'
        />

        {/* Search Icon */}
        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
          <svg
            className='w-4 h-4 text-gray-500 dark:text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
            />
          </svg>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className='absolute inset-y-0 right-0 pr-3 flex items-center'>
            <div className='animate-spin rounded-full h-4 w-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400'></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          className='absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 
                        rounded-lg shadow-lg max-h-80 overflow-y-auto'
        >
          {results.length > 0 ? (
            <div className='py-1'>
              {results.map((result, index) => (
                <button
                  key={result.symbol}
                  onClick={() => handleSymbolSelect(result.symbol)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                              ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                              ${result.symbol === currentSymbol ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex-1'>
                      <div className='flex items-center space-x-2'>
                        <span className='font-semibold text-gray-900 dark:text-white'>
                          {result.symbol}
                        </span>
                        <span
                          className='text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 
                                       px-2 py-1 rounded'
                        >
                          {result.currency}
                        </span>
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-400 mt-1 truncate'>
                        {result.description}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-500 mt-1 truncate'>
                        {result.exchange}
                      </p>
                    </div>
                    {result.symbol === currentSymbol && (
                      <div className='flex-shrink-0'>
                        <div className='w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full'></div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() && !isLoading ? (
            <div className='px-4 py-6 text-center'>
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
                  d='M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47.901-6.062 2.379C5.38 17.829 5.38 18.171 6.062 18.621A7.962 7.962 0 0012 17a7.962 7.962 0 006.062 1.621c.682-.45.682-.792 0-1.242A7.962 7.962 0 0012 15z'
                />
              </svg>
              <h3 className='text-sm font-medium text-gray-900 dark:text-white mb-2'>
                No symbols found
              </h3>
              <p className='text-xs text-gray-600 dark:text-gray-400'>
                Try searching for a different stock symbol or company name
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default SymbolSearch
