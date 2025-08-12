import React, { useState } from 'react'
import { DrawingTool, drawingTools } from './DrawingToolsPanel'
import { DrawingToolType } from '@trading-viewer/shared'
import ObjectsList, { ChartObject } from './ObjectsList'

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
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122'
          />
        </svg>
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

      {/* Separator */}
      <div className='h-px bg-gray-300 dark:bg-gray-700 mx-2' />

      {/* Additional Tools */}
      <button
        className='flex items-center justify-center w-12 h-12 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
        title='Measure'
      >
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
          />
        </svg>
      </button>

      <button
        className='flex items-center justify-center w-12 h-12 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
        title='Zoom'
      >
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7'
          />
        </svg>
      </button>

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
