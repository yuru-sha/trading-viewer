import { useReducer, useCallback, useRef } from 'react'
import {
  ChartAnnotation,
  AnnotationAction,
  AnnotationState,
  AnnotationFilter,
  AnnotationSearchQuery,
  AnnotationType,
  AnnotationGroup,
  AnnotationTemplate,
  ANNOTATION_PRESETS,
  validateAnnotation,
} from '@shared'

const initialState: AnnotationState = {
  annotations: [],
  groups: [],
  templates: [
    {
      id: 'default-note',
      name: 'Quick Note',
      description: 'Simple text note for quick observations',
      type: 'note',
      style: ANNOTATION_PRESETS.note,
      defaultContent: 'Add your note here...',
      tags: ['general'],
      isGlobal: true,
      createdAt: Date.now(),
    },
    {
      id: 'default-alert',
      name: 'Price Alert',
      description: 'Important price level or event marker',
      type: 'alert',
      style: ANNOTATION_PRESETS.alert,
      defaultContent: 'Important: ',
      tags: ['alert', 'price'],
      isGlobal: true,
      createdAt: Date.now(),
    },
    {
      id: 'default-highlight',
      name: 'Key Level',
      description: 'Highlight important support/resistance levels',
      type: 'highlight',
      style: ANNOTATION_PRESETS.highlight,
      defaultContent: 'Key level at $',
      tags: ['levels', 'analysis'],
      isGlobal: true,
      createdAt: Date.now(),
    },
  ],
  filter: null,
  searchQuery: null,
  selectedAnnotationId: null,
  isEditing: false,
  showAnnotations: true,
}

const annotationReducer = (state: AnnotationState, action: AnnotationAction): AnnotationState => {
  switch (action.type) {
    case 'ADD_ANNOTATION':
      return {
        ...state,
        annotations: [...state.annotations, action.payload],
        selectedAnnotationId: action.payload.id,
      }

    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map(annotation =>
          annotation.id === action.payload.id
            ? { ...annotation, ...action.payload.updates, updatedAt: Date.now() }
            : annotation
        ),
      }

    case 'DELETE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter(annotation => annotation.id !== action.payload),
        selectedAnnotationId:
          state.selectedAnnotationId === action.payload ? null : state.selectedAnnotationId,
      }

    case 'BULK_DELETE_ANNOTATIONS':
      return {
        ...state,
        annotations: state.annotations.filter(
          annotation => !action.payload.includes(annotation.id)
        ),
        selectedAnnotationId: action.payload.includes(state.selectedAnnotationId || '')
          ? null
          : state.selectedAnnotationId,
      }

    case 'MOVE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map(annotation =>
          annotation.id === action.payload.id
            ? { ...annotation, position: action.payload.position, updatedAt: Date.now() }
            : annotation
        ),
      }

    case 'SET_ANNOTATIONS':
      return {
        ...state,
        annotations: action.payload,
      }

    case 'FILTER_ANNOTATIONS':
      return {
        ...state,
        filter: action.payload,
      }

    case 'SEARCH_ANNOTATIONS':
      return {
        ...state,
        searchQuery: action.payload,
      }

    case 'GROUP_ANNOTATIONS':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.groupId
            ? {
                ...group,
                annotations: [...group.annotations, ...action.payload.annotationIds],
                updatedAt: Date.now(),
              }
            : group
        ),
      }

    case 'CREATE_GROUP':
      return {
        ...state,
        groups: [...state.groups, action.payload],
      }

    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter(group => group.id !== action.payload),
      }

    case 'TOGGLE_GROUP':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload
            ? { ...group, isCollapsed: !group.isCollapsed, updatedAt: Date.now() }
            : group
        ),
      }

    default:
      return state
  }
}

/**
 * Chart Annotations Management Hook
 * - Create, edit, delete annotations
 * - Filter and search functionality
 * - Group management
 * - Template system
 * - Import/Export capabilities
 */
export const useAnnotations = () => {
  const [state, dispatch] = useReducer(annotationReducer, initialState)
  const nextIdRef = useRef(1)

  const generateId = useCallback(() => {
    return `annotation_${Date.now()}_${nextIdRef.current++}`
  }, [])

  const addAnnotation = useCallback(
    (annotation: Omit<ChartAnnotation, 'id' | 'createdAt' | 'updatedAt'>) => {
      const validation = validateAnnotation(annotation)
      if (!validation.isValid) {
        throw new Error(`Invalid annotation: ${validation.errors.map(e => e.message).join(', ')}`)
      }

      const newAnnotation: ChartAnnotation = {
        ...annotation,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      dispatch({ type: 'ADD_ANNOTATION', payload: newAnnotation })
      return newAnnotation
    },
    [generateId]
  )

  const updateAnnotation = useCallback((id: string, updates: Partial<ChartAnnotation>) => {
    const validation = validateAnnotation(updates)
    if (!validation.isValid) {
      throw new Error(
        `Invalid annotation updates: ${validation.errors.map(e => e.message).join(', ')}`
      )
    }

    dispatch({ type: 'UPDATE_ANNOTATION', payload: { id, updates } })
  }, [])

  const deleteAnnotation = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ANNOTATION', payload: id })
  }, [])

  const bulkDeleteAnnotations = useCallback((ids: string[]) => {
    dispatch({ type: 'BULK_DELETE_ANNOTATIONS', payload: ids })
  }, [])

  const moveAnnotation = useCallback((id: string, position: ChartAnnotation['position']) => {
    dispatch({ type: 'MOVE_ANNOTATION', payload: { id, position } })
  }, [])

  const selectAnnotation = useCallback((id: string | null) => {
    dispatch({ type: 'UPDATE_ANNOTATION', payload: { id: 'selected', updates: { id } as any } })
  }, [])

  const setFilter = useCallback((filter: AnnotationFilter) => {
    dispatch({ type: 'FILTER_ANNOTATIONS', payload: filter })
  }, [])

  const clearFilter = useCallback(() => {
    dispatch({ type: 'FILTER_ANNOTATIONS', payload: {} })
  }, [])

  const searchAnnotations = useCallback((query: AnnotationSearchQuery) => {
    dispatch({ type: 'SEARCH_ANNOTATIONS', payload: query })
  }, [])

  const createGroup = useCallback(
    (name: string, description?: string, color = '#3b82f6') => {
      const group: AnnotationGroup = {
        id: generateId(),
        name,
        description,
        color,
        annotations: [],
        isCollapsed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      dispatch({ type: 'CREATE_GROUP', payload: group })
      return group
    },
    [generateId]
  )

  const deleteGroup = useCallback((id: string) => {
    dispatch({ type: 'DELETE_GROUP', payload: id })
  }, [])

  const toggleGroup = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_GROUP', payload: id })
  }, [])

  const groupAnnotations = useCallback((groupId: string, annotationIds: string[]) => {
    dispatch({ type: 'GROUP_ANNOTATIONS', payload: { groupId, annotationIds } })
  }, [])

  // Filter annotations based on current filter
  const filteredAnnotations = useCallback(
    (annotations: ChartAnnotation[]) => {
      if (!state.filter) return annotations

      return annotations.filter(annotation => {
        if (state.filter!.types && !state.filter!.types.includes(annotation.type)) {
          return false
        }

        if (state.filter!.tags && !state.filter!.tags.some(tag => annotation.tags.includes(tag))) {
          return false
        }

        if (state.filter!.dateRange) {
          const { start, end } = state.filter!.dateRange
          if (annotation.createdAt < start || annotation.createdAt > end) {
            return false
          }
        }

        if (state.filter!.priceRange && annotation.price) {
          const { min, max } = state.filter!.priceRange
          if (annotation.price < min || annotation.price > max) {
            return false
          }
        }

        if (state.filter!.userId && annotation.userId !== state.filter!.userId) {
          return false
        }

        if (
          state.filter!.isPrivate !== undefined &&
          annotation.isPrivate !== state.filter!.isPrivate
        ) {
          return false
        }

        return true
      })
    },
    [state.filter]
  )

  // Search annotations
  const searchResults = useCallback(
    (annotations: ChartAnnotation[]) => {
      if (!state.searchQuery?.query) return annotations

      const query = state.searchQuery.query.toLowerCase()
      return annotations.filter(
        annotation =>
          annotation.title.toLowerCase().includes(query) ||
          annotation.content.toLowerCase().includes(query) ||
          annotation.tags.some(tag => tag.toLowerCase().includes(query))
      )
    },
    [state.searchQuery]
  )

  // Get visible annotations (filtered and searched)
  const visibleAnnotations = useCallback(() => {
    let result = state.annotations

    if (state.filter) {
      result = filteredAnnotations(result)
    }

    if (state.searchQuery?.query) {
      result = searchResults(result)
    }

    // Sort results
    if (state.searchQuery?.sortBy) {
      const { sortBy, sortOrder = 'desc' } = state.searchQuery
      result.sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (sortBy) {
          case 'createdAt':
            aValue = a.createdAt
            bValue = b.createdAt
            break
          case 'updatedAt':
            aValue = a.updatedAt
            bValue = b.updatedAt
            break
          case 'price':
            aValue = a.price || 0
            bValue = b.price || 0
            break
          case 'timestamp':
            aValue = a.timestamp
            bValue = b.timestamp
            break
          default:
            return 0
        }

        if (sortOrder === 'asc') {
          return aValue - bValue
        } else {
          return bValue - aValue
        }
      })
    }

    return result
  }, [state.annotations, state.filter, state.searchQuery, filteredAnnotations, searchResults])

  // Create annotation from template
  const createFromTemplate = useCallback(
    (templateId: string, position: ChartAnnotation['position']) => {
      const template = state.templates.find(t => t.id === templateId)
      if (!template) {
        throw new Error(`Template not found: ${templateId}`)
      }

      const annotation = addAnnotation({
        type: template.type,
        title: template.name,
        content: template.defaultContent,
        timestamp: Date.now() / 1000,
        position,
        style: template.style,
        metadata: { version: 1 },
        isPrivate: false,
        tags: [...template.tags],
      })

      return annotation
    },
    [state.templates, addAnnotation]
  )

  // Export annotations
  const exportAnnotations = useCallback(
    (format: 'json' | 'csv' = 'json') => {
      const annotations = visibleAnnotations()

      if (format === 'json') {
        return JSON.stringify(
          {
            annotations,
            groups: state.groups,
            exportedAt: Date.now(),
            version: '1.0',
          },
          null,
          2
        )
      }

      if (format === 'csv') {
        const headers = [
          'ID',
          'Type',
          'Title',
          'Content',
          'Price',
          'Timestamp',
          'Tags',
          'Created At',
        ]
        const rows = annotations.map(annotation => [
          annotation.id,
          annotation.type,
          annotation.title,
          annotation.content,
          annotation.price || '',
          new Date(annotation.timestamp * 1000).toISOString(),
          annotation.tags.join(';'),
          new Date(annotation.createdAt).toISOString(),
        ])

        return [headers, ...rows]
          .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n')
      }

      throw new Error(`Unsupported export format: ${format}`)
    },
    [visibleAnnotations, state.groups]
  )

  // Import annotations
  const importAnnotations = useCallback(
    (data: string, format: 'json' = 'json') => {
      try {
        if (format === 'json') {
          const imported = JSON.parse(data)
          const annotations: ChartAnnotation[] = imported.annotations || []
          const groups: AnnotationGroup[] = imported.groups || []

          // Validate imported data
          annotations.forEach(annotation => {
            const validation = validateAnnotation(annotation)
            if (!validation.isValid) {
              throw new Error(
                `Invalid annotation in import: ${validation.errors.map(e => e.message).join(', ')}`
              )
            }
          })

          dispatch({ type: 'SET_ANNOTATIONS', payload: [...state.annotations, ...annotations] })

          groups.forEach(group => {
            dispatch({ type: 'CREATE_GROUP', payload: group })
          })

          return true
        }

        throw new Error(`Unsupported import format: ${format}`)
      } catch (error) {
        console.error('Failed to import annotations:', error)
        return false
      }
    },
    [state.annotations]
  )

  // Get annotation statistics
  const getStats = useCallback(() => {
    const visible = visibleAnnotations()
    const types = visible.reduce(
      (acc, annotation) => {
        acc[annotation.type] = (acc[annotation.type] || 0) + 1
        return acc
      },
      {} as Record<AnnotationType, number>
    )

    return {
      total: state.annotations.length,
      visible: visible.length,
      byType: types,
      groups: state.groups.length,
      templates: state.templates.length,
      selected: state.selectedAnnotationId ? 1 : 0,
    }
  }, [
    state.annotations,
    state.groups,
    state.templates,
    state.selectedAnnotationId,
    visibleAnnotations,
  ])

  return {
    // State
    annotations: visibleAnnotations(),
    allAnnotations: state.annotations,
    groups: state.groups,
    templates: state.templates,
    filter: state.filter,
    searchQuery: state.searchQuery,
    selectedAnnotationId: state.selectedAnnotationId,
    isEditing: state.isEditing,
    showAnnotations: state.showAnnotations,

    // Actions
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    bulkDeleteAnnotations,
    moveAnnotation,
    selectAnnotation,
    setFilter,
    clearFilter,
    searchAnnotations,
    createGroup,
    deleteGroup,
    toggleGroup,
    groupAnnotations,
    createFromTemplate,
    exportAnnotations,
    importAnnotations,

    // Computed
    stats: getStats(),
    hasAnnotations: state.annotations.length > 0,
    hasVisibleAnnotations: visibleAnnotations().length > 0,
    selectedAnnotation: state.annotations.find(a => a.id === state.selectedAnnotationId) || null,

    // Utilities
    getAnnotationById: (id: string) => state.annotations.find(a => a.id === id) || null,
    getAnnotationsByGroup: (groupId: string) => {
      const group = state.groups.find(g => g.id === groupId)
      return group ? state.annotations.filter(a => group.annotations.includes(a.id)) : []
    },
    getAnnotationsByTag: (tag: string) => state.annotations.filter(a => a.tags.includes(tag)),
    getAnnotationsByType: (type: AnnotationType) => state.annotations.filter(a => a.type === type),
  }
}

export default useAnnotations
