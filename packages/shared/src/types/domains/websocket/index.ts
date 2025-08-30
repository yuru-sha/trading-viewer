// WebSocket and real-time communication types
export enum WebSocketEventType {
  QUOTE = 'quote',
  CANDLE = 'candle',
  ERROR = 'error',
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
}

export interface WebSocketMessage {
  type: WebSocketEventType
  symbol?: string
  data: any
  timestamp: number
}

export interface QuoteMessage extends WebSocketMessage {
  type: WebSocketEventType.QUOTE
  symbol: string
  data: {
    price: number
    change: number
    changePercent: number
    timestamp: number
  }
}

export interface CandleMessage extends WebSocketMessage {
  type: WebSocketEventType.CANDLE
  symbol: string
  data: {
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: number
  }
}

export interface SubscriptionMessage extends WebSocketMessage {
  type: WebSocketEventType.SUBSCRIBE | WebSocketEventType.UNSUBSCRIBE
  symbol: string
}

export interface ErrorMessage extends WebSocketMessage {
  type: WebSocketEventType.ERROR
  data: {
    code: string
    message: string
  }
}

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
  reconnectAttempts: number
  lastConnected?: number
}
