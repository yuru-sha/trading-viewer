import { useEffect, useRef, useCallback, useState } from 'react'
import { WebSocketMessage } from '@shared/types/websocket'

interface ThrottledWebSocketOptions {
  url: string
  throttleMs?: number
  maxRetries?: number
  retryDelay?: number
  onMessage?: (message: WebSocketMessage) => void
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

interface ThrottledWebSocketReturn {
  isConnected: boolean
  send: (message: WebSocketMessage) => void
  subscribe: (symbol: string) => void
  unsubscribe: (symbol: string) => void
  reconnect: () => void
  getStats: () => WebSocketStats
}

interface WebSocketStats {
  messagesReceived: number
  messagesSent: number
  messagesThrottled: number
  reconnectAttempts: number
  lastActivity: number
}

interface MessageBatch {
  type: 'batch'
  messages: WebSocketMessage[]
  timestamp: number
}

export const useThrottledWebSocket = ({
  url,
  throttleMs = 100,
  maxRetries = 5,
  retryDelay = 1000,
  onMessage,
  onError,
  onConnect,
  onDisconnect,
}: ThrottledWebSocketOptions): ThrottledWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const messageQueueRef = useRef<WebSocketMessage[]>([])
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageTimeRef = useRef<Map<string, number>>(new Map())

  // Statistics
  const statsRef = useRef<WebSocketStats>({
    messagesReceived: 0,
    messagesSent: 0,
    messagesThrottled: 0,
    reconnectAttempts: 0,
    lastActivity: Date.now(),
  })

  const processMessageQueue = useCallback(() => {
    if (messageQueueRef.current.length === 0) return

    const messages = messageQueueRef.current.splice(0, messageQueueRef.current.length)
    const now = Date.now()

    // Group messages by symbol for throttling
    const symbolMessages = new Map<string, WebSocketMessage>()
    const otherMessages: WebSocketMessage[] = []

    messages.forEach(msg => {
      if (msg.symbol && (msg.type === 'quote' || msg.type === 'candle')) {
        const lastTime = lastMessageTimeRef.current.get(msg.symbol) || 0
        if (now - lastTime >= throttleMs) {
          symbolMessages.set(msg.symbol, msg)
          lastMessageTimeRef.current.set(msg.symbol, now)
        } else {
          statsRef.current.messagesThrottled++
        }
      } else {
        otherMessages.push(msg)
      }
    })

    // Process non-throttled messages
    const allMessages = [...Array.from(symbolMessages.values()), ...otherMessages]
    allMessages.forEach(msg => {
      if (onMessage) {
        onMessage(msg)
        statsRef.current.messagesReceived++
      }
    })

    statsRef.current.lastActivity = now
  }, [throttleMs, onMessage])

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)

        // Handle batch messages
        if (data.type === 'batch' && Array.isArray(data.messages)) {
          const batch = data as MessageBatch
          batch.messages.forEach(msg => {
            messageQueueRef.current.push(msg)
          })
        } else {
          messageQueueRef.current.push(data as WebSocketMessage)
        }

        // Throttle message processing
        if (throttleTimeoutRef.current) {
          clearTimeout(throttleTimeoutRef.current)
        }

        throttleTimeoutRef.current = setTimeout(() => {
          processMessageQueue()
          throttleTimeoutRef.current = null
        }, 10) // Small delay to batch incoming messages
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
        if (onError) {
          onError(new Error('Invalid message format'))
        }
      }
    },
    [processMessageQueue, onError]
  )

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        statsRef.current.lastActivity = Date.now()

        if (onConnect) {
          onConnect()
        }
      }

      ws.onmessage = handleMessage

      ws.onerror = error => {
        console.error('WebSocket error:', error)
        if (onError) {
          onError(new Error('WebSocket connection error'))
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        wsRef.current = null

        if (onDisconnect) {
          onDisconnect()
        }

        // Auto-reconnect logic
        if (reconnectAttemptsRef.current < maxRetries) {
          const delay = retryDelay * Math.pow(2, reconnectAttemptsRef.current) // Exponential backoff
          reconnectAttemptsRef.current++
          statsRef.current.reconnectAttempts++

          console.log(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxRetries})`
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          console.error('Max reconnection attempts reached')
          if (onError) {
            onError(new Error('Failed to reconnect after maximum attempts'))
          }
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      if (onError) {
        onError(error as Error)
      }
    }
  }, [url, maxRetries, retryDelay, handleMessage, onConnect, onDisconnect, onError])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current)
      throttleTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    messageQueueRef.current = []
    lastMessageTimeRef.current.clear()
  }, [])

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      statsRef.current.messagesSent++
      statsRef.current.lastActivity = Date.now()
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  const subscribe = useCallback(
    (symbol: string) => {
      send({
        type: 'subscribe',
        symbol,
        timestamp: Date.now(),
      })
    },
    [send]
  )

  const unsubscribe = useCallback(
    (symbol: string) => {
      send({
        type: 'unsubscribe',
        symbol,
        timestamp: Date.now(),
      })
      // Clear throttle history for this symbol
      lastMessageTimeRef.current.delete(symbol)
    },
    [send]
  )

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    disconnect()
    connect()
  }, [connect, disconnect])

  const getStats = useCallback((): WebSocketStats => {
    return { ...statsRef.current }
  }, [])

  // Initialize connection
  useEffect(() => {
    connect()

    // Heartbeat mechanism
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        send({
          type: 'ping',
          timestamp: Date.now(),
        })
      }
    }, 30000) // 30 seconds

    return () => {
      clearInterval(heartbeatInterval)
      disconnect()
    }
  }, [connect, disconnect, send])

  return {
    isConnected,
    send,
    subscribe,
    unsubscribe,
    reconnect,
    getStats,
  }
}
