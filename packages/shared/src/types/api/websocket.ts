// WebSocket-specific API types
import type { NormalizedQuote } from './contracts'

export interface WebSocketConnection {
  id: string
  userId?: string
  subscriptions: Set<string>
  isAuthenticated: boolean
  lastPing: number
}

export interface WebSocketSubscription {
  channel: string
  symbols: string[]
  filters?: Record<string, any>
}

// WebSocket message types
export type WebSocketMessageType =
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'quote_update'
  | 'trade_update'
  | 'error'
  | 'auth'
  | 'auth_success'
  | 'auth_error'

export interface WsBaseMessage {
  type: WebSocketMessageType
  timestamp: number
  id?: string
}

export interface PingMessage extends WsBaseMessage {
  type: 'ping'
}

export interface PongMessage extends WsBaseMessage {
  type: 'pong'
}

export interface SubscribeMessage extends WsBaseMessage {
  type: 'subscribe'
  data: {
    channel: string
    symbols: string[]
  }
}

export interface UnsubscribeMessage extends WsBaseMessage {
  type: 'unsubscribe'
  data: {
    channel: string
    symbols: string[]
  }
}

export interface QuoteUpdateMessage extends WsBaseMessage {
  type: 'quote_update'
  data: NormalizedQuote
}

export interface TradeUpdateMessage extends WsBaseMessage {
  type: 'trade_update'
  data: {
    symbol: string
    price: number
    volume: number
    timestamp: number
    side: 'buy' | 'sell'
  }
}

export interface ErrorMessage extends WsBaseMessage {
  type: 'error'
  data: {
    code: string
    message: string
    details?: any
  }
}

export interface AuthMessage extends WsBaseMessage {
  type: 'auth'
  data: {
    token: string
  }
}

export interface AuthSuccessMessage extends WsBaseMessage {
  type: 'auth_success'
  data: {
    userId: string
    subscriptions: string[]
  }
}

export interface AuthErrorMessage extends WsBaseMessage {
  type: 'auth_error'
  data: {
    message: string
  }
}

export type WebSocketMessage =
  | PingMessage
  | PongMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | QuoteUpdateMessage
  | TradeUpdateMessage
  | ErrorMessage
  | AuthMessage
  | AuthSuccessMessage
  | AuthErrorMessage
