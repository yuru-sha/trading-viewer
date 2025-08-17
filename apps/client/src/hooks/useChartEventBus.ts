import { useCallback, useRef, useEffect } from 'react'

// Event types for the chart event bus
export interface ChartEventMap {
  // Chart lifecycle events
  'chart:mounted': { chartId: string; instance: any }
  'chart:unmounted': { chartId: string }
  'chart:resize': { chartId: string; width: number; height: number }
  'chart:data-updated': { chartId: string; dataLength: number }

  // Drawing events
  'drawing:tool-selected': { toolType: string; toolId?: string }
  'drawing:tool-created': { toolId: string; toolType: string; data: any }
  'drawing:tool-updated': { toolId: string; changes: any }
  'drawing:tool-deleted': { toolId: string }
  'drawing:mode-changed': { enabled: boolean }

  // Interaction events
  'interaction:click': { price: number; time: number; event: MouseEvent }
  'interaction:hover': { price: number | null; time: number | null }
  'interaction:selection-changed': { selectedToolIds: string[] }

  // Performance events
  'performance:render-start': { timestamp: number }
  'performance:render-end': { timestamp: number; duration: number }
  'performance:lag-detected': { duration: number; threshold: number }

  // Error events
  'error:chart-error': { error: Error; context: string }
  'error:drawing-error': { error: Error; toolId?: string }

  // User events
  'user:shortcut-triggered': { shortcut: string; action: string }
  'user:context-menu': { x: number; y: number; target: any }
}

type EventListener<T = any> = (data: T) => void
type EventName = keyof ChartEventMap

export const useChartEventBus = () => {
  const listenersRef = useRef<Map<EventName, Set<EventListener>>>(new Map())
  const eventHistoryRef = useRef<Array<{ event: EventName; data: any; timestamp: number }>>([])
  const maxHistorySize = 100

  // Emit an event to all listeners
  const emit = useCallback(<K extends EventName>(eventName: K, data: ChartEventMap[K]) => {
    const listeners = listenersRef.current.get(eventName)

    if (listeners) {
      console.log(`📡 Event emitted: ${eventName}`, data)

      // Call all listeners for this event
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`📡 Error in event listener for ${eventName}:`, error)
        }
      })
    }

    // Add to event history
    eventHistoryRef.current.push({
      event: eventName,
      data,
      timestamp: Date.now(),
    })

    // Limit history size
    if (eventHistoryRef.current.length > maxHistorySize) {
      eventHistoryRef.current = eventHistoryRef.current.slice(-maxHistorySize)
    }
  }, [])

  // Subscribe to an event
  const on = useCallback(
    <K extends EventName>(eventName: K, listener: EventListener<ChartEventMap[K]>) => {
      if (!listenersRef.current.has(eventName)) {
        listenersRef.current.set(eventName, new Set())
      }

      const listeners = listenersRef.current.get(eventName)!
      listeners.add(listener)

      console.log(`📡 Listener added for: ${eventName}`)

      // Return unsubscribe function
      return () => {
        listeners.delete(listener)
        console.log(`📡 Listener removed for: ${eventName}`)

        // Clean up empty listener sets
        if (listeners.size === 0) {
          listenersRef.current.delete(eventName)
        }
      }
    },
    []
  )

  // Subscribe to an event only once
  const once = useCallback(
    <K extends EventName>(eventName: K, listener: EventListener<ChartEventMap[K]>) => {
      const unsubscribe = on(eventName, data => {
        unsubscribe()
        listener(data)
      })

      return unsubscribe
    },
    [on]
  )

  // Remove all listeners for an event
  const off = useCallback((eventName: EventName) => {
    listenersRef.current.delete(eventName)
    console.log(`📡 All listeners removed for: ${eventName}`)
  }, [])

  // Remove all listeners
  const clear = useCallback(() => {
    listenersRef.current.clear()
    console.log('📡 All event listeners cleared')
  }, [])

  // Get event history
  const getEventHistory = useCallback((eventName?: EventName, limit?: number) => {
    let history = eventHistoryRef.current

    if (eventName) {
      history = history.filter(item => item.event === eventName)
    }

    if (limit && limit > 0) {
      history = history.slice(-limit)
    }

    return history
  }, [])

  // Get listener count for an event
  const getListenerCount = useCallback((eventName: EventName) => {
    const listeners = listenersRef.current.get(eventName)
    return listeners ? listeners.size : 0
  }, [])

  // Get all registered event names
  const getRegisteredEvents = useCallback(() => {
    return Array.from(listenersRef.current.keys())
  }, [])

  // Performance monitoring
  const startPerformanceTimer = useCallback(
    (label: string) => {
      const startTime = performance.now()

      emit('performance:render-start', { timestamp: startTime })

      return () => {
        const endTime = performance.now()
        const duration = endTime - startTime

        emit('performance:render-end', {
          timestamp: endTime,
          duration,
        })

        // Detect lag (arbitrary threshold of 16ms for 60fps)
        const lagThreshold = 16
        if (duration > lagThreshold) {
          emit('performance:lag-detected', {
            duration,
            threshold: lagThreshold,
          })
        }

        console.log(`⏱️ Performance: ${label} took ${duration.toFixed(2)}ms`)
      }
    },
    [emit]
  )

  // Error handling helper
  const emitError = useCallback(
    (error: Error, context: string, toolId?: string) => {
      if (toolId) {
        emit('error:drawing-error', { error, toolId })
      } else {
        emit('error:chart-error', { error, context })
      }

      console.error(`📡 Error emitted: ${context}`, error)
    },
    [emit]
  )

  // Batch events for performance
  const batchEmit = useCallback(
    (events: Array<{ eventName: EventName; data: any }>) => {
      events.forEach(({ eventName, data }) => {
        emit(eventName as any, data)
      })
    },
    [emit]
  )

  // Debug helper
  const debug = useCallback(() => {
    const stats = {
      totalEvents: Array.from(listenersRef.current.keys()).length,
      totalListeners: Array.from(listenersRef.current.values()).reduce(
        (sum, listeners) => sum + listeners.size,
        0
      ),
      eventHistory: eventHistoryRef.current.length,
      registeredEvents: getRegisteredEvents(),
    }

    console.log('📡 Event Bus Debug Info:', stats)
    return stats
  }, [getRegisteredEvents])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clear()
      eventHistoryRef.current = []
    }
  }, [clear])

  return {
    // Core event methods
    emit,
    on,
    once,
    off,
    clear,

    // Utility methods
    getEventHistory,
    getListenerCount,
    getRegisteredEvents,

    // Performance helpers
    startPerformanceTimer,
    emitError,
    batchEmit,

    // Debug
    debug,
  }
}
