import { useEffect, useRef, useState, useCallback } from 'react'
import { log } from '@/infrastructure/services/LoggerService'

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'error' | 'quote' | 'candle'
  symbol?: string
  data?: QuoteData | { error: string }
  timestamp?: number
}

export interface QuoteData {
  c: number // Current price
  d: number // Change
  dp: number // Percent change
  h: number // High price
  l: number // Low price
  o: number // Open price
  pc: number // Previous close price
  t: number // Timestamp
}

export interface WebSocketHookOptions {
  url?: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export interface WebSocketHookReturn {
  isConnected: boolean
  isConnecting: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  error: string | null
  lastQuote: QuoteData | null
  subscribe: (symbol: string) => void
  unsubscribe: (symbol: string) => void
  connect: () => void
  disconnect: () => void
  sendMessage: (message: WebSocketMessage) => void
}

export const useWebSocket = (options: WebSocketHookOptions = {}): WebSocketHookReturn => {
  // Build the WebSocket URL dynamically using relative path for Vite proxy
  const defaultUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      : 'ws://localhost:8000/ws'

  const DEFAULT_OPTIONS: Required<WebSocketHookOptions> = {
    url: defaultUrl,
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
  }

  const config = { ...DEFAULT_OPTIONS, ...options }
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastQuote, setLastQuote] = useState<QuoteData | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const subscriptionsRef = useRef<Set<string>>(new Set())
  const shouldConnectRef = useRef(config.autoConnect)
  const heartbeatRef = useRef<NodeJS.Timeout>()

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = undefined
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component cleanup')
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return // Already connecting
    }

    cleanup()
    setIsConnecting(true)
    setError(null)

    try {
      log.api.info('Attempting WebSocket connection', {
        operation: 'websocket_connect',
        url: config.url,
      })
      const ws = new WebSocket(config.url)
      wsRef.current = ws

      const connectTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          log.api.warn('WebSocket connection timeout', {
            operation: 'websocket_connect',
            timeout: 10000,
          })
          ws.close()
          setError('Connection timeout')
          setIsConnecting(false)
        }
      }, 10000) // 10 second timeout

      ws.onopen = () => {
        clearTimeout(connectTimeout)
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        reconnectAttemptsRef.current = 0
        log.api.info('WebSocket connected successfully', {
          operation: 'websocket_connect',
        })

        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 25000) // Every 25 seconds

        // Re-subscribe to previous subscriptions
        subscriptionsRef.current.forEach(symbol => {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              symbol,
              timestamp: Date.now(),
            })
          )
        })
      }

      ws.onmessage = event => {
        try {
          const message = JSON.parse(event.data)

          switch (message.type) {
            case 'quote':
              setLastQuote(message.data)
              break
            case 'error':
              log.api.error('WebSocket server error', new Error(message.data?.error), {
                operation: 'websocket_message',
                messageType: 'error',
              })
              setError(message.data?.error || 'Server error')
              break
            case 'ping':
              // Handle ping/pong
              if (message.data?.status === 'connected') {
                log.api.info('WebSocket connection confirmed via ping', {
                  operation: 'websocket_message',
                  messageType: 'ping',
                })
              }
              break
          }
        } catch (error: unknown) {
          log.api.error('Failed to parse WebSocket message', error as Error, {
            operation: 'websocket_message',
            action: 'parse_message',
          })
        }
      }

      ws.onclose = event => {
        clearTimeout(connectTimeout)
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current)
          heartbeatRef.current = undefined
        }

        setIsConnected(false)
        setIsConnecting(false)

        log.api.info('WebSocket disconnected', {
          operation: 'websocket_disconnect',
          code: event.code,
          reason: event.reason,
        })

        // Only attempt reconnection if it wasn't a clean close and we should be connected
        if (shouldConnectRef.current && event.code !== 1000) {
          const shouldReconnect = reconnectAttemptsRef.current < config.maxReconnectAttempts

          if (shouldReconnect) {
            reconnectAttemptsRef.current++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000)

            log.api.info('Attempting to reconnect WebSocket', {
              operation: 'websocket_reconnect',
              attempt: reconnectAttemptsRef.current,
              maxAttempts: config.maxReconnectAttempts,
              delay,
            })

            reconnectTimeoutRef.current = setTimeout(() => {
              if (shouldConnectRef.current) {
                connect()
              }
            }, delay)
          } else {
            setError('Max reconnection attempts exceeded')
          }
        }
      }

      ws.onerror = _event => {
        log.api.error('WebSocket error event', undefined, {
          operation: 'websocket_error',
          readyState: ws.readyState,
          url: config.url,
        })
        clearTimeout(connectTimeout)
        if (ws.readyState === WebSocket.CONNECTING) {
          setError(`Failed to connect to WebSocket server at ${config.url}`)
        } else {
          setError('WebSocket connection lost')
        }
        setIsConnecting(false)
      }
    } catch (error: unknown) {
      log.api.error('Failed to create WebSocket', error as Error, {
        operation: 'websocket_connect',
        url: config.url,
      })
      setError('Failed to create connection')
      setIsConnecting(false)
    }
  }, [config.url, config.maxReconnectAttempts, cleanup])

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false
    cleanup()
  }, [cleanup])

  const subscribe = useCallback((symbol: string) => {
    subscriptionsRef.current.add(symbol)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'subscribe',
          symbol,
          timestamp: Date.now(),
        })
      )
    }
  }, [])

  const unsubscribe = useCallback((symbol: string) => {
    subscriptionsRef.current.delete(symbol)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'unsubscribe',
          symbol,
          timestamp: Date.now(),
        })
      )
    }
  }, [])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      log.api.warn('Cannot send message: WebSocket not connected', {
        operation: 'websocket_send',
        readyState: wsRef.current?.readyState,
      })
    }
  }, [])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (config.autoConnect) {
      shouldConnectRef.current = true
      connect()
    }

    return cleanup
  }, [cleanup, config.autoConnect, connect]) // Include necessary dependencies

  const connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = isConnected
    ? 'connected'
    : isConnecting
      ? 'connecting'
      : error
        ? 'error'
        : 'disconnected'

  return {
    isConnected,
    isConnecting,
    connectionStatus,
    error,
    lastQuote,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage,
  }
}
