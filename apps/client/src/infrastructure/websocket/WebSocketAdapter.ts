import type { WebSocketPort } from '@/application/ports/WebSocketPort'

export class WebSocketAdapter implements WebSocketPort {
  private ws: WebSocket | null = null
  private subscriptions = new Map<string, Set<(data: unknown) => void>>()
  private connectionStateCallbacks = new Set<(connected: boolean) => void>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          this.notifyConnectionState(true)
          resolve()
        }

        this.ws.onclose = () => {
          this.notifyConnectionState(false)
          this.handleReconnect(url)
        }

        this.ws.onerror = error => {
          reject(new Error(`WebSocket connection failed: ${error}`))
        }

        this.ws.onmessage = event => {
          this.handleMessage(event.data)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.subscriptions.clear()
    this.connectionStateCallbacks.clear()
  }

  subscribe(channel: string, callback: (data: unknown) => void): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set())
    }

    this.subscriptions.get(channel)!.add(callback)

    // Send subscription message to server
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', channel })
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(channel)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.subscriptions.delete(channel)
          // Send unsubscription message to server
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.send({ type: 'unsubscribe', channel })
          }
        }
      }
    }
  }

  async send(message: unknown): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }

    this.ws.send(JSON.stringify(message))
  }

  onConnectionStateChange(callback: (connected: boolean) => void): () => void {
    this.connectionStateCallbacks.add(callback)

    // Return cleanup function
    return () => {
      this.connectionStateCallbacks.delete(callback)
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)

      if (message.channel && this.subscriptions.has(message.channel)) {
        const callbacks = this.subscriptions.get(message.channel)!
        callbacks.forEach(callback => {
          try {
            callback(message.data)
          } catch (error) {
            console.error('Error in WebSocket callback:', error)
          }
        })
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  private notifyConnectionState(connected: boolean): void {
    this.connectionStateCallbacks.forEach(callback => {
      try {
        callback(connected)
      } catch (error) {
        console.error('Error in connection state callback:', error)
      }
    })
  }

  private handleReconnect(url: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++

      setTimeout(() => {
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          this.connect(url).catch(error => {
            console.error('Reconnection failed:', error)
          })
        }
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }
}
