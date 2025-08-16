import React, { useState } from 'react'
import { 
  IndicatorType, 
  INDICATOR_METADATA, 
  DEFAULT_INDICATOR_CONFIGS,
  DEFAULT_INDICATOR_STYLES 
} from '@trading-viewer/shared'
import { useAddIndicator, useIndicators, useToggleIndicator } from '../../hooks/useIndicators'
import { useAuth } from '../../contexts/AuthContext'

interface IndicatorsDropdownProps {
  symbol: string
  isOpen: boolean
  onClose: () => void
}

interface IndicatorConfigModalProps {
  type: IndicatorType
  symbol: string
  onClose: () => void
  onConfirm: (parameters: Record<string, any>) => void
}

const IndicatorConfigModal: React.FC<IndicatorConfigModalProps> = ({
  type,
  onClose,
  onConfirm,
}) => {
  const metadata = INDICATOR_METADATA[type]
  const defaultConfig = DEFAULT_INDICATOR_CONFIGS[type]
  const [parameters, setParameters] = useState<Record<string, any>>(defaultConfig)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(parameters)
  }

  const handleParameterChange = (key: string, value: any) => {
    setParameters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Configure {metadata.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {metadata.description}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {metadata.parameters.map((param) => (
              <div key={param.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {param.label}
                </label>
                {param.type === 'number' ? (
                  <input
                    type="number"
                    value={parameters[param.key] || param.default}
                    onChange={(e) => handleParameterChange(param.key, Number(e.target.value))}
                    min={param.min}
                    max={param.max}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                ) : param.type === 'select' && param.options ? (
                  <select
                    value={parameters[param.key] || param.default}
                    onChange={(e) => handleParameterChange(param.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    {param.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Indicator
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const IndicatorsDropdown: React.FC<IndicatorsDropdownProps> = ({
  symbol,
  isOpen,
  onClose,
}) => {
  const { isAuthenticated } = useAuth()
  const { data: indicators = [], isLoading } = useIndicators(symbol)
  const { addIndicator, isLoading: isAdding } = useAddIndicator()
  const { toggleIndicator } = useToggleIndicator()
  
  const [configModal, setConfigModal] = useState<{
    type: IndicatorType
    symbol: string
  } | null>(null)

  if (!isOpen) return null

  const handleAddIndicator = (type: IndicatorType) => {
    if (!isAuthenticated) {
      alert('Please log in to add indicators')
      return
    }
    
    setConfigModal({ type, symbol })
  }

  const handleConfirmIndicator = async (parameters: Record<string, any>) => {
    if (!configModal) return

    try {
      const defaultStyle = DEFAULT_INDICATOR_STYLES[configModal.type]
      
      await addIndicator(
        configModal.type,
        configModal.symbol,
        parameters,
        {
          name: `${configModal.type.toUpperCase()}_${Date.now()}`,
          style: defaultStyle,
        }
      )
      
      setConfigModal(null)
      onClose()
    } catch (error) {
      console.error('Failed to add indicator:', error)
      alert('Failed to add indicator. Please try again.')
    }
  }

  const handleToggleIndicator = async (id: string, currentVisible: boolean) => {
    try {
      await toggleIndicator(id, !currentVisible)
    } catch (error) {
      console.error('Failed to toggle indicator:', error)
    }
  }

  const availableTypes: IndicatorType[] = ['sma', 'ema', 'rsi', 'macd', 'bollinger']

  return (
    <>
      <div 
        className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-[250px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Technical Indicators
          </h3>
        </div>

        {/* Current Indicators */}
        {indicators.length > 0 && (
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              ACTIVE INDICATORS
            </h4>
            <div className="space-y-1">
              {indicators.map((indicator) => (
                <div
                  key={indicator.id}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleIndicator(indicator.id, indicator.visible)}
                      className={`w-3 h-3 rounded-sm border ${
                        indicator.visible
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {indicator.visible && (
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {indicator.name}
                    </span>
                  </div>
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: indicator.style?.color || '#2196F3' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Indicators */}
        <div className="px-3 py-2">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            ADD INDICATOR
          </h4>
          <div className="space-y-1">
            {availableTypes.map((type) => {
              const metadata = INDICATOR_METADATA[type]
              return (
                <button
                  key={type}
                  onClick={() => handleAddIndicator(type)}
                  disabled={isAdding}
                  className="block w-full text-left px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <span>{metadata.name}</span>
                    <span className="text-xs text-gray-400 capitalize">
                      {metadata.category}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {isLoading && (
          <div className="px-3 py-2 text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {configModal && (
        <IndicatorConfigModal
          type={configModal.type}
          symbol={configModal.symbol}
          onClose={() => setConfigModal(null)}
          onConfirm={handleConfirmIndicator}
        />
      )}
    </>
  )
}

export default IndicatorsDropdown