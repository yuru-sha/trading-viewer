import { Server } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { IncomingMessage } from 'http'
import { URL } from 'url'
import jwt from 'jsonwebtoken'
import { getYahooFinanceService } from './yahooFinanceService'

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'error' | 'quote' | 'candle'
  symbol?: string
  data?: any
  timestamp?: number
}

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string
  isAuthenticated?: boolean
  authTimestamp?: number
  subscriptionCount?: number
  isAlive?: boolean
}

export interface SubscriptionData {
  symbol: string
  clientId: string
  ws: AuthenticatedWebSocket
  userId?: string
  lastUpdate?: number
}

export class WebSocketService extends EventEmitter {
  private wss: WebSocketServer | null = null
  private subscriptions: Map<string, Set<SubscriptionData>> = new Map()
  private clients: Map<AuthenticatedWebSocket, string> = new Map()
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()
  private yahooFinanceService = getYahooFinanceService()
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'
  private readonly MAX_SUBSCRIPTIONS_PER_USER = 50

  constructor() {
    super()
    this.setupSubscriptionManager()
  }

  public initialize(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      maxPayload: 16 * 1024, // 16KB
      perMessageDeflate: false,
      clientTracking: true,
      verifyClient: (info: any) => this.verifyClient(info),
    })

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      // Check connection limits
      if (this.clients.size >= 100) {
        // Limit to 100 concurrent connections
        ws.close(1013, 'Server overloaded')
        return
      }

      const clientId = this.generateClientId()
      this.clients.set(ws, clientId)

      // Initialize WebSocket properties
      ws.subscriptionCount = 0
      ws.authTimestamp = Date.now()

      // Extract user info from verified token
      try {
        const token = this.extractTokenFromRequest(req)
        if (token) {
          const payload = jwt.verify(token, this.JWT_SECRET, {
            algorithms: ['HS256'],
          }) as any
          ws.userId = payload.userId
          ws.isAuthenticated = true
          console.log(`✅ Authenticated WebSocket connection for user: ${ws.userId}`)
        } else {
          ws.isAuthenticated = false
          console.log(`⚠️ Unauthenticated WebSocket connection`)
        }
      } catch (error) {
        console.error('WebSocket authentication error:', error)
        ws.isAuthenticated = false
      }

      console.log(`WebSocket client connected: ${clientId} (${this.clients.size} total)`)

      // Set up heartbeat
      ws.isAlive = true
      ws.on('pong', () => {
        ws.isAlive = true
      })

      ws.on('message', message => {
        try {
          const data = JSON.parse(message.toString()) as WebSocketMessage
          this.handleMessage(ws, clientId, data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          this.sendError(ws, 'Invalid message format')
        }
      })

      ws.on('close', (code, reason) => {
        console.log(`WebSocket client disconnected: ${clientId} (${code}: ${reason})`)
        this.handleClientDisconnect(ws, clientId)
      })

      ws.on('error', error => {
        console.error(`WebSocket error for client ${clientId}:`, error)
        this.handleClientDisconnect(ws, clientId)
      })

      // Send welcome message
      this.sendMessage(ws, {
        type: 'ping',
        data: { status: 'connected', clientId },
        timestamp: Date.now(),
      })
    })

    // Heartbeat to detect broken connections
    const heartbeatInterval = setInterval(() => {
      this.wss?.clients.forEach((ws: any) => {
        if (!ws.isAlive) {
          console.log('Terminating inactive WebSocket connection')
          return ws.terminate()
        }

        ws.isAlive = false
        ws.ping()
      })
    }, 30000) // Every 30 seconds

    this.wss.on('close', () => {
      clearInterval(heartbeatInterval)
    })

    console.log('WebSocket server initialized on /ws')
  }

  private handleMessage(
    ws: AuthenticatedWebSocket,
    clientId: string,
    message: WebSocketMessage
  ): void {
    switch (message.type) {
      case 'subscribe':
        if (message.symbol) {
          this.subscribeToSymbol(ws, clientId, message.symbol)
        } else {
          this.sendError(ws, 'Symbol is required for subscription')
        }
        break

      case 'unsubscribe':
        if (message.symbol) {
          this.unsubscribeFromSymbol(ws, clientId, message.symbol)
        } else {
          this.sendError(ws, 'Symbol is required for unsubscription')
        }
        break

      case 'ping':
        this.sendMessage(ws, {
          type: 'ping',
          data: { status: 'pong' },
          timestamp: Date.now(),
        })
        break

      default:
        this.sendError(ws, `Unknown message type: ${message.type}`)
    }
  }

  private subscribeToSymbol(ws: AuthenticatedWebSocket, clientId: string, symbol: string): void {
    if (!symbol || typeof symbol !== 'string') {
      this.sendError(ws, 'Invalid symbol provided')
      return
    }

    // Check authentication for subscriptions in production
    if (process.env.NODE_ENV === 'production' && !this.requireAuth(ws)) {
      return
    }

    // Check subscription limits
    if (!this.checkSubscriptionLimits(ws)) {
      return
    }

    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set())
    }

    const subscriptionData: SubscriptionData = {
      symbol,
      clientId,
      ws,
    }

    // Optional プロパティは値が存在する場合のみ設定
    if (ws.userId) {
      subscriptionData.userId = ws.userId
    }

    const symbolSubscriptions = this.subscriptions.get(symbol)!
    symbolSubscriptions.add(subscriptionData)

    // Start updating this symbol if it's the first subscription
    if (symbolSubscriptions.size === 1) {
      this.startSymbolUpdates(symbol)
    }

    // Increment user's subscription count
    ws.subscriptionCount = (ws.subscriptionCount || 0) + 1

    console.log(`Client ${clientId} (user: ${ws.userId || 'anonymous'}) subscribed to ${symbol}`)

    // Send immediate quote
    this.sendQuoteUpdate(symbol)

    // Confirm subscription
    this.sendMessage(ws, {
      type: 'subscribe',
      symbol,
      data: { status: 'subscribed' },
      timestamp: Date.now(),
    })
  }

  private unsubscribeFromSymbol(
    ws: AuthenticatedWebSocket,
    clientId: string,
    symbol: string
  ): void {
    const symbolSubscriptions = this.subscriptions.get(symbol)
    if (!symbolSubscriptions) return

    // Find and remove the subscription
    for (const subscription of symbolSubscriptions) {
      if (subscription.clientId === clientId && subscription.ws === ws) {
        symbolSubscriptions.delete(subscription)

        // Decrement subscription count
        if (ws.subscriptionCount && ws.subscriptionCount > 0) {
          ws.subscriptionCount--
        }

        break
      }
    }

    // Stop updates if no more subscriptions
    if (symbolSubscriptions.size === 0) {
      this.stopSymbolUpdates(symbol)
      this.subscriptions.delete(symbol)
    }

    console.log(
      `Client ${clientId} (user: ${ws.userId || 'anonymous'}) unsubscribed from ${symbol}`
    )

    // Confirm unsubscription
    this.sendMessage(ws, {
      type: 'unsubscribe',
      symbol,
      data: { status: 'unsubscribed' },
      timestamp: Date.now(),
    })
  }

  private startSymbolUpdates(symbol: string): void {
    if (this.updateIntervals.has(symbol)) {
      return // Already updating
    }

    const interval = setInterval(async () => {
      await this.sendQuoteUpdate(symbol)
    }, 5000) // Update every 5 seconds

    this.updateIntervals.set(symbol, interval)
    console.log(`Started real-time updates for ${symbol}`)
  }

  private stopSymbolUpdates(symbol: string): void {
    const interval = this.updateIntervals.get(symbol)
    if (interval) {
      clearInterval(interval)
      this.updateIntervals.delete(symbol)
      console.log(`Stopped real-time updates for ${symbol}`)
    }
  }

  private async sendQuoteUpdate(symbol: string): Promise<void> {
    try {
      const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true'
      const MOCK_REAL_TIME_UPDATES = process.env.MOCK_REAL_TIME_UPDATES === 'true'
      const USE_YAHOO_FINANCE = process.env.USE_YAHOO_FINANCE === 'true'

      let quote: any

      // Priority: Yahoo Finance > Mock Data
      if (USE_YAHOO_FINANCE && !USE_MOCK_DATA && !MOCK_REAL_TIME_UPDATES) {
        console.log(`🔄 WebSocket Yahoo Finance update for ${symbol}`)
        try {
          const yahooQuote = await this.yahooFinanceService.getQuote(symbol)
          quote = {
            c: yahooQuote.currentPrice,
            d: yahooQuote.change,
            dp: yahooQuote.changePercent,
            h: yahooQuote.high,
            l: yahooQuote.low,
            o: yahooQuote.open,
            pc: yahooQuote.previousClose,
            t: Math.floor(yahooQuote.timestamp / 1000),
          }
        } catch (error) {
          console.warn(
            `Failed to get Yahoo Finance quote for ${symbol}, falling back to mock:`,
            error
          )
          // Fallback to improved mock data if Yahoo Finance fails
          const basePrice =
            symbol === 'AAPL'
              ? 150
              : symbol === 'GOOGL'
                ? 2500
                : symbol === 'TSLA'
                  ? 200
                  : symbol === 'EC'
                    ? 8.7
                    : symbol === 'MSFT'
                      ? 400
                      : symbol === 'NVDA'
                        ? 130
                        : symbol === 'AMZN'
                          ? 180
                          : symbol === 'KO'
                            ? 60
                            : 100
          const volatility = basePrice < 20 ? 0.5 : basePrice < 100 ? 2 : 5
          const change = (Math.random() - 0.5) * volatility
          const currentPrice = basePrice + change
          quote = {
            c: Number(currentPrice.toFixed(2)),
            d: Number(change.toFixed(2)),
            dp: Number(((change / basePrice) * 100).toFixed(2)),
            h: Number((currentPrice + Math.random() * (volatility / 2)).toFixed(2)),
            l: Number((currentPrice - Math.random() * (volatility / 2)).toFixed(2)),
            o: Number(basePrice.toFixed(2)),
            pc: Number(basePrice.toFixed(2)),
            t: Math.floor(Date.now() / 1000),
          }
        }
      } else if (USE_MOCK_DATA || MOCK_REAL_TIME_UPDATES) {
        // Use consistent mock data for development
        console.log(`🔄 WebSocket mock update for ${symbol}`)
        const basePrice =
          symbol === 'AAPL'
            ? 150
            : symbol === 'GOOGL'
              ? 2500
              : symbol === 'TSLA'
                ? 200
                : symbol === 'EC'
                  ? 8.7
                  : symbol === 'MSFT'
                    ? 400
                    : symbol === 'NVDA'
                      ? 130
                      : symbol === 'AMZN'
                        ? 180
                        : symbol === 'KO'
                          ? 60
                          : 100
        // Adjust price volatility based on the base price
        const volatility = basePrice < 20 ? 0.5 : basePrice < 100 ? 2 : 5
        const change = (Math.random() - 0.5) * volatility
        const currentPrice = basePrice + change
        const previousClose = basePrice

        quote = {
          c: Number(currentPrice.toFixed(2)),
          d: Number(change.toFixed(2)),
          dp: Number(((change / previousClose) * 100).toFixed(2)),
          h: Number((currentPrice + Math.random() * 3).toFixed(2)),
          l: Number((currentPrice - Math.random() * 3).toFixed(2)),
          o: Number(previousClose.toFixed(2)),
          pc: Number(previousClose.toFixed(2)),
          t: Math.floor(Date.now() / 1000),
        }
      } else {
        // Use Yahoo Finance API
        const yahooQuote = await this.yahooFinanceService.getQuote(symbol)
        quote = {
          c: yahooQuote.currentPrice,
          d: yahooQuote.change,
          dp: yahooQuote.changePercent,
          h: yahooQuote.high,
          l: yahooQuote.low,
          o: yahooQuote.open,
          pc: yahooQuote.previousClose,
          t: Math.floor(yahooQuote.timestamp / 1000),
        }
      }
      const symbolSubscriptions = this.subscriptions.get(symbol)

      if (!symbolSubscriptions || symbolSubscriptions.size === 0) {
        return
      }

      const message: WebSocketMessage = {
        type: 'quote',
        symbol,
        data: quote,
        timestamp: Date.now(),
      }

      // Send to all subscribers of this symbol
      const disconnectedClients: SubscriptionData[] = []

      for (const subscription of symbolSubscriptions) {
        if (subscription.ws.readyState === WebSocket.OPEN) {
          this.sendMessage(subscription.ws, message)
          subscription.lastUpdate = Date.now()
        } else {
          disconnectedClients.push(subscription)
        }
      }

      // Clean up disconnected clients
      disconnectedClients.forEach(client => {
        symbolSubscriptions.delete(client)
      })
    } catch (error) {
      console.error(`Failed to send quote update for ${symbol}:`, error)

      // Send error to subscribers
      const symbolSubscriptions = this.subscriptions.get(symbol)
      if (symbolSubscriptions) {
        for (const subscription of symbolSubscriptions) {
          if (subscription.ws.readyState === WebSocket.OPEN) {
            this.sendError(subscription.ws, `Failed to fetch quote for ${symbol}`)
          }
        }
      }
    }
  }

  private handleClientDisconnect(ws: WebSocket, clientId: string): void {
    this.clients.delete(ws)

    // Remove from all subscriptions
    for (const [symbol, subscriptions] of this.subscriptions) {
      const toRemove: SubscriptionData[] = []

      for (const subscription of subscriptions) {
        if (subscription.clientId === clientId || subscription.ws === ws) {
          toRemove.push(subscription)
        }
      }

      toRemove.forEach(subscription => {
        subscriptions.delete(subscription)
      })

      // Stop updates if no more subscriptions
      if (subscriptions.size === 0) {
        this.stopSymbolUpdates(symbol)
        this.subscriptions.delete(symbol)
      }
    }
  }

  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: 'error',
      data: { error },
      timestamp: Date.now(),
    })
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private setupSubscriptionManager(): void {
    // Clean up stale subscriptions every 5 minutes
    setInterval(() => {
      const now = Date.now()
      const staleThreshold = 60000 // 1 minute

      for (const [symbol, subscriptions] of this.subscriptions) {
        const staleSubscriptions: SubscriptionData[] = []

        for (const subscription of subscriptions) {
          if (
            subscription.ws.readyState !== WebSocket.OPEN ||
            (subscription.lastUpdate && now - subscription.lastUpdate > staleThreshold)
          ) {
            staleSubscriptions.push(subscription)
          }
        }

        staleSubscriptions.forEach(subscription => {
          subscriptions.delete(subscription)
        })

        if (subscriptions.size === 0) {
          this.stopSymbolUpdates(symbol)
          this.subscriptions.delete(symbol)
        }
      }
    }, 300000) // 5 minutes
  }

  public getStats(): {
    totalClients: number
    totalSubscriptions: number
    activeSymbols: string[]
    subscriptionsBySymbol: Record<string, number>
  } {
    const subscriptionsBySymbol: Record<string, number> = {}
    let totalSubscriptions = 0

    for (const [symbol, subscriptions] of this.subscriptions) {
      const count = subscriptions.size
      subscriptionsBySymbol[symbol] = count
      totalSubscriptions += count
    }

    return {
      totalClients: this.clients.size,
      totalSubscriptions,
      activeSymbols: Array.from(this.subscriptions.keys()),
      subscriptionsBySymbol,
    }
  }

  public close(): void {
    // Clear all intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval)
    }
    this.updateIntervals.clear()

    // Close all connections
    if (this.wss) {
      this.wss.close()
    }

    this.subscriptions.clear()
    this.clients.clear()

    console.log('WebSocket service closed')
  }

  // Get service status for health checks
  getStatus() {
    return {
      isRunning: !!this.wss,
      connectionCount: this.clients.size,
      subscriptionCount: this.subscriptions.size,
      uptime: this.wss ? Date.now() - this.startTime : 0,
    }
  }

  private startTime = Date.now()

  /**
   * Verify client connection during WebSocket handshake
   */
  private verifyClient(info: { req: IncomingMessage; origin: string; secure: boolean }): boolean {
    try {
      // Check origin in production
      if (process.env.NODE_ENV === 'production') {
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || []
        if (allowedOrigins.length > 0 && !allowedOrigins.includes(info.origin)) {
          console.warn(`❌ WebSocket connection rejected - invalid origin: ${info.origin}`)
          return false
        }
      }

      // Basic rate limiting by IP
      const clientIP = info.req.socket.remoteAddress || 'unknown'
      if (this.isRateLimited(clientIP)) {
        console.warn(`❌ WebSocket connection rejected - rate limited IP: ${clientIP}`)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in WebSocket verifyClient:', error)
      return false
    }
  }

  /**
   * Extract JWT token from WebSocket connection request
   */
  private extractTokenFromRequest(req: IncomingMessage): string | null {
    try {
      // Try Authorization header first
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7)
      }

      // Try query parameter as fallback
      const url = new URL(req.url || '', `http://${req.headers.host}`)
      const token = url.searchParams.get('token')
      if (token) {
        return token
      }

      // Try cookies as last resort
      const cookies = this.parseCookies(req.headers.cookie || '')
      if (cookies.access_token) {
        return cookies.access_token
      }

      return null
    } catch (error) {
      console.error('Error extracting token from WebSocket request:', error)
      return null
    }
  }

  /**
   * Parse cookies from cookie header
   */
  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {}
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookies[name] = decodeURIComponent(value)
      }
    })
    return cookies
  }

  /**
   * Basic IP-based rate limiting for WebSocket connections
   */
  private connectionAttempts = new Map<string, { count: number; lastAttempt: number }>()

  private isRateLimited(ip: string): boolean {
    const now = Date.now()
    const attempts = this.connectionAttempts.get(ip) || { count: 0, lastAttempt: 0 }

    // Reset counter if more than 1 minute has passed
    if (now - attempts.lastAttempt > 60000) {
      attempts.count = 0
    }

    attempts.count++
    attempts.lastAttempt = now
    this.connectionAttempts.set(ip, attempts)

    // Allow max 10 connections per minute per IP
    return attempts.count > 10
  }

  /**
   * Check if WebSocket connection is authenticated
   */
  private requireAuth(ws: AuthenticatedWebSocket): boolean {
    if (!ws.isAuthenticated || !ws.userId) {
      this.sendError(ws, 'Authentication required for this operation')
      return false
    }
    return true
  }

  /**
   * Check if user has exceeded subscription limits
   */
  private checkSubscriptionLimits(ws: AuthenticatedWebSocket): boolean {
    if ((ws.subscriptionCount || 0) >= this.MAX_SUBSCRIPTIONS_PER_USER) {
      this.sendError(ws, `Maximum subscriptions limit reached (${this.MAX_SUBSCRIPTIONS_PER_USER})`)
      return false
    }
    return true
  }
}

// Singleton pattern implementation
let websocketServiceInstance: WebSocketService | null = null

export const getWebSocketService = (): WebSocketService => {
  if (!websocketServiceInstance) {
    websocketServiceInstance = new WebSocketService()
  }
  return websocketServiceInstance
}
