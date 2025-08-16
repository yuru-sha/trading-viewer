import React, { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChartAnnotation, AnnotationType, ChartBounds } from '@trading-viewer/shared'
import { Button } from '@trading-viewer/ui'

interface AnnotationLayerProps {
  annotations: ChartAnnotation[]
  chartBounds: ChartBounds
  selectedAnnotationId: string | null
  isEditing: boolean
  showAnnotations: boolean
  onAnnotationSelect?: (id: string | null) => void
  onAnnotationUpdate?: (id: string, updates: Partial<ChartAnnotation>) => void
  onAnnotationDelete?: (id: string) => void
  onAnnotationMove?: (id: string, position: ChartAnnotation['position']) => void
  className?: string
}

interface AnnotationPosition {
  x: number
  y: number
}

/**
 * Annotation Layer Component
 * - Renders all chart annotations
 * - Handles annotation positioning and interaction
 * - Supports editing and moving annotations
 */
export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  annotations,
  chartBounds,
  selectedAnnotationId,
  isEditing,
  showAnnotations,
  onAnnotationSelect,
  onAnnotationUpdate,
  onAnnotationDelete,
  onAnnotationMove,
  className = '',
}) => {
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{
    isDragging: boolean
    annotationId: string
    offset: { x: number; y: number }
  } | null>(null)
  const layerRef = useRef<HTMLDivElement>(null)

  // Convert annotation position to pixel coordinates
  const getPixelPosition = useCallback(
    (annotation: ChartAnnotation): AnnotationPosition => {
      const { position } = annotation

      switch (position.anchor) {
        case 'price':
          if (annotation.price && annotation.timestamp) {
            const x =
              ((annotation.timestamp - chartBounds.startTimestamp) /
                (chartBounds.endTimestamp - chartBounds.startTimestamp)) *
              chartBounds.width
            const y =
              ((chartBounds.maxPrice - annotation.price) /
                (chartBounds.maxPrice - chartBounds.minPrice)) *
              chartBounds.height
            return { x, y }
          }
          break
        case 'time':
          if (annotation.timestamp) {
            const x =
              ((annotation.timestamp - chartBounds.startTimestamp) /
                (chartBounds.endTimestamp - chartBounds.startTimestamp)) *
              chartBounds.width
            return { x, y: position.y }
          }
          break
        case 'chart':
          return {
            x: (position.x / 100) * chartBounds.width,
            y: (position.y / 100) * chartBounds.height,
          }
        case 'fixed':
        default:
          return { x: position.x, y: position.y }
      }

      return { x: position.x, y: position.y }
    },
    [chartBounds]
  )

  // Handle annotation click
  const handleAnnotationClick = useCallback(
    (annotation: ChartAnnotation, event: React.MouseEvent) => {
      event.stopPropagation()

      if (event.detail === 2) {
        // Double click to edit
        setEditingAnnotationId(annotation.id)
      } else {
        onAnnotationSelect?.(annotation.id)
      }
    },
    [onAnnotationSelect]
  )

  // Handle annotation drag start
  const handleDragStart = useCallback(
    (annotation: ChartAnnotation, event: React.MouseEvent) => {
      event.preventDefault()

      const rect = layerRef.current?.getBoundingClientRect()
      if (!rect) return

      const offset = {
        x: event.clientX - rect.left - getPixelPosition(annotation).x,
        y: event.clientY - rect.top - getPixelPosition(annotation).y,
      }

      setDragState({
        isDragging: true,
        annotationId: annotation.id,
        offset,
      })
    },
    [getPixelPosition]
  )

  // Handle annotation drag
  const handleDrag = useCallback(
    (event: React.MouseEvent) => {
      if (!dragState?.isDragging || !layerRef.current) return

      const rect = layerRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left - dragState.offset.x
      const y = event.clientY - rect.top - dragState.offset.y

      // Convert pixel position back to annotation position
      const annotation = annotations.find(a => a.id === dragState.annotationId)
      if (!annotation) return

      let newPosition: ChartAnnotation['position']

      switch (annotation.position.anchor) {
        case 'price':
          const timestamp =
            chartBounds.startTimestamp +
            (x / chartBounds.width) * (chartBounds.endTimestamp - chartBounds.startTimestamp)
          const price =
            chartBounds.maxPrice -
            (y / chartBounds.height) * (chartBounds.maxPrice - chartBounds.minPrice)
          newPosition = {
            ...annotation.position,
            anchorTimestamp: timestamp,
            anchorPrice: price,
          }
          onAnnotationUpdate?.(annotation.id, {
            timestamp,
            price,
            position: newPosition,
          })
          break
        case 'chart':
          newPosition = {
            ...annotation.position,
            x: (x / chartBounds.width) * 100,
            y: (y / chartBounds.height) * 100,
          }
          onAnnotationMove?.(annotation.id, newPosition)
          break
        default:
          newPosition = {
            ...annotation.position,
            x,
            y,
          }
          onAnnotationMove?.(annotation.id, newPosition)
          break
      }
    },
    [dragState, annotations, chartBounds, onAnnotationUpdate, onAnnotationMove]
  )

  // Handle annotation drag end
  const handleDragEnd = useCallback(() => {
    setDragState(null)
  }, [])

  // Handle annotation edit save
  const handleEditSave = useCallback(
    (annotation: ChartAnnotation, updates: { title: string; content: string }) => {
      onAnnotationUpdate?.(annotation.id, updates)
      setEditingAnnotationId(null)
    },
    [onAnnotationUpdate]
  )

  // Handle annotation edit cancel
  const handleEditCancel = useCallback(() => {
    setEditingAnnotationId(null)
  }, [])

  // Render individual annotation
  const renderAnnotation = useCallback(
    (annotation: ChartAnnotation) => {
      const position = getPixelPosition(annotation)
      const isSelected = annotation.id === selectedAnnotationId
      const isCurrentlyEditing = annotation.id === editingAnnotationId

      return (
        <div
          key={annotation.id}
          className={`absolute pointer-events-auto cursor-pointer transition-all duration-200 ${
            isSelected ? 'z-50' : 'z-10'
          } ${dragState?.annotationId === annotation.id ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: annotation.style.zIndex,
          }}
          onClick={e => handleAnnotationClick(annotation, e)}
          onMouseDown={e => handleDragStart(annotation, e)}
        >
          {isCurrentlyEditing ? (
            <AnnotationEditor
              annotation={annotation}
              onSave={updates => handleEditSave(annotation, updates)}
              onCancel={handleEditCancel}
              onDelete={() => onAnnotationDelete?.(annotation.id)}
            />
          ) : (
            <AnnotationDisplay
              annotation={annotation}
              isSelected={isSelected}
              onEdit={() => setEditingAnnotationId(annotation.id)}
              onDelete={() => onAnnotationDelete?.(annotation.id)}
            />
          )}
        </div>
      )
    },
    [
      getPixelPosition,
      selectedAnnotationId,
      editingAnnotationId,
      dragState,
      handleAnnotationClick,
      handleDragStart,
      handleEditSave,
      handleEditCancel,
      onAnnotationDelete,
    ]
  )

  if (!showAnnotations) return null

  return (
    <div
      ref={layerRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      onMouseMove={handleDrag}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      style={{ zIndex: 20 }}
    >
      {annotations.map(renderAnnotation)}
    </div>
  )
}

// Annotation Display Component
interface AnnotationDisplayProps {
  annotation: ChartAnnotation
  isSelected: boolean
  onEdit: () => void
  onDelete: () => void
}

const AnnotationDisplay: React.FC<AnnotationDisplayProps> = ({
  annotation,
  isSelected,
  onEdit,
  onDelete,
}) => {
  const getTypeIcon = (type: AnnotationType) => {
    switch (type) {
      case 'note':
        return (
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
            />
          </svg>
        )
      case 'alert':
        return (
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        )
      case 'highlight':
        return (
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M7 20l4-16m2 16l4-16M6 9h14M4 15h14'
            />
          </svg>
        )
      case 'callout':
        return (
          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
            />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={`relative max-w-xs rounded-lg shadow-lg transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      style={{
        backgroundColor: annotation.style.backgroundColor,
        borderColor: annotation.style.borderColor,
        borderWidth: `${annotation.style.borderWidth}px`,
        borderRadius: `${annotation.style.borderRadius}px`,
        opacity: annotation.style.opacity,
        maxWidth: annotation.style.maxWidth ? `${annotation.style.maxWidth}px` : undefined,
        boxShadow: annotation.style.shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
      }}
    >
      {/* Pointer */}
      <div
        className='absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0'
        style={{
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: `8px solid ${annotation.style.backgroundColor}`,
        }}
      />

      {/* Header */}
      <div
        className='flex items-center justify-between p-2 border-b'
        style={{ borderColor: annotation.style.borderColor }}
      >
        <div className='flex items-center space-x-1'>
          <div style={{ color: annotation.style.textColor }}>{getTypeIcon(annotation.type)}</div>
          <h4
            className='text-sm font-semibold truncate'
            style={{
              color: annotation.style.textColor,
              fontSize: `${annotation.style.fontSize}px`,
              fontWeight: annotation.style.fontWeight,
            }}
          >
            {annotation.title}
          </h4>
        </div>

        {isSelected && (
          <div className='flex items-center space-x-1'>
            <button
              onClick={e => {
                e.stopPropagation()
                onEdit()
              }}
              className='p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded'
              title='Edit annotation'
            >
              <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
                />
              </svg>
            </button>
            <button
              onClick={e => {
                e.stopPropagation()
                onDelete()
              }}
              className='p-1 hover:bg-red-200 dark:hover:bg-red-600 rounded text-red-600'
              title='Delete annotation'
            >
              <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className='p-2 text-sm'
        style={{
          color: annotation.style.textColor,
          fontSize: `${annotation.style.fontSize}px`,
        }}
      >
        {annotation.content}
      </div>

      {/* Tags */}
      {annotation.tags.length > 0 && (
        <div className='px-2 pb-2'>
          <div className='flex flex-wrap gap-1'>
            {annotation.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className='inline-block px-2 py-1 text-xs rounded-full'
                style={{
                  backgroundColor: `${annotation.style.borderColor}20`,
                  color: annotation.style.textColor,
                }}
              >
                #{tag}
              </span>
            ))}
            {annotation.tags.length > 3 && (
              <span
                className='inline-block px-2 py-1 text-xs rounded-full'
                style={{
                  backgroundColor: `${annotation.style.borderColor}20`,
                  color: annotation.style.textColor,
                }}
              >
                +{annotation.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      {annotation.price && (
        <div className='px-2 pb-1'>
          <div className='text-xs opacity-75' style={{ color: annotation.style.textColor }}>
            Price: ${annotation.price.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}

// Annotation Editor Component
interface AnnotationEditorProps {
  annotation: ChartAnnotation
  onSave: (updates: { title: string; content: string }) => void
  onCancel: () => void
  onDelete: () => void
}

const AnnotationEditor: React.FC<AnnotationEditorProps> = ({
  annotation,
  onSave,
  onCancel,
  onDelete,
}) => {
  const [title, setTitle] = useState(annotation.title)
  const [content, setContent] = useState(annotation.content)

  const handleSave = () => {
    if (title.trim() && content.trim()) {
      onSave({ title: title.trim(), content: content.trim() })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div
      className='bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-blue-500 p-3 min-w-64 max-w-xs'
      onClick={e => e.stopPropagation()}
    >
      <div className='space-y-2'>
        <input
          type='text'
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Annotation title...'
          className='w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent'
          autoFocus
        />

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Add your note here...'
          rows={3}
          className='w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-transparent'
        />

        <div className='flex items-center justify-between space-x-2'>
          <button
            onClick={onDelete}
            className='text-red-600 hover:bg-red-50 dark:hover:bg-red-900 px-2 py-1 rounded text-xs'
          >
            Delete
          </button>

          <div className='flex space-x-2'>
            <Button variant='ghost' size='sm' onClick={onCancel} className='text-xs'>
              Cancel
            </Button>
            <Button
              variant='primary'
              size='sm'
              onClick={handleSave}
              disabled={!title.trim() || !content.trim()}
              className='text-xs'
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
        Ctrl+Enter to save, Esc to cancel
      </div>
    </div>
  )
}

export default AnnotationLayer
