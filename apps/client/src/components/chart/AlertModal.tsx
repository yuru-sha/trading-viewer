import React, { useState } from 'react'
import { Bell, TrendingUp, TrendingDown, X } from 'lucide-react'
import { Button } from '@trading-viewer/ui'

export interface PriceAlert {
  id: string
  symbol: string
  type: 'above' | 'below' | 'crosses'
  price: number
  message?: string
  enabled: boolean
  createdAt: Date
  triggeredAt?: Date
}

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  symbol: string
  currentPrice: number
  onCreateAlert: (
    alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggeredAt'>
  ) => Promise<PriceAlert | null>
  existingAlerts?: PriceAlert[]
  onDeleteAlert?: (id: string) => void
  onToggleAlert?: (id: string) => void
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  onCreateAlert,
  existingAlerts = [],
  onDeleteAlert,
  onToggleAlert,
}) => {
  const [alertType, setAlertType] = useState<'above' | 'below' | 'crosses'>('above')
  const [alertPrice, setAlertPrice] = useState<string>(currentPrice.toFixed(2))
  const [alertMessage, setAlertMessage] = useState<string>('')
  const [showExisting, setShowExisting] = useState(true)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const price = parseFloat(alertPrice)

    if (isNaN(price) || price <= 0) {
      alert('有効な価格を入力してください')
      return
    }

    const result = await onCreateAlert({
      symbol,
      type: alertType,
      price,
      message: alertMessage || undefined,
      enabled: true,
    })

    if (result) {
      // Reset form
      setAlertPrice(currentPrice.toFixed(2))
      setAlertMessage('')
      onClose()
    }
  }

  const getAlertTypeLabel = (type: 'above' | 'below' | 'crosses') => {
    switch (type) {
      case 'above':
        return '以上'
      case 'below':
        return '以下'
      case 'crosses':
        return 'クロス'
    }
  }

  const getAlertIcon = (type: 'above' | 'below' | 'crosses') => {
    switch (type) {
      case 'above':
        return <TrendingUp className='w-4 h-4 text-green-500' />
      case 'below':
        return <TrendingDown className='w-4 h-4 text-red-500' />
      case 'crosses':
        return <Bell className='w-4 h-4 text-blue-500' />
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Modal Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center space-x-3'>
            <Bell className='w-6 h-6 text-blue-500' />
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
              価格アラート設定
            </h2>
          </div>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
          >
            <X className='w-6 h-6' />
          </button>
        </div>

        {/* Modal Body */}
        <div className='flex-1 overflow-y-auto p-6'>
          {/* Symbol Info */}
          <div className='mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>{symbol}</h3>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  現在価格: ${currentPrice.toFixed(2)}
                </p>
              </div>
              <div className='text-2xl font-bold text-gray-900 dark:text-white'>
                ${currentPrice.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Alert Form */}
          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Alert Type */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                アラートタイプ
              </label>
              <div className='grid grid-cols-3 gap-3'>
                <button
                  type='button'
                  onClick={() => setAlertType('above')}
                  className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    alertType === 'above'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <TrendingUp className='w-5 h-5' />
                  <span>以上</span>
                </button>
                <button
                  type='button'
                  onClick={() => setAlertType('below')}
                  className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    alertType === 'below'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <TrendingDown className='w-5 h-5' />
                  <span>以下</span>
                </button>
                <button
                  type='button'
                  onClick={() => setAlertType('crosses')}
                  className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    alertType === 'crosses'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <Bell className='w-5 h-5' />
                  <span>クロス</span>
                </button>
              </div>
            </div>

            {/* Alert Price */}
            <div>
              <label
                htmlFor='alert-price'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
              >
                アラート価格
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <span className='text-gray-500 dark:text-gray-400'>$</span>
                </div>
                <input
                  id='alert-price'
                  type='number'
                  step='0.01'
                  value={alertPrice}
                  onChange={e => setAlertPrice(e.target.value)}
                  className='block w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  placeholder='0.00'
                  required
                />
              </div>
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                価格が ${alertPrice || '0'} {getAlertTypeLabel(alertType)}になったら通知
              </p>
            </div>

            {/* Alert Message (Optional) */}
            <div>
              <label
                htmlFor='alert-message'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
              >
                メモ（オプション）
              </label>
              <textarea
                id='alert-message'
                value={alertMessage}
                onChange={e => setAlertMessage(e.target.value)}
                className='block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                rows={3}
                placeholder='例：サポートラインに達した、利確ポイント'
              />
            </div>

            {/* Submit Button */}
            <div className='flex justify-end space-x-3 pt-4'>
              <Button type='button' variant='outline' onClick={onClose}>
                キャンセル
              </Button>
              <Button type='submit' variant='primary'>
                アラートを作成
              </Button>
            </div>
          </form>

          {/* Existing Alerts */}
          {existingAlerts.length > 0 && (
            <div className='mt-8 pt-8 border-t border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
                  既存のアラート
                </h3>
                <button
                  type='button'
                  onClick={() => setShowExisting(!showExisting)}
                  className='text-sm text-blue-600 dark:text-blue-400 hover:underline'
                >
                  {showExisting ? '非表示' : '表示'}
                </button>
              </div>

              {showExisting && (
                <div className='space-y-3'>
                  {existingAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        alert.enabled
                          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-60'
                      }`}
                    >
                      <div className='flex items-center space-x-3'>
                        {getAlertIcon(alert.type)}
                        <div>
                          <div className='flex items-center space-x-2'>
                            <span className='font-medium text-gray-900 dark:text-white'>
                              ${alert.price.toFixed(2)}
                            </span>
                            <span className='text-sm text-gray-500 dark:text-gray-400'>
                              {getAlertTypeLabel(alert.type)}
                            </span>
                          </div>
                          {alert.message && (
                            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                              {alert.message}
                            </p>
                          )}
                          <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                            作成: {new Date(alert.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center space-x-2'>
                        {onToggleAlert && (
                          <button
                            onClick={() => onToggleAlert(alert.id)}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                              alert.enabled
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {alert.enabled ? '有効' : '無効'}
                          </button>
                        )}
                        {onDeleteAlert && (
                          <button
                            onClick={() => onDeleteAlert(alert.id)}
                            className='p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors'
                          >
                            <X className='w-4 h-4' />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AlertModal
