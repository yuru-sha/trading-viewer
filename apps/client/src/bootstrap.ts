// Application Bootstrap
// This file initializes the application and sets up dependencies

import { container } from '@/infrastructure/di'
import type { WebSocketPort } from '@/application/ports/WebSocketPort'

// ===== Bootstrap Services =====

/**
 * Dependency injection container service
 */
class ContainerService {
  getWebSocketPort(): WebSocketPort {
    return container.resolve<WebSocketPort>('webSocketPort')
  }
}

/**
 * Connection management service
 */
class ConnectionService {
  private containerService: ContainerService

  constructor(containerService: ContainerService) {
    this.containerService = containerService
  }

  async connectWebSocket(): Promise<void> {
    const webSocketPort = this.containerService.getWebSocketPort()
    const wsUrl = import.meta.env.VITE_WS_URL

    if (!wsUrl) {
      // eslint-disable-next-line no-console
      console.warn('WebSocket URL not configured')
      return
    }

    try {
      await webSocketPort.connect(wsUrl)
      // eslint-disable-next-line no-console
      console.log('WebSocket connected successfully')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to connect WebSocket:', error)
      throw error
    }
  }

  async disconnectWebSocket(): Promise<void> {
    const webSocketPort = this.containerService.getWebSocketPort()
    await webSocketPort.disconnect()
    // eslint-disable-next-line no-console
    console.log('WebSocket disconnected')
  }
}

/**
 * Client application bootstrap service
 */
class ClientBootstrapService {
  private connectionService: ConnectionService

  constructor(connectionService: ConnectionService) {
    this.connectionService = connectionService
  }

  async initialize(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Starting client application bootstrap...')

    try {
      // Initialize WebSocket connection
      await this.connectionService.connectWebSocket()

      // Additional initialization logic can go here
      // eslint-disable-next-line no-console
      console.log('Application bootstrap completed')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Bootstrap failed:', error)
      throw error
    }
  }

  async shutdown(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Starting application shutdown...')

    try {
      await this.connectionService.disconnectWebSocket()
      // eslint-disable-next-line no-console
      console.log('Application shutdown completed')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Shutdown failed:', error)
      throw error
    }
  }
}

// ===== Bootstrap Functions =====

export async function bootstrap() {
  const containerService = new ContainerService()
  const connectionService = new ConnectionService(containerService)
  const bootstrapService = new ClientBootstrapService(connectionService)

  await bootstrapService.initialize()
}

// Cleanup function for graceful shutdown
export async function shutdown() {
  const containerService = new ContainerService()
  const connectionService = new ConnectionService(containerService)
  const bootstrapService = new ClientBootstrapService(connectionService)

  await bootstrapService.shutdown()
}
