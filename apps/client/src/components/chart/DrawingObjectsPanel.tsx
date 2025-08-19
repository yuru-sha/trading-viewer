import React, { useState } from 'react'
import { Icon } from '@ui'
import { DrawingToolType } from '@trading-viewer/shared'

export interface DrawingObject {
  id: string
  name: string
  type: DrawingToolType
  visible: boolean
  color: string
  createdAt: number
}

interface DrawingObjectsPanelProps {
  objects: DrawingObject[]
  onToggleVisibility: (id: string) => void
  onRemove: (id: string) => void
  onChangeColor: (id: string, color: string) => void
  className?: string
}

const colorPresets = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#84cc16', // Lime
]

export const DrawingObjectsPanel: React.FC<DrawingObjectsPanelProps> = ({
  objects,
  onToggleVisibility,
  onRemove,
  onChangeColor,
  className = '',
}) => {
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)

  const getObjectIcon = (type: DrawingToolType) => {
    switch (type) {
      case 'trendline':
        return (
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 7l10 10' />
          </svg>
        )
      case 'horizontal':
        return (
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 12h16' />
          </svg>
        )
      case 'vertical':
        return (
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16' />
          </svg>
        )
      case 'fibonacci':
        return <Icon name="ChartNoAxesGantt" className='w-4 h-4' />
      default:
        return (
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 7l10 10' />
          </svg>
        )
    }
  }

  const getObjectTypeLabel = (type: DrawingToolType) => {
    switch (type) {
      case 'trendline':
        return 'Trend Line'
      case 'horizontal':
        return 'Horizontal'
      case 'vertical':
        return 'Vertical'
      case 'fibonacci':
        return 'Fibonacci'
      default:
        return type
    }
  }

  const handleColorChange = (objectId: string, color: string) => {
    onChangeColor(objectId, color)
    setColorPickerOpen(null)
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-700'>
        <h3 className='text-sm font-medium text-gray-900 dark:text-white'>Drawing Objects</h3>
      </div>

      {/* Objects List */}
      <div className='max-h-96 overflow-y-auto'>
        {objects.length === 0 ? (
          <div className='px-3 py-4 text-center'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>No drawing objects</p>
            <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
              Use drawing tools to create lines and patterns
            </p>
          </div>
        ) : (
          <div className='py-2'>
            {objects.map((object, index) => (
              <div key={object.id} className='relative'>
                <div className='flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 group'>
                  {/* Object Info */}
                  <div className='flex items-center space-x-2 min-w-0 flex-1'>
                    {/* Visibility Toggle */}
                    <button
                      onClick={() => onToggleVisibility(object.id)}
                      className={`flex-shrink-0 p-1 rounded transition-colors ${
                        object.visible
                          ? 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                      }`}
                      title={object.visible ? 'Hide' : 'Show'}
                    >
                      {object.visible ? <Icon name="Eye" size={16} /> : <Icon name="EyeOff" size={16} />}
                    </button>

                    {/* Type Icon */}
                    <div className='flex-shrink-0 text-gray-500 dark:text-gray-400'>
                      {getObjectIcon(object.type)}
                    </div>

                    {/* Name and Type */}
                    <div className='flex-1 min-w-0'>
                      <div
                        className={`text-sm truncate ${
                          object.visible
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {getObjectTypeLabel(object.type)} #{index + 1}
                      </div>
                      <div className='text-xs text-gray-400 dark:text-gray-500'>
                        {new Date(object.createdAt).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Color Button */}
                    <button
                      onClick={() =>
                        setColorPickerOpen(colorPickerOpen === object.id ? null : object.id)
                      }
                      className='flex-shrink-0 p-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600'
                      title='Change color'
                    >
                      <div className='flex items-center space-x-1'>
                        <div
                          className='w-4 h-4 rounded border border-gray-300 dark:border-gray-600'
                          style={{ backgroundColor: object.color }}
                        />
                        <Icon name="Palette" size={12} className='text-gray-400' />
                      </div>
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => onRemove(object.id)}
                    className='flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all ml-2'
                    title='Remove'
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>

                {/* Color Picker Dropdown */}
                {colorPickerOpen === object.id && (
                  <div className='absolute left-3 right-3 top-full z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 mt-1'>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mb-2'>
                      Choose Color
                    </div>
                    <div className='grid grid-cols-4 gap-2'>
                      {colorPresets.map(color => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(object.id, color)}
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            object.color === color
                              ? 'border-gray-900 dark:border-white scale-110'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {objects.length > 0 && (
        <div className='px-3 py-2 border-t border-gray-200 dark:border-gray-700'>
          <button
            onClick={() => objects.forEach(obj => onRemove(obj.id))}
            className='w-full px-3 py-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors'
          >
            Clear All ({objects.length})
          </button>
        </div>
      )}
    </div>
  )
}

export default DrawingObjectsPanel
