import React, { useState, useEffect } from 'react'
import { Button } from '@trading-viewer/ui'
import Icon from '../Icon'
import { apiClient } from '../../lib/apiClient'
import { useAuth } from '../../contexts/AuthContext'
import SymbolSearch from '../SymbolSearch'
import { formatPrice } from '../../utils/currency'

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
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [currentPriceInfo, setCurrentPriceInfo] = useState<CurrentPriceInfo | null>(null)
  const [loadingCurrentPrice, setLoadingCurrentPrice] = useState(false)

  // Fetch watchlist when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchWatchlist()
    }
  }, [isOpen])

  // Fetch current price when symbol changes
  useEffect(() => {
    if (formData.symbol && isOpen) {
      fetchCurrentPrice(formData.symbol)
    }
  }, [formData.symbol, isOpen])

  const fetchWatchlist = async () => {
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
        console.warn('Watchlist data is not an array:', result)
        setWatchlist([])
        setShowCustomInput(true)
      }
    } catch (err) {
      console.error('Failed to fetch watchlist:', err)
      setWatchlist([])
      // If watchlist fetch fails, default to custom input
      setShowCustomInput(true)
    } finally {
      setLoadingWatchlist(false)
    }
  }

  const fetchCurrentPrice = async (symbol: string) => {
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
      console.error('Failed to fetch current price:', err)
      setCurrentPriceInfo(null)
    } finally {
      setLoadingCurrentPrice(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload: any = {
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
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create alert')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof AlertFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Auto-suggest target price based on current price when symbol is selected
    if (field === 'symbol' && value && !showCustomInput && Array.isArray(watchlist)) {
      const selectedItem = watchlist.find(item => item.symbol === value)
      if (selectedItem?.currentPrice && !formData.targetPrice) {
        // Suggest a price 5% above current price for 'above' alerts
        const suggestedPrice =
          formData.condition === 'above'
            ? selectedItem.currentPrice * 1.05
            : selectedItem.currentPrice * 0.95
        setFormData(prev => ({ ...prev, targetPrice: suggestedPrice.toFixed(2) }))
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 overflow-y-auto'>
      <div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
        {/* Background overlay */}
        <div
          className='fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity'
          onClick={onClose}
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
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Symbol
                </label>
                {watchlist.length > 0 && (
                  <button
                    type='button'
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className='text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                  >
                    {showCustomInput ? 'Choose from Watchlist' : 'Enter Custom Symbol'}
                  </button>
                )}
              </div>

              {loadingWatchlist ? (
                <div className='flex items-center justify-center py-3 text-gray-500'>
                  <div className='animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2' />
                  Loading watchlist...
                </div>
              ) : showCustomInput || watchlist.length === 0 ? (
                <input
                  type='text'
                  value={formData.symbol}
                  onChange={e => handleInputChange('symbol', e.target.value)}
                  placeholder='e.g., AAPL, TSLA, BTC-USD'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  required
                />
              ) : (
                <select
                  value={formData.symbol}
                  onChange={e => handleInputChange('symbol', e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  required
                >
                  <option value=''>Select a symbol from your watchlist</option>
                  {Array.isArray(watchlist) &&
                    watchlist.map(item => (
                      <option key={item.id} value={item.symbol}>
                        {item.symbol} - {item.name}{' '}
                        {item.currentPrice
                          ? `(${formatPrice(item.currentPrice, item.currency)})`
                          : ''}
                      </option>
                    ))}
                </select>
              )}
            </div>

            {/* Current Price Display */}
            {formData.symbol && (
              <div className='p-3 bg-gray-50 dark:bg-gray-900 rounded-md'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Current Price:
                  </span>
                  {loadingCurrentPrice ? (
                    <div className='flex items-center'>
                      <div className='animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent mr-2' />
                      <span className='text-sm text-gray-500'>Loading...</span>
                    </div>
                  ) : currentPriceInfo ? (
                    <span className='text-sm font-bold text-gray-900 dark:text-white'>
                      {formatPrice(currentPriceInfo.price, currentPriceInfo.currency)}
                    </span>
                  ) : (
                    <span className='text-sm text-gray-500'>Not available</span>
                  )}
                </div>
              </div>
            )}

            {/* Alert Type */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Alert Type
              </label>
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
                  <span className='ml-2 text-sm font-medium text-gray-900 dark:text-gray-300'>
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
                  <span className='ml-2 text-sm font-medium text-gray-900 dark:text-gray-300'>
                    Percentage Change
                  </span>
                </label>
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={e => handleInputChange('condition', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value='above'>Price goes above</option>
                <option value='below'>Price goes below</option>
              </select>
            </div>

            {/* Price Target or Percentage Change */}
            {formData.alertType === 'price' ? (
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Target Price
                </label>
                <input
                  type='number'
                  step='0.01'
                  min='0'
                  value={formData.targetPrice}
                  onChange={e => handleInputChange('targetPrice', e.target.value)}
                  placeholder='100.00'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  required
                />
              </div>
            ) : (
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Percentage Change (%)
                </label>
                <input
                  type='number'
                  step='0.1'
                  value={formData.percentageChange}
                  onChange={e => handleInputChange('percentageChange', e.target.value)}
                  placeholder='e.g., 5 for +5% or -10 for -10%'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  required
                />
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  Use positive numbers for gains, negative for losses
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3'>
                <div className='flex'>
                  <Icon name='alertTriangle' className='w-4 h-4 text-red-500 mt-0.5 mr-2' />
                  <span className='text-sm text-red-700 dark:text-red-300'>{error}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className='flex items-center justify-end space-x-3 pt-4'>
              <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type='submit' disabled={loading} className='flex items-center space-x-2'>
                {loading && (
                  <div className='animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent' />
                )}
                <span>
                  {loading
                    ? editingAlert
                      ? 'Updating...'
                      : 'Creating...'
                    : editingAlert
                      ? 'Update Alert'
                      : 'Create Alert'}
                </span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateAlertModal
