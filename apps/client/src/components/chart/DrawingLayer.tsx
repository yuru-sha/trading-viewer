import React, { useMemo } from 'react'
import { DrawingTool, ChartBounds } from '@trading-viewer/shared'

interface DrawingLayerProps {
  tools: DrawingTool[]
  chartBounds: ChartBounds
  selectedToolId: string | null
  currentDrawing?: Partial<DrawingTool> | null
  onToolSelect?: (toolId: string | null) => void
  className?: string
}

/**
 * Drawing Layer Component
 * - Renders all drawing tools on the chart
 * - Handles tool selection and interaction
 * - Converts price/time coordinates to pixel coordinates
 */
export const DrawingLayer: React.FC<DrawingLayerProps> = ({
  tools,
  chartBounds,
  selectedToolId,
  currentDrawing,
  onToolSelect,
  className = '',
}) => {
  // Convert price/time coordinates to pixel coordinates
  const convertToPixels = useMemo(() => {
    return (timestamp: number, price: number) => {
      const x =
        ((timestamp - chartBounds.startTimestamp) /
          (chartBounds.endTimestamp - chartBounds.startTimestamp)) *
        chartBounds.width
      const y =
        ((chartBounds.maxPrice - price) / (chartBounds.maxPrice - chartBounds.minPrice)) *
        chartBounds.height

      return { x, y }
    }
  }, [chartBounds])

  const renderTrendLine = (
    tool: DrawingTool | Partial<DrawingTool>,
    isSelected: boolean,
    isCurrent = false
  ) => {
    if (!tool.points || tool.points.length < 2) return null

    const start = convertToPixels(tool.points[0].timestamp, tool.points[0].price)
    const end = convertToPixels(tool.points[1].timestamp, tool.points[1].price)

    return (
      <g key={tool.id || 'current'}>
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={tool.style?.color || '#3b82f6'}
          strokeWidth={tool.style?.thickness || 2}
          strokeOpacity={tool.style?.opacity || 1}
          strokeDasharray={tool.style?.dashPattern?.join(' ')}
          className={`${isCurrent ? 'pointer-events-none' : 'cursor-pointer'} ${
            isSelected ? 'drop-shadow-lg' : ''
          }`}
          onClick={() => !isCurrent && onToolSelect && onToolSelect(tool.id || null)}
        />

        {/* Selection handles */}
        {isSelected && !isCurrent && (
          <>
            <circle
              cx={start.x}
              cy={start.y}
              r='4'
              fill='white'
              stroke='#3b82f6'
              strokeWidth='2'
              className='cursor-grab'
            />
            <circle
              cx={end.x}
              cy={end.y}
              r='4'
              fill='white'
              stroke='#3b82f6'
              strokeWidth='2'
              className='cursor-grab'
            />
          </>
        )}
      </g>
    )
  }

  const renderHorizontalLine = (
    tool: DrawingTool | Partial<DrawingTool>,
    isSelected: boolean,
    isCurrent = false
  ) => {
    if (!tool.points || tool.points.length < 1) return null

    const price = tool.points[0].price
    const y = convertToPixels(0, price).y

    return (
      <g key={tool.id || 'current'}>
        <line
          x1={0}
          y1={y}
          x2={chartBounds.width}
          y2={y}
          stroke={tool.style?.color || '#10b981'}
          strokeWidth={tool.style?.thickness || 2}
          strokeOpacity={tool.style?.opacity || 0.8}
          strokeDasharray={tool.style?.dashPattern?.join(' ') || '5 5'}
          className={`${isCurrent ? 'pointer-events-none' : 'cursor-pointer'} ${
            isSelected ? 'drop-shadow-lg' : ''
          }`}
          onClick={() => !isCurrent && onToolSelect && onToolSelect(tool.id || null)}
        />

        {/* Price label */}
        <g>
          <rect
            x={chartBounds.width - 60}
            y={y - 10}
            width='55'
            height='20'
            fill={tool.style?.color || '#10b981'}
            fillOpacity='0.9'
            rx='3'
          />
          <text
            x={chartBounds.width - 32}
            y={y + 4}
            fill='white'
            fontSize='11'
            textAnchor='middle'
            className='font-medium'
          >
            ${price.toFixed(2)}
          </text>
        </g>

        {/* Selection handles */}
        {isSelected && !isCurrent && (
          <>
            <circle
              cx={chartBounds.width / 2}
              cy={y}
              r='4'
              fill='white'
              stroke='#10b981'
              strokeWidth='2'
              className='cursor-ns-resize'
            />
          </>
        )}
      </g>
    )
  }

  const renderVerticalLine = (
    tool: DrawingTool | Partial<DrawingTool>,
    isSelected: boolean,
    isCurrent = false
  ) => {
    if (!tool.points || tool.points.length < 1) return null

    const timestamp = tool.points[0].timestamp
    const x = convertToPixels(timestamp, 0).x

    return (
      <g key={tool.id || 'current'}>
        <line
          x1={x}
          y1={0}
          x2={x}
          y2={chartBounds.height}
          stroke={tool.style?.color || '#8b5cf6'}
          strokeWidth={tool.style?.thickness || 2}
          strokeOpacity={tool.style?.opacity || 0.8}
          strokeDasharray={tool.style?.dashPattern?.join(' ') || '5 5'}
          className={`${isCurrent ? 'pointer-events-none' : 'cursor-pointer'} ${
            isSelected ? 'drop-shadow-lg' : ''
          }`}
          onClick={() => !isCurrent && onToolSelect && onToolSelect(tool.id || null)}
        />

        {/* Time label */}
        <g>
          <rect
            x={x - 35}
            y={chartBounds.height - 25}
            width='70'
            height='20'
            fill={tool.style?.color || '#8b5cf6'}
            fillOpacity='0.9'
            rx='3'
          />
          <text
            x={x}
            y={chartBounds.height - 11}
            fill='white'
            fontSize='10'
            textAnchor='middle'
            className='font-medium'
          >
            {new Date(timestamp * 1000).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </text>
        </g>

        {/* Selection handles */}
        {isSelected && !isCurrent && (
          <circle
            cx={x}
            cy={chartBounds.height / 2}
            r='4'
            fill='white'
            stroke='#8b5cf6'
            strokeWidth='2'
            className='cursor-ew-resize'
          />
        )}
      </g>
    )
  }

  const renderRectangle = (
    tool: DrawingTool | Partial<DrawingTool>,
    isSelected: boolean,
    isCurrent = false
  ) => {
    if (!tool.points || tool.points.length < 2) return null

    const start = convertToPixels(tool.points[0].timestamp, tool.points[0].price)
    const end = convertToPixels(tool.points[1].timestamp, tool.points[1].price)

    const x = Math.min(start.x, end.x)
    const y = Math.min(start.y, end.y)
    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)

    return (
      <g key={tool.id || 'current'}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={tool.style?.color || '#f59e0b'}
          strokeWidth={tool.style?.thickness || 2}
          strokeOpacity={tool.style?.opacity || 1}
          fill={tool.style?.fillColor || tool.style?.color || '#f59e0b'}
          fillOpacity={tool.style?.fillOpacity || 0.1}
          strokeDasharray={tool.style?.dashPattern?.join(' ')}
          className={`${isCurrent ? 'pointer-events-none' : 'cursor-pointer'} ${
            isSelected ? 'drop-shadow-lg' : ''
          }`}
          onClick={() => !isCurrent && onToolSelect && onToolSelect(tool.id || null)}
        />

        {/* Selection handles */}
        {isSelected && !isCurrent && (
          <>
            <circle
              cx={x}
              cy={y}
              r='4'
              fill='white'
              stroke='#f59e0b'
              strokeWidth='2'
              className='cursor-nw-resize'
            />
            <circle
              cx={x + width}
              cy={y}
              r='4'
              fill='white'
              stroke='#f59e0b'
              strokeWidth='2'
              className='cursor-ne-resize'
            />
            <circle
              cx={x}
              cy={y + height}
              r='4'
              fill='white'
              stroke='#f59e0b'
              strokeWidth='2'
              className='cursor-sw-resize'
            />
            <circle
              cx={x + width}
              cy={y + height}
              r='4'
              fill='white'
              stroke='#f59e0b'
              strokeWidth='2'
              className='cursor-se-resize'
            />
          </>
        )}
      </g>
    )
  }

  const renderArrow = (
    tool: DrawingTool | Partial<DrawingTool>,
    isSelected: boolean,
    isCurrent = false
  ) => {
    if (!tool.points || tool.points.length < 2) return null

    const start = convertToPixels(tool.points[0].timestamp, tool.points[0].price)
    const end = convertToPixels(tool.points[1].timestamp, tool.points[1].price)

    // Calculate arrow head
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const headLength = 15
    const headAngle = Math.PI / 6

    const head1X = end.x - headLength * Math.cos(angle - headAngle)
    const head1Y = end.y - headLength * Math.sin(angle - headAngle)
    const head2X = end.x - headLength * Math.cos(angle + headAngle)
    const head2Y = end.y - headLength * Math.sin(angle + headAngle)

    return (
      <g key={tool.id || 'current'}>
        {/* Arrow line */}
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={tool.style?.color || '#ef4444'}
          strokeWidth={tool.style?.thickness || 2}
          strokeOpacity={tool.style?.opacity || 1}
          className={`${isCurrent ? 'pointer-events-none' : 'cursor-pointer'} ${
            isSelected ? 'drop-shadow-lg' : ''
          }`}
          onClick={() => !isCurrent && onToolSelect && onToolSelect(tool.id || null)}
        />

        {/* Arrow head */}
        <polygon
          points={`${end.x},${end.y} ${head1X},${head1Y} ${head2X},${head2Y}`}
          fill={tool.style?.color || '#ef4444'}
          fillOpacity={tool.style?.opacity || 1}
          className={`${isCurrent ? 'pointer-events-none' : 'cursor-pointer'}`}
          onClick={() => !isCurrent && onToolSelect && onToolSelect(tool.id || null)}
        />

        {/* Selection handles */}
        {isSelected && !isCurrent && (
          <>
            <circle
              cx={start.x}
              cy={start.y}
              r='4'
              fill='white'
              stroke='#ef4444'
              strokeWidth='2'
              className='cursor-grab'
            />
            <circle
              cx={end.x}
              cy={end.y}
              r='4'
              fill='white'
              stroke='#ef4444'
              strokeWidth='2'
              className='cursor-grab'
            />
          </>
        )}
      </g>
    )
  }

  const renderText = (
    tool: DrawingTool | Partial<DrawingTool>,
    isSelected: boolean,
    isCurrent = false
  ) => {
    if (!tool.points || tool.points.length < 1) return null

    const point = convertToPixels(tool.points[0].timestamp, tool.points[0].price)
    const text = tool.text || 'Text'

    return (
      <g key={tool.id || 'current'}>
        {/* Text background */}
        <rect
          x={point.x - 5}
          y={point.y - (tool.style?.fontSize || 12) - 5}
          width={text.length * ((tool.style?.fontSize || 12) * 0.6) + 10}
          height={(tool.style?.fontSize || 12) + 10}
          fill='white'
          fillOpacity='0.9'
          stroke={tool.style?.color || '#6b7280'}
          strokeWidth='1'
          rx='3'
          className={`${isCurrent ? 'pointer-events-none' : 'cursor-pointer'}`}
          onClick={() => !isCurrent && onToolSelect && onToolSelect(tool.id || null)}
        />

        {/* Text */}
        <text
          x={point.x}
          y={point.y - 5}
          fill={tool.style?.color || '#6b7280'}
          fontSize={tool.style?.fontSize || 12}
          fontFamily={tool.style?.fontFamily || 'system-ui'}
          fontWeight='500'
          className={`${isCurrent ? 'pointer-events-none' : 'cursor-pointer'} select-none`}
          onClick={() => !isCurrent && onToolSelect && onToolSelect(tool.id || null)}
        >
          {text}
        </text>

        {/* Selection handles */}
        {isSelected && !isCurrent && (
          <circle
            cx={point.x}
            cy={point.y}
            r='4'
            fill='white'
            stroke='#6b7280'
            strokeWidth='2'
            className='cursor-grab'
          />
        )}
      </g>
    )
  }

  const renderTool = (
    tool: DrawingTool | Partial<DrawingTool>,
    isSelected: boolean,
    isCurrent = false
  ) => {
    if (!tool.visible && !isCurrent) return null

    switch (tool.type) {
      case 'trendline':
        return renderTrendLine(tool, isSelected, isCurrent)
      case 'horizontal':
        return renderHorizontalLine(tool, isSelected, isCurrent)
      case 'vertical':
        return renderVerticalLine(tool, isSelected, isCurrent)
      case 'rectangle':
        return renderRectangle(tool, isSelected, isCurrent)
      case 'arrow':
        return renderArrow(tool, isSelected, isCurrent)
      case 'text':
        return renderText(tool, isSelected, isCurrent)
      default:
        return null
    }
  }

  return (
    <svg
      className={`absolute inset-0 pointer-events-auto ${className}`}
      width={chartBounds.width}
      height={chartBounds.height}
      style={{ zIndex: 10 }}
    >
      {/* Render existing tools */}
      {tools.map(tool => renderTool(tool, tool.id === selectedToolId, false))}

      {/* Render current drawing */}
      {currentDrawing && renderTool(currentDrawing, false, true)}
    </svg>
  )
}

export default DrawingLayer
