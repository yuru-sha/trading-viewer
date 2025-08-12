import { useEffect, useRef, useCallback, useState } from 'react'
import { WebSocketMessage } from '@shared/types/websocket'

interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'
  error?: Error
  retryCount: number
  lastConnected?: Date
  nextRetryAt?: Date
}

interface RobustWebSocketOptions {
  url: string
  maxRetries?: number
  retryDelay?: number
  maxRetryDelay?: number
  retryDelayMultiplier?: number
  heartbeatInterval?: number
  heartbeatTimeout?: number
  onMessage?: (message: WebSocketMessage) => void
  onConnectionStateChange?: (state: ConnectionState) => void
  onError?: (error: Error) => void
  autoReconnect?: boolean
  reconnectOnFocus?: boolean
  subscriptions?: string[]
}

interface RobustWebSocketReturn {
  connectionState: ConnectionState
  send: (message: WebSocketMessage) => boolean
  subscribe: (symbol: string) => void
  unsubscribe: (symbol: string) => void
  connect: () => void
  disconnect: () => void
  reconnect: () => void
}

export const useRobustWebSocket = ({
  url,
  maxRetries = 10,
  retryDelay = 1000,
  maxRetryDelay = 30000,
  retryDelayMultiplier = 1.5,
  heartbeatInterval = 30000,
  heartbeatTimeout = 5000,
  onMessage,
  onConnectionStateChange,
  onError,
  autoReconnect = true,
  reconnectOnFocus = true,
  subscriptions = [],
}: RobustWebSocketOptions): RobustWebSocketReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageQueueRef = useRef<WebSocketMessage[]>([])
  const subscriptionsRef = useRef<Set<string>>(new Set(subscriptions))
  const isManuallyDisconnectedRef = useRef(false)
  const lastHeartbeatRef = useRef<Date | null>(null)
  const connectionAttemptsRef = useRef(0)

  const updateConnectionState = useCallback(
    (newState: Partial<ConnectionState>) => {
      setConnectionState(prev => {
        const updated = { ...prev, ...newState }
        if (onConnectionStateChange) {
          onConnectionStateChange(updated)
        }
        return updated
      })
    },
    [onConnectionStateChange]
  )

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
  }, [])

  const startHeartbeat = useCallback(() => {
    clearTimeouts()

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const heartbeatMsg: WebSocketMessage = {
          type: 'ping',
          timestamp: Date.now(),
        }

        wsRef.current.send(JSON.stringify(heartbeatMsg))
        lastHeartbeatRef.current = new Date()

        // Set timeout for heartbeat response
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn('Heartbeat timeout - reconnecting')
          if (wsRef.current) {
            wsRef.current.close()
          }
        }, heartbeatTimeout)
      }
    }, heartbeatInterval)
  }, [heartbeatInterval, heartbeatTimeout, clearTimeouts])

  const resubscribeToSymbols = useCallback(() => {
    for (const symbol of subscriptionsRef.current) {
      const subscribeMsg: WebSocketMessage = {
        type: 'subscribe',
        symbol,
        timestamp: Date.now(),
      }
      messageQueueRef.current.push(subscribeMsg)
    }
  }, [])

  const flushMessageQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      const messages = messageQueueRef.current.splice(0)
      for (const message of messages) {
        try {
          wsRef.current.send(JSON.stringify(message))
        } catch (error) {
          console.error('Failed to send queued message:', error)
          // Re-queue message for retry
          messageQueueRef.current.unshift(message)
          break
        }
      }
    }
  }, [])

  const calculateRetryDelay = useCallback(
    (retryCount: number): number => {
      const baseDelay = retryDelay * Math.pow(retryDelayMultiplier, retryCount)
      const jitter = Math.random() * 0.3 * baseDelay // Add 30% jitter
      return Math.min(maxRetryDelay, baseDelay + jitter)
    },
    [retryDelay, retryDelayMultiplier, maxRetryDelay]
  )

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return
    }

    isManuallyDisconnectedRef.current = false
    connectionAttemptsRef.current++

    try {
      updateConnectionState({
        status: connectionState.retryCount > 0 ? 'reconnecting' : 'connecting',
        error: undefined,
      })

      const ws = new WebSocket(url)

      const connectTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close()
          console.error('Connection timeout')
        }
      }, 10000) // 10 second timeout

      ws.onopen = () => {
        clearTimeout(connectTimeout)
        console.log('WebSocket connected successfully')

        updateConnectionState({
          status: 'connected',
          retryCount: 0,
          lastConnected: new Date(),
          error: undefined,
          nextRetryAt: undefined,
        })

        connectionAttemptsRef.current = 0
        startHeartbeat()
        resubscribeToSymbols()
        flushMessageQueue()
      }

      ws.onmessage = event => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage

          // Handle heartbeat response
          if (message.type === 'ping') {
            if (heartbeatTimeoutRef.current) {
              clearTimeout(heartbeatTimeoutRef.current)
              heartbeatTimeoutRef.current = null
            }
          }

          // Handle batch messages
          if (message.type === 'batch' && Array.isArray((message as any).messages)) {
            for (const batchedMessage of (message as any).messages) {
              if (onMessage) {
                onMessage(batchedMessage)
              }
            }
          } else if (onMessage) {
            onMessage(message)
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          if (onError) {
            onError(new Error('Invalid message format'))
          }
        }
      }

      ws.onerror = event => {
        clearTimeout(connectTimeout)
        console.error('WebSocket error:', event)

        const error = new Error('WebSocket connection error')
        updateConnectionState({ error })

        if (onError) {
          onError(error)
        }
      }

      ws.onclose = event => {
        clearTimeout(connectTimeout)
        clearTimeouts()
        wsRef.current = null

        const wasConnected = connectionState.status === 'connected'

        console.log(`WebSocket closed: ${event.code} - ${event.reason}`)

        if (!isManuallyDisconnectedRef.current && autoReconnect) {
          if (connectionState.retryCount < maxRetries) {
            const delay = calculateRetryDelay(connectionState.retryCount)
            const nextRetryAt = new Date(Date.now() + delay)

            updateConnectionState({
              status: 'reconnecting',
              retryCount: connectionState.retryCount + 1,
              nextRetryAt,
            })

            console.log(
              `Reconnecting in ${Math.round(delay / 1000)}s (attempt ${connectionState.retryCount + 1}/${maxRetries})`
            )

            reconnectTimeoutRef.current = setTimeout(() => {
              connect()
            }, delay)
          } else {
            updateConnectionState({
              status: 'failed',
              error: new Error(`Failed to reconnect after ${maxRetries} attempts`),
            })

            if (onError) {
              onError(new Error('Max reconnection attempts exceeded'))
            }
          }
        } else {
          updateConnectionState({
            status: 'disconnected',
            retryCount: 0,
          })
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      updateConnectionState({
        status: 'failed',
        error: error as Error,
      })

      if (onError) {
        onError(error as Error)
      }
    }
  }, [
    url,
    connectionState.retryCount,
    maxRetries,
    autoReconnect,
    updateConnectionState,
    startHeartbeat,
    resubscribeToSymbols,
    flushMessageQueue,
    calculateRetryDelay,
    onMessage,
    onError,
  ])

  const disconnect = useCallback(() => {
    isManuallyDisconnectedRef.current = true
    clearTimeouts()

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    messageQueueRef.current = []
    updateConnectionState({
      status: 'disconnected',
      retryCount: 0,
      nextRetryAt: undefined,
    })
  }, [clearTimeouts, updateConnectionState])

  const reconnect = useCallback(() => {
    updateConnectionState({ retryCount: 0 })
    disconnect()
    setTimeout(connect, 100) // Small delay to ensure clean disconnect
  }, [connect, disconnect, updateConnectionState])

  const send = useCallback((message: WebSocketMessage): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
        return true
      } catch (error) {
        console.error('Failed to send message:', error)
        messageQueueRef.current.push(message)
        return false
      }
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(message)
      return false
    }
  }, [])

  const subscribe = useCallback(
    (symbol: string) => {
      subscriptionsRef.current.add(symbol)
      const message: WebSocketMessage = {
        type: 'subscribe',
        symbol,
        timestamp: Date.now(),
      }
      send(message)
    },
    [send]
  )

  const unsubscribe = useCallback(
    (symbol: string) => {
      subscriptionsRef.current.delete(symbol)
      const message: WebSocketMessage = {
        type: 'unsubscribe',
        symbol,
        timestamp: Date.now(),
      }
      send(message)
    },
    [send]
  )

  // Handle page visibility changes
  useEffect(() => {
    if (!reconnectOnFocus) return

    const handleVisibilityChange = () => {
      if (
        !document.hidden &&
        connectionState.status === 'disconnected' &&
        !isManuallyDisconnectedRef.current
      ) {
        console.log('Page became visible - reconnecting WebSocket')
        connect()
      }
    }

    const handleFocus = () => {
      if (connectionState.status === 'disconnected' && !isManuallyDisconnectedRef.current) {
        console.log('Window focused - reconnecting WebSocket')
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [connect, connectionState.status, reconnectOnFocus])

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      if (connectionState.status !== 'connected' && !isManuallyDisconnectedRef.current) {
        console.log('Network became available - reconnecting WebSocket')
        reconnect()
      }
    }

    const handleOffline = () => {
      console.log('Network became unavailable')
      updateConnectionState({
        status: 'disconnected',
        error: new Error('Network unavailable'),
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [connectionState.status, reconnect, updateConnectionState])

  // Initialize connection
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [])

  return {
    connectionState,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    reconnect,
  }
}
