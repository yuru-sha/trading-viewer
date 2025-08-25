import React, { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import { DrawingTool } from '@trading-viewer/shared'

interface DrawingContextMenuProps {
  x: number
  y: number
  tool: DrawingTool
  onClose: () => void
  onChangeColor: (color: string) => void
  onDelete: () => void
  onDuplicate?: () => void
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

export const DrawingContextMenu: React.FC<DrawingContextMenuProps> = ({
  x,
  y,
  tool,
  onClose,
  onChangeColor,
  onDelete,
  onDuplicate,
  className = '',
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Position menu to stay within viewport
  const getMenuStyle = () => {
    const menuWidth = 200
    const menuHeight = showColorPicker ? 300 : 150

    let left = x
    let top = y

    // Adjust if menu would go off right edge
    if (left + menuWidth > window.innerWidth) {
      left = x - menuWidth
    }

    // Adjust if menu would go off bottom edge
    if (top + menuHeight > window.innerHeight) {
      top = y - menuHeight
    }

    return {
      left: `${Math.max(0, left)}px`,
      top: `${Math.max(0, top)}px`,
    }
  }

  const handleColorChange = (color: string) => {
    onChangeColor(color)
    setShowColorPicker(false)
    onClose()
  }

  const handleDelete = () => {
    onDelete()
    onClose()
  }

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate()
    }
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[180px] ${className}`}
      style={getMenuStyle()}
    >
      {/* Header */}
      <div className='px-3 py-1 border-b border-gray-200 dark:border-gray-700'>
        <div className='text-xs font-medium text-gray-500 dark:text-gray-400'>
          {tool.type.charAt(0).toUpperCase() + tool.type.slice(1)} Line
        </div>
      </div>

      {/* Menu Items */}
      <div className='py-1'>
        {/* Color */}
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className='flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        >
          <div className='flex items-center space-x-2'>
            <div
              className='w-4 h-4 rounded border border-gray-300 dark:border-gray-600'
              style={{ backgroundColor: tool.style.color }}
            />
            <Icon name='Palette' size={16} />
            <span>Change Color</span>
          </div>
        </button>

        {/* Color Picker */}
        {showColorPicker && (
          <div className='px-3 py-2 border-t border-gray-200 dark:border-gray-700'>
            <div className='grid grid-cols-4 gap-2'>
              {colorPresets.map(color => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${
                    tool.style.color === color
                      ? 'border-gray-900 dark:border-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Duplicate */}
        {onDuplicate && (
          <button
            onClick={handleDuplicate}
            className='flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          >
            <div className='flex items-center space-x-3'>
              <Icon name='Copy' size={16} />
              <span>Duplicate</span>
            </div>
          </button>
        )}

        {/* Separator */}
        <div className='my-1 border-t border-gray-200 dark:border-gray-700' />

        {/* Delete */}
        <button
          onClick={handleDelete}
          className='flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        >
          <div className='flex items-center space-x-3'>
            <Icon name='Trash2' size={16} />
            <span>Delete</span>
          </div>
        </button>
      </div>
    </div>
  )
}

export default DrawingContextMenu
