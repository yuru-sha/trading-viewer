import React, { useState, useEffect, useCallback } from 'react'
import Icon from '../Icon'
import { useAuth } from '../../contexts/AuthContext'
import { log } from '../../services/logger'

interface PriceAlert {
  id: string
  symbol: string
  condition: 'above' | 'below'
  targetPrice: number
  percentageChange?: number
  enabled: boolean
  currency?: string
  exchange?: string
  timezone?: string
  triggeredAt?: string
  createdAt: string
}

interface CreateAlertModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultSymbol?: string
  editingAlert?: PriceAlert | null // For editing existing alerts
}

interface AlertFormData {
  symbol: string
  condition: 'above' | 'below'
  targetPrice: string
  percentageChange: string
  alertType: 'price' | 'percentage'
}

interface WatchlistItem {
  id: string
  symbol: string
  name: string
  currentPrice?: number
  currency?: string
}

interface CurrentPriceInfo {
  price: number
  currency: string
}

const CreateAlertModal: React.FC<CreateAlertModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultSymbol = '',
  editingAlert = null,
}) => {
  const { requestWithAuth } = useAuth()
  const [formData, setFormData] = useState<AlertFormData>({
    symbol: defaultSymbol,
    condition: 'above',
    targetPrice: '',
    percentageChange: '',
    alertType: 'price',
  })

  // Initialize form data when editing
  useEffect(() => {
    if (editingAlert && isOpen) {
      setFormData({
        symbol: editingAlert.symbol,
        condition: editingAlert.condition,
        targetPrice: editingAlert.targetPrice?.toString() || '',
        percentageChange: editingAlert.percentageChange?.toString() || '',
        alertType: editingAlert.percentageChange !== undefined ? 'percentage' : 'price',
      })
    } else if (!editingAlert && isOpen) {
      setFormData({
        symbol: defaultSymbol,
        condition: 'above',
        targetPrice: '',
        percentageChange: '',
        alertType: 'price',
      })
    }
  }, [editingAlert, isOpen, defaultSymbol])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loadingWatchlist, setLoadingWatchlist] = useState(false)
  const [currentPriceInfo, setCurrentPriceInfo] = useState<CurrentPriceInfo | null>(null)
  const [loadingCurrentPrice, setLoadingCurrentPrice] = useState(false)

  const fetchWatchlist = useCallback(async () => {
    try {
      setLoadingWatchlist(true)
      const response = await requestWithAuth('/api/watchlist')
      const result = await response.json()

      // Handle API response format {success: true, data: { watchlist: [...] }}
      const data = result.success && result.data?.watchlist ? result.data.watchlist : result

      // Ensure data is an array
      if (Array.isArray(data)) {
        setWatchlist(data)
      } else {
        log.business.warn('Watchlist data is not an array', undefined, {
          operation: 'fetch_watchlist',
          receivedData: result,
        })
        setWatchlist([])
      }
    } catch (err) {
      log.business.error('Failed to fetch watchlist', err, {
        operation: 'fetch_watchlist',
      })
      setWatchlist([])
    } finally {
      setLoadingWatchlist(false)
    }
  }, [requestWithAuth])

  const fetchCurrentPrice = useCallback(
    async (symbol: string) => {
      if (!symbol.trim()) {
        setCurrentPriceInfo(null)
        return
      }

      try {
        setLoadingCurrentPrice(true)
        const response = await requestWithAuth(`/api/market/quote/${symbol.toUpperCase()}`)
        const result = await response.json()

        if (result.c !== undefined) {
          setCurrentPriceInfo({
            price: result.c,
            currency: 'USD',
          })
        } else {
          setCurrentPriceInfo(null)
        }
      } catch (err) {
        log.business.error('Failed to fetch current price', err, {
          operation: 'fetch_current_price',
          symbol,
        })
        setCurrentPriceInfo(null)
      } finally {
        setLoadingCurrentPrice(false)
      }
    },
    [requestWithAuth]
  )

  // Fetch watchlist when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchWatchlist()
    }
  }, [isOpen, fetchWatchlist])

  // Fetch current price when symbol changes
  useEffect(() => {
    if (formData.symbol && isOpen) {
      fetchCurrentPrice(formData.symbol)
    }
  }, [formData.symbol, isOpen, fetchCurrentPrice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload: Partial<PriceAlert> = {
        symbol: formData.symbol.toUpperCase(),
        condition: formData.condition,
        enabled: true,
      }

      if (formData.alertType === 'price') {
        payload.targetPrice = parseFloat(formData.targetPrice)
      } else {
        payload.percentageChange = parseFloat(formData.percentageChange)
      }

      if (editingAlert) {
        // Update existing alert
        await requestWithAuth(`/api/alerts/${editingAlert.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        // Create new alert
        await requestWithAuth('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      onSuccess()
      onClose()

      // Reset form
      setFormData({
        symbol: '',
        condition: 'above',
        targetPrice: '',
        percentageChange: '',
        alertType: 'price',
      })
      setCurrentPriceInfo(null)
    } catch (err: unknown) {
      if (err instanceof Error && 'response' in err) {
        const response = err.response as { data?: { message?: string } }
        setError(response?.data?.message || err.message || 'Failed to create alert')
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to create alert')
      } else {
        setError('Failed to create alert')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof AlertFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
        {/* Background overlay */}
        <div
          role='button'
          tabIndex={0}
          aria-label='Close create alert modal'
          className='fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity'
          onClick={onClose}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClose()
            }
          }}
        />

        {/* Modal */}
        <div className='inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg leading-6 font-medium text-gray-900 dark:text-white'>
              {editingAlert ? 'Edit Price Alert' : 'Create Price Alert'}
            </h3>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-500 dark:hover:text-gray-300'
            >
              <Icon name='x' className='w-5 h-5' />
            </button>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            {/* Symbol Selection */}
            <div>
              <label
                htmlFor='symbol-select'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
              >
                Symbol
              </label>

              {defaultSymbol && !editingAlert ? (
                // Show default symbol from chart (fixed, no changes allowed)
                <div className='flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md'>
                  <Icon name='trendingUp' className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                  <span className='text-sm text-blue-700 dark:text-blue-300 font-medium'>
                    Creating alert for chart symbol: {defaultSymbol}
                  </span>
                </div>
              ) : watchlist.length > 0 ? (
                // Watchlist dropdown
                <select
                  id='symbol-select'
                  value={formData.symbol}
                  onChange={e => handleInputChange('symbol', e.target.value)}
                  className='block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500'
                  required
                >
                  <option value=''>Select a symbol</option>
                  {watchlist.map(item => (
                    <option key={item.symbol} value={item.symbol}>
                      {item.symbol} - {item.name}
                    </option>
                  ))}
                </select>
              ) : (
                // Empty watchlist message
                <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md'>
                  <p className='text-sm text-yellow-700 dark:text-yellow-300'>
                    No symbols in your watchlist. Please add symbols to your watchlist first to
                    create alerts.
                  </p>
                </div>
              )}

              {loadingWatchlist && (
                <p className='text-sm text-gray-500 dark:text-gray-400'>Loading watchlist...</p>
              )}
            </div>

            {/* Current Price Display */}
            {currentPriceInfo && (
              <div className='bg-gray-50 dark:bg-gray-700 rounded-md p-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>Current Price:</span>
                  <div className='flex items-center space-x-2'>
                    {loadingCurrentPrice ? (
                      <div className='animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent' />
                    ) : (
                      <span className='text-lg font-semibold text-gray-900 dark:text-white'>
                        ${currentPriceInfo.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Alert Type Selection */}
            <fieldset>
              <legend className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                Alert Type
              </legend>
              <div className='flex space-x-4'>
                <label className='flex items-center'>
                  <input
                    type='radio'
                    name='alertType'
                    value='price'
                    checked={formData.alertType === 'price'}
                    onChange={e => handleInputChange('alertType', e.target.value)}
                    className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
                  />
                  <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
                    Price Target
                  </span>
                </label>
                <label className='flex items-center'>
                  <input
                    type='radio'
                    name='alertType'
                    value='percentage'
                    checked={formData.alertType === 'percentage'}
                    onChange={e => handleInputChange('alertType', e.target.value)}
                    className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600'
                  />
                  <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
                    Percentage Change
                  </span>
                </label>
              </div>
            </fieldset>

            {/* Condition Selection */}
            <div>
              <label
                htmlFor='condition-select'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
              >
                Condition
              </label>
              <select
                id='condition-select'
                value={formData.condition}
                onChange={e => handleInputChange('condition', e.target.value)}
                className='block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500'
                required
              >
                <option value='above'>Above</option>
                <option value='below'>Below</option>
                <option value='crosses'>Crosses</option>
              </select>
            </div>

            {/* Price Target or Percentage Change */}
            {formData.alertType === 'price' ? (
              <div>
                <label
                  htmlFor='target-price'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
                >
                  Target Price ($)
                </label>
                <input
                  id='target-price'
                  type='number'
                  step='0.01'
                  min='0'
                  value={formData.targetPrice}
                  onChange={e => handleInputChange('targetPrice', e.target.value)}
                  className='block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500'
                  placeholder='Enter target price'
                  required
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor='percentage-change'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
                >
                  Percentage Change (%)
                </label>
                <input
                  id='percentage-change'
                  type='number'
                  step='0.1'
                  value={formData.percentageChange}
                  onChange={e => handleInputChange('percentageChange', e.target.value)}
                  className='block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500'
                  placeholder='Enter percentage change'
                  required
                />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3'>
                <div className='flex'>
                  <Icon name='alertTriangle' className='w-4 h-4 text-red-500 mt-0.5 mr-2' />
                  <span className='text-sm text-red-700 dark:text-red-300'>{error}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className='flex space-x-3 pt-4'>
              <button
                type='button'
                onClick={onClose}
                className='flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={loading}
                className='flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {loading ? (
                  <div className='flex items-center justify-center'>
                    <div className='animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2' />
                    {editingAlert ? 'Updating...' : 'Creating...'}
                  </div>
                ) : editingAlert ? (
                  'Update Alert'
                ) : (
                  'Create Alert'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateAlertModal
