import React, { useState, useImperativeHandle, forwardRef } from 'react'
import { DrawingTool, drawingTools } from './DrawingToolsPanel'
import { DrawingToolType } from '@trading-viewer/shared'
import DrawingObjectsPanel, { DrawingObject } from './DrawingObjectsPanel'
import { Icon } from '@trading-viewer/ui'

interface LeftDrawingToolbarProps {
  activeTool: DrawingToolType | null
  onToolSelect: (toolType: DrawingToolType | null) => void
  objects?: DrawingObject[]
  onToggleObjectVisibility?: (id: string) => void
  onRemoveObject?: (id: string) => void
  onChangeObjectColor?: (id: string, color: string) => void
  className?: string
}

export interface LeftDrawingToolbarRef {
  closeObjectsPanel: () => void
}

export const LeftDrawingToolbar = forwardRef<LeftDrawingToolbarRef, LeftDrawingToolbarProps>(
  (
    {
      activeTool,
      onToolSelect,
      objects = [],
      onToggleObjectVisibility,
      onRemoveObject,
      onChangeObjectColor,
      className = '',
    },
    ref
  ) => {
    const [showObjectsList, setShowObjectsList] = useState(false)

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
      closeObjectsPanel: () => setShowObjectsList(false),
    }))

    const handleToolClick = (tool: DrawingTool) => {
      console.log('Tool clicked:', tool.type, 'current active:', activeTool)
      // ツールを選択（トグル動作を無効化）
      console.log('Selecting tool:', tool.type)
      onToolSelect(tool.type)
    }

    return (
      <div
        className={`flex flex-col bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 ${className}`}
      >
        {/* Cursor/Select Tool */}
        <button
          onClick={() => {
            console.log('Select tool clicked')
            onToolSelect(null)
          }}
          className={`flex items-center justify-center w-12 h-12 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
            !activeTool
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
          }`}
          title='Select'
        >
          <Icon name='Crosshair' className='w-5 h-5' />
        </button>

        {/* Separator */}
        <div className='h-px bg-gray-300 dark:bg-gray-700 mx-2' />

        {/* Drawing Tools */}
        {drawingTools.map(tool => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool)}
            className={`flex items-center justify-center w-12 h-12 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
              activeTool === tool.type
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
            title={tool.name}
          >
            {tool.icon}
          </button>
        ))}

        {/* Spacer to push Objects button to bottom */}
        <div className='flex-1'></div>

        {/* Separator */}
        <div className='h-px bg-gray-300 dark:bg-gray-700 mx-2' />

        {/* Objects List */}
        <div className='relative'>
          <button
            onClick={() => setShowObjectsList(!showObjectsList)}
            className={`flex items-center justify-center w-12 h-12 transition-colors ${
              showObjectsList
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title='Drawing Objects'
          >
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M12 2L2 7l10 5 10-5L12 2z M2 17l10 5 10-5 M2 12l10 5 10-5'
              />
            </svg>
          </button>

          {/* Drawing Objects List Dropdown */}
          {showObjectsList && (
            <div className='absolute left-full bottom-0 ml-2 z-50'>
              <DrawingObjectsPanel
                objects={objects}
                onToggleVisibility={onToggleObjectVisibility || (() => {})}
                onRemove={onRemoveObject || (() => {})}
                onChangeColor={onChangeObjectColor || (() => {})}
                className='w-72'
              />
            </div>
          )}
        </div>
      </div>
    )
  }
)

LeftDrawingToolbar.displayName = 'LeftDrawingToolbar'

export default LeftDrawingToolbar
