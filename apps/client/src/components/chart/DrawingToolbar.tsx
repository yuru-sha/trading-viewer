import React from 'react'
import { Button } from '@trading-viewer/ui'
import { DrawingToolType, DrawingMode, DrawingStyle } from '@trading-viewer/shared'

interface DrawingToolbarProps {
  activeToolType: DrawingToolType | null
  drawingMode: DrawingMode
  defaultStyle: DrawingStyle
  snapToPrice: boolean
  toolCount: number
  onToolSelect: (tool: DrawingToolType | null) => void
  onModeChange: (mode: DrawingMode) => void
  onStyleChange: (style: Partial<DrawingStyle>) => void
  onToggleSnap: () => void
  onClearAll: () => void
  className?: string
}

/**
 * Drawing Tools Toolbar Component
 * - Tool selection and mode switching
 * - Style customization controls
 * - Snap-to-price toggle
 * - Clear all functionality
 */
export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeToolType,
  drawingMode,
  defaultStyle,
  snapToPrice,
  toolCount,
  onToolSelect,
  onModeChange,
  onStyleChange,
  onToggleSnap,
  onClearAll,
  className = '',
}) => {
  const tools: Array<{
    type: DrawingToolType
    icon: React.ReactNode
    label: string
    description: string
  }> = [
    {
      type: 'trendline',
      icon: (
        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 21l18-18' />
        </svg>
      ),
      label: 'Trend Line',
      description: 'Draw trend lines to identify price direction',
    },
    {
      type: 'horizontal',
      icon: (
        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 12h18' />
        </svg>
      ),
      label: 'Horizontal Line',
      description: 'Support and resistance levels',
    },
    {
      type: 'vertical',
      icon: (
        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 3v18' />
        </svg>
      ),
      label: 'Vertical Line',
      description: 'Mark important time events',
    },
    {
      type: 'fibonacci',
      icon: (
        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M3 21l6-6m0 0l-6-6m6 6h12'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1}
            d='M9 3h6m-6 6h6m-6 6h6m-6 6h6'
          />
        </svg>
      ),
      label: 'Fibonacci',
      description: 'Fibonacci retracement levels',
    },
  ]

  const colorOptions = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#ef4444', label: 'Red' },
    { value: '#10b981', label: 'Green' },
    { value: '#f59e0b', label: 'Yellow' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#6b7280', label: 'Gray' },
  ]

  const thicknessOptions = [1, 2, 3, 4, 5]

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}
    >
      <div className='p-3 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-sm font-medium text-gray-900 dark:text-white'>Drawing Tools</h3>
          <div className='flex items-center space-x-2'>
            <span className='text-xs text-gray-500 dark:text-gray-400'>{toolCount} tools</span>
            {toolCount > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={onClearAll}
                className='text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900'
                title='Clear all drawings'
              >
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Tool Selection Grid */}
        <div className='grid grid-cols-3 gap-2 mb-3'>
          {tools.map(tool => (
            <Button
              key={tool.type}
              variant={activeToolType === tool.type ? 'primary' : 'ghost'}
              size='sm'
              onClick={() => onToolSelect(activeToolType === tool.type ? null : tool.type)}
              className='flex flex-col items-center p-2 h-auto'
              title={tool.description}
            >
              {tool.icon}
              <span className='text-xs mt-1 truncate w-full text-center'>{tool.label}</span>
            </Button>
          ))}
        </div>

        {/* Mode Indicators */}
        <div className='flex items-center space-x-2 text-xs'>
          <span className='text-gray-500 dark:text-gray-400'>Mode:</span>
          <span
            className={`px-2 py-1 rounded-full font-medium ${
              drawingMode === 'drawing'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : drawingMode === 'editing'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            {drawingMode === 'none' ? 'Select' : drawingMode}
          </span>
        </div>
      </div>

      {/* Style Controls */}
      <div className='p-3 border-b border-gray-200 dark:border-gray-700'>
        <h4 className='text-xs font-medium text-gray-900 dark:text-white mb-2'>Style</h4>

        {/* Color Selection */}
        <div className='mb-3'>
          <label className='block text-xs text-gray-700 dark:text-gray-300 mb-1'>Color</label>
          <div className='flex space-x-1'>
            {colorOptions.map(color => (
              <button
                key={color.value}
                onClick={() => onStyleChange({ color: color.value })}
                className={`w-6 h-6 rounded border-2 transition-all ${
                  defaultStyle.color === color.value
                    ? 'border-gray-900 dark:border-white scale-110'
                    : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Thickness Selection */}
        <div className='mb-3'>
          <label className='block text-xs text-gray-700 dark:text-gray-300 mb-1'>
            Thickness: {defaultStyle.thickness}px
          </label>
          <div className='flex space-x-1'>
            {thicknessOptions.map(thickness => (
              <button
                key={thickness}
                onClick={() => onStyleChange({ thickness })}
                className={`w-8 h-6 flex items-center justify-center border rounded transition-all ${
                  defaultStyle.thickness === thickness
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div
                  className='bg-current rounded'
                  style={{
                    width: '16px',
                    height: `${thickness}px`,
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Opacity Control */}
        <div>
          <label className='block text-xs text-gray-700 dark:text-gray-300 mb-1'>
            Opacity: {Math.round(defaultStyle.opacity * 100)}%
          </label>
          <input
            type='range'
            min='10'
            max='100'
            step='10'
            value={Math.round(defaultStyle.opacity * 100)}
            onChange={e => onStyleChange({ opacity: parseInt(e.target.value) / 100 })}
            className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700'
          />
        </div>
      </div>

      {/* Options */}
      <div className='p-3'>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-gray-700 dark:text-gray-300'>Snap to Price</span>
          <button
            onClick={onToggleSnap}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              snapToPrice ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                snapToPrice ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

export default DrawingToolbar
