import React, { useState } from 'react'
import { DrawingTool, drawingTools } from './DrawingToolsPanel'
import { DrawingToolType } from '@trading-viewer/shared'
import ObjectsList, { ChartObject } from './ObjectsList'
import { Icon } from 'lucide-react'
import { crosshairPlus } from '@lucide/lab'

interface LeftDrawingToolbarProps {
  activeTool: DrawingToolType | null
  onToolSelect: (toolType: DrawingToolType | null) => void
  objects?: ChartObject[]
  onToggleObjectVisibility?: (id: string) => void
  onRemoveObject?: (id: string) => void
  className?: string
}

export const LeftDrawingToolbar: React.FC<LeftDrawingToolbarProps> = ({
  activeTool,
  onToolSelect,
  objects = [],
  onToggleObjectVisibility,
  onRemoveObject,
  className = '',
}) => {
  const [showObjectsList, setShowObjectsList] = useState(false)
  const handleToolClick = (tool: DrawingTool) => {
    console.log('Tool clicked:', tool.type, 'current active:', activeTool)
    if (activeTool === tool.type) {
      console.log('Deselecting tool')
      onToolSelect(null) // Deselect if already active
    } else {
      console.log('Selecting tool:', tool.type)
      onToolSelect(tool.type)
    }
  }

  return (
    <div
      className={`flex flex-col bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 ${className}`}
    >
      {/* Cursor/Select Tool */}
      <button
        onClick={() => onToolSelect(null)}
        className={`flex items-center justify-center w-12 h-12 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
          !activeTool
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
        }`}
        title='Select'
      >
        <Icon iconNode={crosshairPlus} className='w-5 h-5' />
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
          title='Objects List'
        >
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.5}
              d='M4 6h16M4 10h16M4 14h16M4 18h16'
            />
          </svg>
        </button>

        {/* Objects List Dropdown */}
        {showObjectsList && (
          <div className='absolute left-full bottom-0 ml-2 z-50'>
            <ObjectsList
              objects={objects}
              onToggleVisibility={onToggleObjectVisibility || (() => {})}
              onRemove={onRemoveObject || (() => {})}
              className='w-64'
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default LeftDrawingToolbar
