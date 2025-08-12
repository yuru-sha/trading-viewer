import { Server } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { getFinnhubService } from './finnhubService'

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'error' | 'quote' | 'candle' | 'batch'
  symbol?: string
  data?: any
  timestamp?: number
  messages?: WebSocketMessage[]
}

export interface SubscriptionData {
  symbol: string
  clientId: string
  ws: WebSocket
  lastUpdate?: number
}

interface ClientMetadata {
  clientId: string
  subscriptions: Set<string>
  messageQueue: WebSocketMessage[]
  lastActivity: number
}

export class OptimizedWebSocketService extends EventEmitter {
  private wss: WebSocketServer | null = null
  private subscriptions: Map<string, Set<SubscriptionData>> = new Map()
  private clients: Map<WebSocket, ClientMetadata> = new Map()
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()
  private finnhubService = getFinnhubService()

  // Performance optimization settings
  private batchInterval: NodeJS.Timeout | null = null
  private memoryMonitor: NodeJS.Timeout | null = null
  private readonly MAX_QUEUE_SIZE = 100
  private readonly BATCH_INTERVAL_MS = 50
  private readonly MAX_SUBSCRIPTIONS_PER_CLIENT = 20
  private readonly MEMORY_THRESHOLD_MB = 500
  private readonly UPDATE_THROTTLE_MS = 5000
  private readonly STALE_CLIENT_THRESHOLD_MS = 60000

  constructor() {
    super()
    this.setupSubscriptionManager()
  }

  public initialize(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024,
      },
    })

    // Start performance monitoring
    this.startBatchProcessing()
    this.startMemoryMonitoring()

    this.wss.on('connection', ws => {
      const clientId = this.generateClientId()
      const metadata: ClientMetadata = {
        clientId,
        subscriptions: new Set(),
        messageQueue: [],
        lastActivity: Date.now(),
      }

      this.clients.set(ws, metadata)

      console.log(`WebSocket client connected: ${clientId}`)

      ws.on('message', message => {
        try {
          const data = JSON.parse(message.toString()) as WebSocketMessage
          metadata.lastActivity = Date.now()
          this.handleMessage(ws, metadata, data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
          this.sendError(ws, metadata, 'Invalid message format')
        }
      })

      ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`)
        this.handleClientDisconnect(ws, metadata)
      })

      ws.on('error', error => {
        console.error(`WebSocket error for client ${clientId}:`, error)
        this.handleClientDisconnect(ws, metadata)
      })

      ws.on('pong', () => {
        metadata.lastActivity = Date.now()
      })

      // Send welcome message
      this.queueMessage(metadata, {
        type: 'ping',
        data: { status: 'connected', clientId },
        timestamp: Date.now(),
      })
    })

    // Heartbeat mechanism
    const heartbeatInterval = setInterval(() => {
      this.wss?.clients.forEach(ws => {
        const metadata = this.clients.get(ws)
        if (metadata) {
          const now = Date.now()
          if (now - metadata.lastActivity > this.STALE_CLIENT_THRESHOLD_MS) {
            ws.terminate()
          } else {
            ws.ping()
          }
        }
      })
    }, 30000)

    this.on('close', () => {
      clearInterval(heartbeatInterval)
    })

    console.log('Optimized WebSocket server initialized on /ws')
  }

  private handleMessage(ws: WebSocket, metadata: ClientMetadata, message: WebSocketMessage): void {
    switch (message.type) {
      case 'subscribe':
        if (message.symbol) {
          this.subscribeToSymbol(ws, metadata, message.symbol)
        } else {
          this.sendError(ws, metadata, 'Symbol is required for subscription')
        }
        break

      case 'unsubscribe':
        if (message.symbol) {
          this.unsubscribeFromSymbol(ws, metadata, message.symbol)
        } else {
          this.sendError(ws, metadata, 'Symbol is required for unsubscription')
        }
        break

      case 'ping':
        this.queueMessage(metadata, {
          type: 'ping',
          data: { status: 'pong' },
          timestamp: Date.now(),
        })
        break

      default:
        this.sendError(ws, metadata, `Unknown message type: ${message.type}`)
    }
  }

  private subscribeToSymbol(ws: WebSocket, metadata: ClientMetadata, symbol: string): void {
    // Check subscription limit
    if (metadata.subscriptions.size >= this.MAX_SUBSCRIPTIONS_PER_CLIENT) {
      this.sendError(
        ws,
        metadata,
        `Maximum subscriptions limit (${this.MAX_SUBSCRIPTIONS_PER_CLIENT}) reached`
      )
      return
    }

    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set())
    }

    const subscriptionData: SubscriptionData = {
      symbol,
      clientId: metadata.clientId,
      ws,
    }

    const symbolSubscriptions = this.subscriptions.get(symbol)!

    // Check if already subscribed
    for (const sub of symbolSubscriptions) {
      if (sub.clientId === metadata.clientId) {
        this.queueMessage(metadata, {
          type: 'subscribe',
          symbol,
          data: { status: 'already_subscribed' },
          timestamp: Date.now(),
        })
        return
      }
    }

    symbolSubscriptions.add(subscriptionData)
    metadata.subscriptions.add(symbol)

    // Start updating this symbol if it's the first subscription
    if (symbolSubscriptions.size === 1) {
      this.startSymbolUpdates(symbol)
    }

    console.log(`Client ${metadata.clientId} subscribed to ${symbol}`)

    // Send immediate quote (throttled)
    this.sendQuoteUpdate(symbol, [subscriptionData])

    // Confirm subscription
    this.queueMessage(metadata, {
      type: 'subscribe',
      symbol,
      data: { status: 'subscribed' },
      timestamp: Date.now(),
    })
  }

  private unsubscribeFromSymbol(ws: WebSocket, metadata: ClientMetadata, symbol: string): void {
    const symbolSubscriptions = this.subscriptions.get(symbol)
    if (!symbolSubscriptions) return

    // Find and remove the subscription
    for (const subscription of symbolSubscriptions) {
      if (subscription.clientId === metadata.clientId && subscription.ws === ws) {
        symbolSubscriptions.delete(subscription)
        metadata.subscriptions.delete(symbol)
        break
      }
    }

    // Stop updates if no more subscriptions
    if (symbolSubscriptions.size === 0) {
      this.stopSymbolUpdates(symbol)
      this.subscriptions.delete(symbol)
    }

    console.log(`Client ${metadata.clientId} unsubscribed from ${symbol}`)

    // Confirm unsubscription
    this.queueMessage(metadata, {
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
      const subscriptions = this.subscriptions.get(symbol)
      if (subscriptions && subscriptions.size > 0) {
        await this.sendQuoteUpdate(symbol, Array.from(subscriptions))
      }
    }, this.UPDATE_THROTTLE_MS)

    this.updateIntervals.set(symbol, interval)
    console.log(`Started throttled updates for ${symbol}`)
  }

  private stopSymbolUpdates(symbol: string): void {
    const interval = this.updateIntervals.get(symbol)
    if (interval) {
      clearInterval(interval)
      this.updateIntervals.delete(symbol)
      console.log(`Stopped updates for ${symbol}`)
    }
  }

  private async sendQuoteUpdate(symbol: string, subscriptions: SubscriptionData[]): Promise<void> {
    try {
      const quote = await this.finnhubService.getQuote(symbol)
      const message: WebSocketMessage = {
        type: 'quote',
        symbol,
        data: quote,
        timestamp: Date.now(),
      }

      const disconnectedClients: SubscriptionData[] = []

      for (const subscription of subscriptions) {
        if (subscription.ws.readyState === WebSocket.OPEN) {
          const metadata = this.clients.get(subscription.ws)
          if (metadata) {
            this.queueMessage(metadata, message)
            subscription.lastUpdate = Date.now()
          }
        } else {
          disconnectedClients.push(subscription)
        }
      }

      // Clean up disconnected clients
      disconnectedClients.forEach(client => {
        const symbolSubs = this.subscriptions.get(symbol)
        symbolSubs?.delete(client)
      })
    } catch (error) {
      console.error(`Failed to send quote update for ${symbol}:`, error)

      // Send error to subscribers
      for (const subscription of subscriptions) {
        if (subscription.ws.readyState === WebSocket.OPEN) {
          const metadata = this.clients.get(subscription.ws)
          if (metadata) {
            this.sendError(subscription.ws, metadata, `Failed to fetch quote for ${symbol}`)
          }
        }
      }
    }
  }

  private handleClientDisconnect(ws: WebSocket, metadata: ClientMetadata): void {
    // Remove from all subscriptions
    for (const symbol of metadata.subscriptions) {
      const symbolSubscriptions = this.subscriptions.get(symbol)
      if (symbolSubscriptions) {
        for (const sub of symbolSubscriptions) {
          if (sub.clientId === metadata.clientId) {
            symbolSubscriptions.delete(sub)
            break
          }
        }

        // Stop updates if no more subscriptions
        if (symbolSubscriptions.size === 0) {
          this.stopSymbolUpdates(symbol)
          this.subscriptions.delete(symbol)
        }
      }
    }

    // Clear client data
    metadata.subscriptions.clear()
    metadata.messageQueue.length = 0
    this.clients.delete(ws)
  }

  private queueMessage(metadata: ClientMetadata, message: WebSocketMessage): void {
    if (metadata.messageQueue.length < this.MAX_QUEUE_SIZE) {
      metadata.messageQueue.push(message)
    } else {
      console.warn(`Message queue full for client ${metadata.clientId}, dropping oldest message`)
      metadata.messageQueue.shift()
      metadata.messageQueue.push(message)
    }
  }

  private sendError(ws: WebSocket, metadata: ClientMetadata, error: string): void {
    this.queueMessage(metadata, {
      type: 'error',
      data: { error },
      timestamp: Date.now(),
    })
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startBatchProcessing(): void {
    this.batchInterval = setInterval(() => {
      for (const [ws, metadata] of this.clients.entries()) {
        if (metadata.messageQueue.length === 0) continue

        if (ws.readyState === WebSocket.OPEN) {
          try {
            // Send batch message
            const batchMessage: WebSocketMessage = {
              type: 'batch',
              messages: metadata.messageQueue.splice(0, metadata.messageQueue.length),
              timestamp: Date.now(),
            }
            ws.send(JSON.stringify(batchMessage))
          } catch (error) {
            console.error(`Failed to send batch to client ${metadata.clientId}:`, error)
          }
        } else {
          // Clear queue for disconnected clients
          metadata.messageQueue.length = 0
        }
      }
    }, this.BATCH_INTERVAL_MS)
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitor = setInterval(() => {
      const memUsage = process.memoryUsage()
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)

      if (heapUsedMB > this.MEMORY_THRESHOLD_MB) {
        console.warn(`High memory usage detected: ${heapUsedMB}MB`)
        this.cleanupOldData()
      }

      // Log stats
      const stats = this.getStats()
      if (stats.totalClients > 0) {
        console.log(
          `WebSocket Stats - Clients: ${stats.totalClients}, Subscriptions: ${stats.totalSubscriptions}, Memory: ${heapUsedMB}MB`
        )
      }
    }, 30000) // 30 seconds
  }

  private cleanupOldData(): void {
    const now = Date.now()

    // Clean up stale clients
    for (const [ws, metadata] of this.clients.entries()) {
      if (now - metadata.lastActivity > this.STALE_CLIENT_THRESHOLD_MS) {
        console.log(`Cleaning up stale client: ${metadata.clientId}`)
        ws.terminate()
        this.handleClientDisconnect(ws, metadata)
      }

      // Trim long message queues
      if (metadata.messageQueue.length > this.MAX_QUEUE_SIZE / 2) {
        metadata.messageQueue.splice(0, metadata.messageQueue.length - this.MAX_QUEUE_SIZE / 2)
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  }

  private setupSubscriptionManager(): void {
    // Clean up stale subscriptions periodically
    setInterval(() => {
      const now = Date.now()

      for (const [symbol, subscriptions] of this.subscriptions) {
        const staleSubscriptions: SubscriptionData[] = []

        for (const subscription of subscriptions) {
          if (subscription.ws.readyState !== WebSocket.OPEN) {
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
    averageQueueSize: number
    memoryUsageMB: number
  } {
    const subscriptionsBySymbol: Record<string, number> = {}
    let totalSubscriptions = 0
    let totalQueueSize = 0

    for (const [symbol, subscriptions] of this.subscriptions) {
      const count = subscriptions.size
      subscriptionsBySymbol[symbol] = count
      totalSubscriptions += count
    }

    for (const metadata of this.clients.values()) {
      totalQueueSize += metadata.messageQueue.length
    }

    const memUsage = process.memoryUsage()
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)

    return {
      totalClients: this.clients.size,
      totalSubscriptions,
      activeSymbols: Array.from(this.subscriptions.keys()),
      subscriptionsBySymbol,
      averageQueueSize: this.clients.size > 0 ? Math.round(totalQueueSize / this.clients.size) : 0,
      memoryUsageMB: heapUsedMB,
    }
  }

  public close(): void {
    // Clear all intervals
    if (this.batchInterval) {
      clearInterval(this.batchInterval)
      this.batchInterval = null
    }

    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor)
      this.memoryMonitor = null
    }

    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval)
    }
    this.updateIntervals.clear()

    // Close all connections
    if (this.wss) {
      this.wss.clients.forEach(ws => ws.terminate())
      this.wss.close()
    }

    this.subscriptions.clear()
    this.clients.clear()

    this.emit('close')
    console.log('Optimized WebSocket service closed')
  }
}

// Singleton instance
let optimizedWebsocketService: OptimizedWebSocketService | null = null

export const getOptimizedWebSocketService = (): OptimizedWebSocketService => {
  if (!optimizedWebsocketService) {
    optimizedWebsocketService = new OptimizedWebSocketService()
  }
  return optimizedWebsocketService
}
