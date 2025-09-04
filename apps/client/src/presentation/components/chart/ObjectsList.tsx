import React from 'react'
import Icon from '@/presentation/components/Icon'

export interface ChartObject {
  id: string
  name: string
  type: 'indicator' | 'overlay' | 'volume' | 'price'
  visible: boolean
  color?: string
}

interface ObjectsListProps {
  objects: ChartObject[]
  onToggleVisibility: (id: string) => void
  onRemove: (id: string) => void
  className?: string
}

export const ObjectsList: React.FC<ObjectsListProps> = ({
  objects,
  onToggleVisibility,
  onRemove,
  className = '',
}) => {
  const getObjectIcon = (type: ChartObject['type']) => {
    switch (type) {
      case 'price':
        return <Icon name='BarChart3' size={16} />
      case 'volume':
        return <Icon name='Volume2' size={16} />
      case 'indicator':
        return <Icon name='TrendingUp' size={16} />
      case 'overlay':
        return <Icon name='Layers' size={16} />
      default:
        return null
    }
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-700'>
        <h3 className='text-sm font-medium text-gray-900 dark:text-white'>Objects Tree</h3>
      </div>

      {/* Objects List */}
      <div className='max-h-96 overflow-y-auto'>
        {objects.length === 0 ? (
          <div className='px-3 py-4 text-center'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>No objects to display</p>
          </div>
        ) : (
          <div className='py-2'>
            {objects.map(object => (
              <div
                key={object.id}
                className='flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 group'
              >
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
                    {object.visible ? (
                      <Icon name='Eye' size={16} />
                    ) : (
                      <Icon name='EyeOff' size={16} />
                    )}
                  </button>

                  {/* Icon */}
                  <div className='flex-shrink-0 text-gray-500 dark:text-gray-400'>
                    {getObjectIcon(object.type)}
                  </div>

                  {/* Name */}
                  <span
                    className={`text-sm truncate ${
                      object.visible
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {object.name}
                  </span>

                  {/* Color indicator */}
                  {object.color && (
                    <div
                      className='w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600'
                      style={{ backgroundColor: object.color }}
                    />
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => onRemove(object.id)}
                  className='flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all'
                  title='Remove'
                >
                  <Icon name='Trash2' size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ObjectsList
