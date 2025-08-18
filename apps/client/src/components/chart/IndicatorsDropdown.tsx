import React, { useState } from 'react'
import {
  IndicatorType,
  INDICATOR_METADATA,
  DEFAULT_INDICATOR_CONFIGS,
  DEFAULT_INDICATOR_STYLES,
} from '@trading-viewer/shared'
import { Icon } from '@ui'
import {
  useAddIndicator,
  useIndicators,
  useToggleIndicator,
  useUpdateIndicator,
  useDeleteIndicator,
} from '../../hooks/useIndicators'
import { useAuth } from '../../contexts/AuthContext'

interface IndicatorsDropdownProps {
  symbol: string
  timeframe?: string
  isOpen: boolean
  onClose: () => void
  showVolume?: boolean
  onToggleVolume?: (show: boolean) => void
}

interface IndicatorConfigModalProps {
  type: IndicatorType
  symbol: string
  onClose: () => void
  onConfirm: (parameters: Record<string, any>) => void
  initialParameters?: Record<string, any>
}

const IndicatorConfigModal: React.FC<IndicatorConfigModalProps> = ({
  type,
  onClose,
  onConfirm,
  initialParameters,
}) => {
  const metadata = INDICATOR_METADATA[type]
  const defaultConfig = DEFAULT_INDICATOR_CONFIGS[type]
  const [parameters, setParameters] = useState<Record<string, any>>(
    initialParameters || defaultConfig
  )

  const handleSubmit = (e: React.FormEvent) => {
    console.log('🔍 IndicatorConfigModal handleSubmit called:', { type, parameters })
    e.preventDefault()
    console.log('🔍 IndicatorConfigModal calling onConfirm with:', parameters)
    onConfirm(parameters)
  }

  const handleParameterChange = (key: string, value: any) => {
    setParameters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div
      className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
      onClick={onClose}
    >
      <div
        className='bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md'
        onClick={e => e.stopPropagation()}
      >
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            {initialParameters ? 'Edit' : 'Configure'} {metadata.name}
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          >
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>{metadata.description}</p>

        <form onSubmit={handleSubmit}>
          <div className='space-y-4'>
            {metadata.parameters.map(param => (
              <div key={param.key}>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  {param.label}
                </label>
                {param.type === 'number' ? (
                  <input
                    type='number'
                    value={parameters[param.key] ?? param.default}
                    onChange={e => {
                      const value = e.target.value
                      // 空文字列の場合は空文字列のまま保持し、数値の場合は数値に変換
                      handleParameterChange(param.key, value === '' ? '' : Number(value))
                    }}
                    onKeyDown={e => {
                      e.stopPropagation()
                    }}
                    min={param.min}
                    max={param.max}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white'
                  />
                ) : param.type === 'select' && param.options ? (
                  <select
                    value={parameters[param.key] || param.default}
                    onChange={e => handleParameterChange(param.key, e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white'
                  >
                    {param.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ))}
          </div>

          <div className='flex justify-end space-x-3 mt-6'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            >
              {initialParameters ? 'Update' : 'Add Indicator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const IndicatorsDropdown: React.FC<IndicatorsDropdownProps> = ({
  symbol,
  timeframe = 'D',
  isOpen,
  onClose,
  showVolume = true,
  onToggleVolume,
}) => {
  console.log('🔍 IndicatorsDropdown COMPONENT INSTANTIATED:', { symbol, timeframe, isOpen })
  const { isAuthenticated } = useAuth()
  const { data: indicators = [], isLoading } = useIndicators(symbol, timeframe)
  const { addIndicator, isLoading: isAdding } = useAddIndicator()
  const { toggleIndicator } = useToggleIndicator()
  const updateIndicator = useUpdateIndicator()
  const deleteIndicator = useDeleteIndicator()

  const [configModal, setConfigModal] = useState<{
    type: IndicatorType
    symbol: string
  } | null>(null)

  const [editingIndicator, setEditingIndicator] = useState<string | null>(null)
  const [colorPickerIndicator, setColorPickerIndicator] = useState<string | null>(null)
  const [editingParametersIndicator, setEditingParametersIndicator] = useState<{
    id: string
    type: IndicatorType
    currentParameters: Record<string, any>
  } | null>(null)

  // ドロップダウンが閉じられた時にすべての状態をクリア
  React.useEffect(() => {
    if (!isOpen) {
      setConfigModal(null)
      setEditingIndicator(null)
      setColorPickerIndicator(null)
      setEditingParametersIndicator(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleAddIndicator = (type: IndicatorType) => {
    console.log('🔍 handleAddIndicator called:', { type, symbol, isAuthenticated })

    if (!isAuthenticated) {
      alert('Please log in to add indicators')
      return
    }

    // RSI と MACD の重複追加を制限
    if (type === 'rsi' || type === 'macd') {
      const existingIndicator = indicators.find(indicator => indicator.type === type)
      if (existingIndicator) {
        alert(`${type.toUpperCase()} indicator is already added. Only one ${type.toUpperCase()} indicator is allowed.`)
        return
      }
    }

    console.log('🔍 Setting config modal:', { type, symbol })
    setConfigModal({ type, symbol })
  }

  const handleConfirmIndicator = async (parameters: Record<string, any>) => {
    if (!configModal) return

    console.log('🔍 Adding indicator:', {
      type: configModal.type,
      symbol: configModal.symbol,
      parameters,
      isAuthenticated,
    })

    try {
      const defaultStyle = DEFAULT_INDICATOR_STYLES[configModal.type]

      console.log('🔍 Calling addIndicator with:', {
        type: configModal.type,
        symbol: configModal.symbol,
        parameters,
        options: {
          name: `${configModal.type.toUpperCase()}_${Date.now()}`,
          style: defaultStyle,
        },
      })

      const result = await addIndicator(
        configModal.type,
        configModal.symbol,
        timeframe,
        parameters,
        {
          name: `${configModal.type.toUpperCase()}_${Date.now()}`,
          style: defaultStyle,
        }
      )

      console.log('✅ Indicator added successfully:', result)

      setConfigModal(null)
      onClose()
    } catch (error) {
      console.error('❌ Failed to add indicator:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error,
      })
      alert(`Failed to add indicator: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleToggleIndicator = async (id: string, currentVisible: boolean) => {
    try {
      await toggleIndicator(id, !currentVisible)
    } catch (error) {
      console.error('Failed to toggle indicator:', error)
    }
  }

  const handleColorChange = async (indicatorId: string, color: string) => {
    console.log('🎨 handleColorChange called:', { indicatorId, color })
    console.log('🎨 updateIndicator object:', updateIndicator)
    try {
      const result = await updateIndicator.mutateAsync({
        id: indicatorId,
        updates: { style: { color } },
      })
      console.log('🎨 Color update successful:', result)
      setColorPickerIndicator(null)
      setEditingIndicator(null)
    } catch (error) {
      console.error('Failed to update indicator color:', error)
      alert('色の変更に失敗しました')
    }
  }

  const handleDeleteIndicator = async (indicatorId: string) => {
    try {
      await deleteIndicator.mutateAsync(indicatorId)
      setEditingIndicator(null)
    } catch (error) {
      console.error('Failed to delete indicator:', error)
      alert('インジケーターの削除に失敗しました')
    }
  }

  const handleEditParameters = (indicator: any) => {
    setEditingParametersIndicator({
      id: indicator.id,
      type: indicator.type,
      currentParameters: indicator.parameters || {},
    })
  }

  const handleUpdateParameters = async (parameters: Record<string, any>) => {
    if (!editingParametersIndicator) return

    console.log('📊 handleUpdateParameters called:', {
      id: editingParametersIndicator.id,
      parameters,
    })
    console.log('📊 updateIndicator object:', updateIndicator)
    try {
      const result = await updateIndicator.mutateAsync({
        id: editingParametersIndicator.id,
        updates: { parameters },
      })
      console.log('📊 Parameter update successful:', result)
      setEditingParametersIndicator(null)
      setEditingIndicator(null)
    } catch (error) {
      console.error('Failed to update indicator parameters:', error)
      alert('パラメーターの更新に失敗しました')
    }
  }

  const availableTypes: IndicatorType[] = ['sma', 'ema', 'rsi', 'macd', 'bollinger']

  console.log('🔍 IndicatorsDropdown render:', {
    isOpen,
    isAdding,
    availableTypes,
    isAuthenticated,
    indicatorsCount: indicators.length,
  })

  return (
    <>
      <div
        className='absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-[250px]'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-700'>
          <h3 className='text-sm font-medium text-gray-900 dark:text-white'>
            Technical Indicators
          </h3>
        </div>

        {/* Volume Toggle */}
        <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <button
                onClick={() => onToggleVolume?.(!showVolume)}
                className={`w-3 h-3 rounded-sm border ${
                  showVolume
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {showVolume && (
                  <svg className='w-2 h-2 text-white' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                )}
              </button>
              <span className='text-sm text-gray-700 dark:text-gray-300'>Volume (出来高)</span>
            </div>
            <div className='flex items-center space-x-1'>
              <div className='flex space-x-1'>
                <div
                  className='w-2 h-3 rounded'
                  style={{ backgroundColor: '#10b981' }}
                  title='上昇色（緑）'
                />
                <div
                  className='w-2 h-3 rounded'
                  style={{ backgroundColor: '#ef4444' }}
                  title='下降色（赤）'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Current Indicators */}
        {indicators.length > 0 && (
          <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-700'>
            <h4 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2'>
              ACTIVE INDICATORS
            </h4>
            <div className='space-y-1'>
              {indicators.map(indicator => (
                <div key={indicator.id}>
                  <div className='flex items-center justify-between py-1 group'>
                    <div className='flex items-center space-x-2'>
                      <button
                        onClick={() => handleToggleIndicator(indicator.id, indicator.visible)}
                        className={`w-3 h-3 rounded-sm border ${
                          indicator.visible
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {indicator.visible && (
                          <svg
                            className='w-2 h-2 text-white'
                            fill='currentColor'
                            viewBox='0 0 20 20'
                          >
                            <path
                              fillRule='evenodd'
                              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                              clipRule='evenodd'
                            />
                          </svg>
                        )}
                      </button>
                      <span className='text-sm text-gray-700 dark:text-gray-300'>
                        {indicator.name}
                      </span>
                    </div>
                    <div className='flex items-center space-x-1'>
                      <div
                        className='w-3 h-3 rounded'
                        style={{ backgroundColor: indicator.style?.color || '#2196F3' }}
                      />
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setEditingIndicator(
                            editingIndicator === indicator.id ? null : indicator.id
                          )
                        }}
                        className='opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-opacity'
                        title='設定'
                      >
                        <svg
                          className='w-3 h-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path
                            fillRule='evenodd'
                            d='M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z'
                            clipRule='evenodd'
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 編集メニュー */}
                  {editingIndicator === indicator.id && (
                    <div className='ml-5 mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs space-y-1'>
                      <button
                        onClick={() => setColorPickerIndicator(indicator.id)}
                        className='flex items-center space-x-2 w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded'
                      >
                        <Icon name='Palette' size={12} />
                        <span>色を変更</span>
                      </button>
                      <button
                        onClick={() => handleEditParameters(indicator)}
                        className='flex items-center space-x-2 w-full text-left px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded'
                      >
                        <Icon name='settings' size={12} />
                        <span>パラメーター変更</span>
                      </button>
                      <button
                        onClick={() => handleDeleteIndicator(indicator.id)}
                        className='flex items-center space-x-2 w-full text-left px-2 py-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400'
                      >
                        <Icon name='delete' size={12} />
                        <span>削除</span>
                      </button>

                      {/* 色選択 */}
                      {colorPickerIndicator === indicator.id && (
                        <div className='mt-2 p-2 border-t border-gray-200 dark:border-gray-600'>
                          <div className='grid grid-cols-4 gap-1'>
                            {[
                              '#2196F3',
                              '#ef4444',
                              '#10b981',
                              '#f59e0b',
                              '#8b5cf6',
                              '#06b6d4',
                              '#ec4899',
                              '#84cc16',
                            ].map(color => (
                              <button
                                key={color}
                                onClick={() => handleColorChange(indicator.id, color)}
                                className='w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500'
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Indicators */}
        <div className='px-3 py-2'>
          <h4 className='text-xs font-medium text-gray-500 dark:text-gray-400 mb-2'>
            ADD INDICATOR
          </h4>
          <div className='space-y-1'>
            {availableTypes.map(type => {
              const metadata = INDICATOR_METADATA[type]
              const isAlreadyAdded = (type === 'rsi' || type === 'macd') && 
                indicators.some(indicator => indicator.type === type)
              console.log(`🔍 Rendering ${type} button:`, { metadata, isAdding, isAlreadyAdded })
              return (
                <button
                  key={type}
                  onClick={e => {
                    console.log('🔍 BUTTON CLICKED - ANY BUTTON!')
                    console.log(`🔍 ${type.toUpperCase()} button clicked:`, {
                      type,
                      metadata: metadata.name,
                    })
                    e.preventDefault()
                    e.stopPropagation()
                    handleAddIndicator(type)
                  }}
                  disabled={isAdding || isAlreadyAdded}
                  className={`block w-full text-left px-2 py-1.5 text-sm rounded ${
                    isAlreadyAdded
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className='flex items-center justify-between'>
                    <span>{metadata.name}{isAlreadyAdded ? ' (Already added)' : ''}</span>
                    <span className='text-xs text-gray-400 capitalize'>{metadata.category}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {isLoading && (
          <div className='px-3 py-2 text-center'>
            <div className='text-sm text-gray-500 dark:text-gray-400'>Loading...</div>
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

      {/* Parameter Edit Modal */}
      {editingParametersIndicator && (
        <IndicatorConfigModal
          type={editingParametersIndicator.type}
          symbol={symbol}
          onClose={() => setEditingParametersIndicator(null)}
          onConfirm={handleUpdateParameters}
          initialParameters={editingParametersIndicator.currentParameters}
        />
      )}
    </>
  )
}

export default IndicatorsDropdown
