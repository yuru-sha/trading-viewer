import { Server } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { getFinnhubService } from './finnhubService'

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'error' | 'quote' | 'candle'
  symbol?: string
  data?: any
  timestamp?: number
}

export interface SubscriptionData {
  symbol: string
  clientId: string
  ws: WebSocket
  lastUpdate?: number
}

export class WebSocketService extends EventEmitter {
  private wss: WebSocketServer | null = null
  private subscriptions: Map<string, Set<SubscriptionData>> = new Map()
  private clients: Map<WebSocket, string> = new Map()
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()
  private finnhubService = getFinnhubService()

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
    })

    this.wss.on('connection', (ws, req) => {
      // Check connection limits
      if (this.clients.size >= 100) {
        // Limit to 100 concurrent connections
        ws.close(1013, 'Server overloaded')
        return
      }

      const clientId = this.generateClientId()
      this.clients.set(ws, clientId)

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

  private handleMessage(ws: WebSocket, clientId: string, message: WebSocketMessage): void {
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

  private subscribeToSymbol(ws: WebSocket, clientId: string, symbol: string): void {
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set())
    }

    const subscriptionData: SubscriptionData = {
      symbol,
      clientId,
      ws,
    }

    const symbolSubscriptions = this.subscriptions.get(symbol)!
    symbolSubscriptions.add(subscriptionData)

    // Start updating this symbol if it's the first subscription
    if (symbolSubscriptions.size === 1) {
      this.startSymbolUpdates(symbol)
    }

    console.log(`Client ${clientId} subscribed to ${symbol}`)

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

  private unsubscribeFromSymbol(ws: WebSocket, clientId: string, symbol: string): void {
    const symbolSubscriptions = this.subscriptions.get(symbol)
    if (!symbolSubscriptions) return

    // Find and remove the subscription
    for (const subscription of symbolSubscriptions) {
      if (subscription.clientId === clientId && subscription.ws === ws) {
        symbolSubscriptions.delete(subscription)
        break
      }
    }

    // Stop updates if no more subscriptions
    if (symbolSubscriptions.size === 0) {
      this.stopSymbolUpdates(symbol)
      this.subscriptions.delete(symbol)
    }

    console.log(`Client ${clientId} unsubscribed from ${symbol}`)

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
      
      let quote: any
      
      if (USE_MOCK_DATA || MOCK_REAL_TIME_UPDATES) {
        // Use consistent mock data for development
        console.log(`🔄 WebSocket mock update for ${symbol}`)
        const basePrice =
          symbol === 'AAPL' ? 150 : symbol === 'GOOGL' ? 2500 : symbol === 'TSLA' ? 200 : 100
        const change = (Math.random() - 0.5) * 5
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
        // Use real Finnhub API for production
        console.log(`🔄 WebSocket real-time update for ${symbol}`)
        quote = await this.finnhubService.getQuote({ symbol })
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
}

// Singleton pattern implementation
let websocketServiceInstance: WebSocketService | null = null

export const getWebSocketService = (): WebSocketService => {
  if (!websocketServiceInstance) {
    websocketServiceInstance = new WebSocketService()
  }
  return websocketServiceInstance
}
