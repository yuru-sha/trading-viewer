import React, { useState } from 'react'
import { Icon } from '@ui'
import { SaveChartRequest } from '@shared'

interface SaveChartModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: SaveChartRequest) => void
  defaultValues: {
    symbol: string
    timeframe: string
    chartType: string
    indicators: string
    drawingTools: string
    chartSettings: string
  }
  existingCharts?: Array<{ name: string; isDefault: boolean }>
  isLoading?: boolean
}

const SaveChartModal: React.FC<SaveChartModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultValues,
  existingCharts = [],
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Chart name is required'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Chart name must be 100 characters or less'
    } else {
      // Check for duplicate name
      const isDuplicate = existingCharts.some(
        chart => chart.name.toLowerCase() === formData.name.toLowerCase().trim()
      )
      if (isDuplicate) {
        newErrors.name = 'A chart with this name already exists'
      }
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      onSave({
        ...defaultValues,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isDefault: formData.isDefault,
      })
    }
  }

  const handleClose = () => {
    setFormData({ name: '', description: '', isDefault: false })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  const hasDefaultChart = existingCharts.some(chart => chart.isDefault)

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Save Chart</h3>
          <button
            onClick={handleClose}
            className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors'
            disabled={isLoading}
          >
            <Icon name='X' className='w-5 h-5' />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6'>
          {/* Chart Info Display */}
          <div className='mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
              <div className='flex items-center space-x-4'>
                <span>
                  <strong>Symbol:</strong> {defaultValues.symbol}
                </span>
                <span>
                  <strong>Timeframe:</strong> {defaultValues.timeframe}
                </span>
              </div>
            </div>
          </div>

          {/* Chart Name */}
          <div className='mb-4'>
            <label
              htmlFor='chartName'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
            >
              Chart Name *
            </label>
            <input
              type='text'
              id='chartName'
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                errors.name
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder='Enter chart name'
              maxLength={100}
              disabled={isLoading}
              autoFocus
            />
            {errors.name && (
              <p className='mt-1 text-sm text-red-600 dark:text-red-400'>{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className='mb-4'>
            <label
              htmlFor='chartDescription'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
            >
              Description (optional)
            </label>
            <textarea
              id='chartDescription'
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 resize-none ${
                errors.description
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder='Optional description for this chart'
              rows={3}
              maxLength={500}
              disabled={isLoading}
            />
            {errors.description && (
              <p className='mt-1 text-sm text-red-600 dark:text-red-400'>{errors.description}</p>
            )}
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Set as Default */}
          <div className='mb-6'>
            <label className='flex items-center'>
              <input
                type='checkbox'
                checked={formData.isDefault}
                onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700'
                disabled={isLoading}
              />
              <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
                Set as default chart for {defaultValues.symbol} ({defaultValues.timeframe})
              </span>
            </label>
            {hasDefaultChart && formData.isDefault && (
              <p className='mt-1 text-xs text-amber-600 dark:text-amber-400'>
                This will replace the current default chart
              </p>
            )}
          </div>

          {/* Actions */}
          <div className='flex items-center justify-end space-x-3'>
            <button
              type='button'
              onClick={handleClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors'
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center space-x-2'
              disabled={isLoading}
            >
              {isLoading && <Icon name='Loader2' className='w-4 h-4 animate-spin' />}
              <span>{isLoading ? 'Saving...' : 'Save Chart'}</span>
            </button>
          </div>
        </form>

        {/* Existing Charts */}
        {existingCharts.length > 0 && (
          <div className='border-t border-gray-200 dark:border-gray-700 p-6'>
            <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
              Existing charts for {defaultValues.symbol} ({defaultValues.timeframe})
            </h4>
            <div className='space-y-2 max-h-32 overflow-y-auto'>
              {existingCharts.map((chart, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between text-sm text-gray-600 dark:text-gray-400'
                >
                  <span>{chart.name}</span>
                  {chart.isDefault && (
                    <span className='px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded'>
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SaveChartModal
