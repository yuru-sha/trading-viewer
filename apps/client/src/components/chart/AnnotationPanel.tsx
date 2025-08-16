import React, { useState } from 'react'
import { Button } from '@trading-viewer/ui'
import {
  ChartAnnotation,
  AnnotationType,
  AnnotationFilter,
  AnnotationTemplate,
  ANNOTATION_PRESETS,
} from '@trading-viewer/shared'

interface AnnotationPanelProps {
  annotations: ChartAnnotation[]
  templates: AnnotationTemplate[]
  filter: AnnotationFilter | null
  selectedAnnotationId: string | null
  showAnnotations: boolean
  onAnnotationSelect: (id: string | null) => void
  onAnnotationDelete: (id: string) => void
  onFilterChange: (filter: AnnotationFilter) => void
  onClearFilter: () => void
  onToggleVisibility: () => void
  onCreateFromTemplate: (templateId: string, position: ChartAnnotation['position']) => void
  onExport: (format: 'json' | 'csv') => void
  onImport: (data: string) => void
  className?: string
}

/**
 * Annotation Management Panel
 * - List all annotations
 * - Filter and search functionality
 * - Create from templates
 * - Import/Export capabilities
 * - Annotation statistics
 */
export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  annotations,
  templates,
  filter,
  selectedAnnotationId,
  showAnnotations,
  onAnnotationSelect,
  onAnnotationDelete,
  onFilterChange,
  onClearFilter,
  onToggleVisibility,
  onCreateFromTemplate,
  onExport,
  onImport,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'templates' | 'settings'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<AnnotationType[]>([])
  const [importData, setImportData] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)

  // Filter annotations based on search and type
  const filteredAnnotations = annotations.filter(annotation => {
    if (
      searchQuery &&
      !annotation.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !annotation.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    if (typeFilter.length > 0 && !typeFilter.includes(annotation.type)) {
      return false
    }

    return true
  })

  // Group annotations by type
  const annotationsByType = annotations.reduce(
    (acc, annotation) => {
      if (!acc[annotation.type]) {
        acc[annotation.type] = []
      }
      acc[annotation.type].push(annotation)
      return acc
    },
    {} as Record<AnnotationType, ChartAnnotation[]>
  )

  const handleTypeFilterToggle = (type: AnnotationType) => {
    const newFilter = typeFilter.includes(type)
      ? typeFilter.filter(t => t !== type)
      : [...typeFilter, type]

    setTypeFilter(newFilter)
    onFilterChange({ ...filter, types: newFilter })
  }

  const handleImport = () => {
    if (importData.trim()) {
      onImport(importData.trim())
      setImportData('')
      setShowImportModal(false)
    }
  }

  const getTypeIcon = (type: AnnotationType) => {
    switch (type) {
      case 'note':
        return '📝'
      case 'alert':
        return '⚠️'
      case 'highlight':
        return '🔍'
      case 'callout':
        return '💬'
      default:
        return '📌'
    }
  }

  const getTypeColor = (type: AnnotationType) => {
    return ANNOTATION_PRESETS[type]?.borderColor || '#6b7280'
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}
    >
      {/* Header */}
      <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Annotations</h3>
          <div className='flex items-center space-x-2'>
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              {filteredAnnotations.length} of {annotations.length}
            </span>
            <Button
              variant={showAnnotations ? 'primary' : 'ghost'}
              size='sm'
              onClick={onToggleVisibility}
              title={showAnnotations ? 'Hide annotations' : 'Show annotations'}
            >
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                {showAnnotations ? (
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                  />
                ) : (
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21'
                  />
                )}
              </svg>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg'>
          {[
            { id: 'list' as const, label: 'List', icon: '📋' },
            { id: 'templates' as const, label: 'Templates', icon: '📄' },
            { id: 'settings' as const, label: 'Settings', icon: '⚙️' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className='p-4 max-h-96 overflow-y-auto'>
        {activeTab === 'list' && (
          <div className='space-y-4'>
            {/* Search and Filters */}
            <div className='space-y-3'>
              <input
                type='text'
                placeholder='Search annotations...'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700'
              />

              {/* Type Filters */}
              <div className='flex flex-wrap gap-2'>
                {(['note', 'alert', 'highlight', 'callout'] as AnnotationType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => handleTypeFilterToggle(type)}
                    className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      typeFilter.includes(type)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{getTypeIcon(type)}</span>
                    <span className='capitalize'>{type}</span>
                    <span className='ml-1 bg-black bg-opacity-20 rounded-full px-1'>
                      {annotationsByType[type]?.length || 0}
                    </span>
                  </button>
                ))}
              </div>

              {(searchQuery || typeFilter.length > 0) && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setTypeFilter([])
                    onClearFilter()
                  }}
                  className='text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Annotations List */}
            <div className='space-y-2'>
              {filteredAnnotations.length === 0 ? (
                <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
                  {annotations.length === 0 ? (
                    <div className='space-y-2'>
                      <svg
                        className='w-12 h-12 mx-auto opacity-50'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                        />
                      </svg>
                      <p className='text-sm'>No annotations yet</p>
                      <p className='text-xs'>Click on the chart to add your first annotation</p>
                    </div>
                  ) : (
                    <p className='text-sm'>No annotations match your filters</p>
                  )}
                </div>
              ) : (
                filteredAnnotations.map(annotation => (
                  <div
                    key={annotation.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      annotation.id === selectedAnnotationId
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => onAnnotationSelect(annotation.id)}
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center space-x-2 mb-1'>
                          <span className='text-sm'>{getTypeIcon(annotation.type)}</span>
                          <h4 className='text-sm font-medium text-gray-900 dark:text-white truncate'>
                            {annotation.title}
                          </h4>
                          <div
                            className='w-2 h-2 rounded-full'
                            style={{ backgroundColor: getTypeColor(annotation.type) }}
                          />
                        </div>
                        <p className='text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2'>
                          {annotation.content}
                        </p>

                        {/* Tags */}
                        {annotation.tags.length > 0 && (
                          <div className='flex flex-wrap gap-1 mb-2'>
                            {annotation.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className='inline-block px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded'
                              >
                                #{tag}
                              </span>
                            ))}
                            {annotation.tags.length > 3 && (
                              <span className='inline-block px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded'>
                                +{annotation.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className='flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400'>
                          {annotation.price && <span>${annotation.price.toFixed(2)}</span>}
                          <span>{new Date(annotation.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <button
                        onClick={e => {
                          e.stopPropagation()
                          onAnnotationDelete(annotation.id)
                        }}
                        className='ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                        title='Delete annotation'
                      >
                        <svg
                          className='w-4 h-4'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className='space-y-3'>
            <div className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
              Click a template to create an annotation at the current chart position
            </div>

            {templates.map(template => (
              <div
                key={template.id}
                className='p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer transition-colors'
                onClick={() =>
                  onCreateFromTemplate(template.id, {
                    x: 50, // Center of chart
                    y: 50,
                    anchor: 'chart',
                  })
                }
              >
                <div className='flex items-start space-x-3'>
                  <span className='text-lg'>{getTypeIcon(template.type)}</span>
                  <div className='flex-1'>
                    <h4 className='text-sm font-medium text-gray-900 dark:text-white'>
                      {template.name}
                    </h4>
                    {template.description && (
                      <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                        {template.description}
                      </p>
                    )}
                    <div className='flex items-center space-x-2 mt-2'>
                      <span
                        className='px-2 py-1 text-xs rounded-full capitalize'
                        style={{
                          backgroundColor: `${getTypeColor(template.type)}20`,
                          color: getTypeColor(template.type),
                        }}
                      >
                        {template.type}
                      </span>
                      {template.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className='px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded'
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className='space-y-4'>
            {/* Statistics */}
            <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
              <h4 className='text-sm font-medium text-gray-900 dark:text-white mb-2'>Statistics</h4>
              <div className='grid grid-cols-2 gap-2 text-sm'>
                <div>
                  <span className='text-gray-600 dark:text-gray-400'>Total:</span>
                  <span className='ml-1 font-medium text-gray-900 dark:text-white'>
                    {annotations.length}
                  </span>
                </div>
                {Object.entries(annotationsByType).map(([type, items]) => (
                  <div key={type}>
                    <span className='text-gray-600 dark:text-gray-400 capitalize'>{type}:</span>
                    <span className='ml-1 font-medium text-gray-900 dark:text-white'>
                      {items.length}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Import/Export */}
            <div className='space-y-3'>
              <h4 className='text-sm font-medium text-gray-900 dark:text-white'>Import/Export</h4>

              <div className='flex space-x-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onExport('json')}
                  disabled={annotations.length === 0}
                  className='flex-1'
                >
                  Export JSON
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onExport('csv')}
                  disabled={annotations.length === 0}
                  className='flex-1'
                >
                  Export CSV
                </Button>
              </div>

              <Button
                variant='outline'
                size='sm'
                onClick={() => setShowImportModal(true)}
                className='w-full'
              >
                Import Annotations
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md w-full'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-3'>
              Import Annotations
            </h3>

            <textarea
              value={importData}
              onChange={e => setImportData(e.target.value)}
              placeholder='Paste JSON data here...'
              rows={6}
              className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 resize-none'
            />

            <div className='flex justify-end space-x-2 mt-4'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setShowImportModal(false)
                  setImportData('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant='primary'
                size='sm'
                onClick={handleImport}
                disabled={!importData.trim()}
              >
                Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnnotationPanel
