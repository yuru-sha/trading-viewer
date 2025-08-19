import React, { useState } from 'react'
import { Button } from '@trading-viewer/ui'
import { api } from '../../lib/apiClient'
// Test regular icons from lucide-react
import { Icon } from '@ui'

export interface DrawingTool {
  id: string
  name: string
  icon: React.ReactNode
  type: 'trendline' | 'horizontal' | 'vertical' | 'fibonacci'
}

export interface DrawingElement {
  id: string
  tool: DrawingTool
  points: Array<{ x: number; y: number; time?: number; price?: number }>
  style: {
    color: string
    width: number
    dashStyle?: 'solid' | 'dashed' | 'dotted'
  }
  text?: string
  created: number
}

interface DrawingToolsPanelProps {
  activeTool: DrawingTool | null
  onToolSelect: (tool: DrawingTool | null) => void
  onClearAll: () => void
  drawingElements: DrawingElement[]
  onSaveDrawing?: (element: DrawingElement) => void
  onDeleteDrawing?: (elementId: string) => void
  currentSymbol?: string
  className?: string
}

export const drawingTools: DrawingTool[] = [
  {
    id: 'trendline',
    name: 'Trend Line',
    type: 'trendline',
    icon: (
      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 7l10 10' />
      </svg>
    ),
  },
  {
    id: 'horizontal',
    name: 'Horizontal Line',
    type: 'horizontal',
    icon: (
      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 12h16' />
      </svg>
    ),
  },
  {
    id: 'vertical',
    name: 'Vertical Line',
    type: 'vertical',
    icon: (
      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16' />
      </svg>
    ),
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci Retracement',
    type: 'fibonacci',
    icon: <Icon name="ChartNoAxesGantt" className='w-4 h-4' />,
  },
]

export const DrawingToolsPanel: React.FC<DrawingToolsPanelProps> = ({
  activeTool,
  onToolSelect,
  onClearAll,
  drawingElements,
  onSaveDrawing,
  onDeleteDrawing,
  currentSymbol = 'AAPL',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const handleToolClick = (tool: DrawingTool) => {
    console.log('Tool clicked:', tool.name)
    if (activeTool?.id === tool.id) {
      console.log('Deselecting tool')
      onToolSelect(null) // Deselect if already active
    } else {
      console.log('Selecting tool:', tool.name)
      onToolSelect(tool)
    }
  }

  const handleSaveDrawings = async () => {
    if (!currentSymbol || drawingElements.length === 0) return

    setIsLoading(true)
    try {
      for (const element of drawingElements) {
        // Convert DrawingElement to API format
        const drawingTool = {
          type: element.tool.type,
          points: element.points.map(point => ({
            timestamp: point.time || Date.now(),
            price: point.price || 0,
          })),
          style: {
            color: element.style.color,
            thickness: element.style.width,
            opacity: 1,
          },
          text: element.text,
          visible: true,
          locked: false,
        }

        await api.drawing.createDrawingTool({
          symbol: currentSymbol,
          tool: drawingTool,
        })
      }

      console.log(`Saved ${drawingElements.length} drawings for ${currentSymbol}`)
    } catch (error) {
      console.error('Failed to save drawings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSavedDrawings = async () => {
    if (!currentSymbol) return

    setIsLoading(true)
    try {
      // Get saved drawings and delete them
      const response = await api.drawing.getDrawingTools(currentSymbol)
      if (response.status === 'success' && response.data) {
        for (const tool of response.data) {
          await api.drawing.deleteDrawingTool(tool.id)
        }
        console.log(`Deleted saved drawings for ${currentSymbol}`)
      }
    } catch (error) {
      console.error('Failed to delete saved drawings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadDrawings = async () => {
    if (!currentSymbol) return

    setIsLoading(true)
    try {
      const response = await api.drawing.getDrawingTools(currentSymbol)
      if (response.status === 'success' && response.data) {
        // Convert API format to DrawingElement format
        const loadedElements: DrawingElement[] = response.data.map(tool => {
          // Find matching tool definition
          const toolDef = drawingTools.find(t => t.type === tool.type) || drawingTools[0]

          return {
            id: tool.id,
            tool: toolDef,
            points: tool.points.map(point => ({
              x: 0, // Will be calculated by chart
              y: 0, // Will be calculated by chart
              time: point.timestamp,
              price: point.price,
            })),
            style: {
              color: tool.style.color,
              width: tool.style.thickness,
              dashStyle: tool.style.dashPattern ? 'dashed' : 'solid',
            },
            text: tool.text,
            created: tool.createdAt,
          }
        })

        // Load the drawings into the chart
        loadedElements.forEach(element => {
          if (onSaveDrawing) {
            onSaveDrawing(element)
          }
        })

        console.log(`Loaded ${loadedElements.length} drawings for ${currentSymbol}`)
      }
    } catch (error) {
      console.error('Failed to load drawings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}
    >
      {/* Header */}
      <div className='flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center space-x-2'>
          <svg
            className='w-4 h-4 text-gray-600 dark:text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
            />
          </svg>
          <span className='text-sm font-medium text-gray-900 dark:text-white'>Drawing Tools</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
        >
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
          </svg>
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className='p-3'>
          {/* Drawing Tools Grid */}
          <div className='grid grid-cols-3 gap-2 mb-3'>
            {drawingTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
                  activeTool?.id === tool.id
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-400'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
                title={tool.name}
              >
                {tool.icon}
                <span className='text-xs mt-1 font-medium'>{tool.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Active Tool Info */}
          {activeTool && (
            <div className='mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  {activeTool.icon}
                  <span className='text-sm text-blue-700 dark:text-blue-400'>
                    {activeTool.name} active - Click chart twice to draw
                  </span>
                </div>
                <button
                  onClick={() => onToolSelect(null)}
                  className='text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900'
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Save/Load Actions */}
          <div className='flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mb-3'>
            <div className='text-xs text-gray-500 dark:text-gray-400'>
              Save/Load for {currentSymbol}
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='secondary'
                size='sm'
                onClick={handleSaveDrawings}
                disabled={drawingElements.length === 0 || isLoading}
                className='text-xs'
              >
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant='secondary'
                size='sm'
                onClick={handleLoadDrawings}
                disabled={isLoading}
                className='text-xs'
              >
                {isLoading ? 'Loading...' : 'Load'}
              </Button>
              <Button
                variant='secondary'
                size='sm'
                onClick={handleDeleteSavedDrawings}
                disabled={isLoading}
                className='text-xs'
              >
                {isLoading ? 'Deleting...' : 'Delete Saved'}
              </Button>
            </div>
          </div>

          {/* Drawing Elements List */}
          {drawingElements.length > 0 && (
            <div className='mb-3'>
              <div className='text-xs font-medium text-gray-900 dark:text-white mb-2'>
                Current Drawings
              </div>
              <div className='space-y-1 max-h-32 overflow-y-auto'>
                {drawingElements.map((element, index) => (
                  <div
                    key={element.id}
                    className='flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs'
                  >
                    <div className='flex items-center space-x-2'>
                      <div
                        className='w-3 h-3 rounded-full border'
                        style={{ backgroundColor: element.style.color }}
                      />
                      <span className='text-gray-700 dark:text-gray-300'>
                        {element.tool.name} #{index + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (onDeleteDrawing) {
                          onDeleteDrawing(element.id)
                        }
                      }}
                      className='p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded'
                      title='Delete this drawing'
                    >
                      <svg
                        className='w-3 h-3'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M6 18L18 6M6 6l12 12'
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className='flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700'>
            <div className='text-xs text-gray-500 dark:text-gray-400'>
              {drawingElements.length} drawing{drawingElements.length !== 1 ? 's' : ''}
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='secondary'
                size='sm'
                onClick={onClearAll}
                disabled={drawingElements.length === 0}
                className='text-xs'
              >
                Clear All
              </Button>
              <Button
                variant='secondary'
                size='sm'
                onClick={() => onToolSelect(null)}
                disabled={!activeTool}
                className='text-xs'
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DrawingToolsPanel
