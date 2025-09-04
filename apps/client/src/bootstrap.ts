// Application Bootstrap
// This file initializes the application and sets up dependencies

import { container } from '@/infrastructure/di'
import type { WebSocketPort } from '@/application/ports/WebSocketPort'

export async function bootstrap() {
  // Initialize WebSocket connection if needed
  const webSocketPort = container.resolve<WebSocketPort>('webSocketPort')

  // Connect to WebSocket server in development/production
  if (import.meta.env.VITE_WS_URL) {
    try {
      await webSocketPort.connect(import.meta.env.VITE_WS_URL)
      console.log('WebSocket connected successfully')
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
    }
  }

  // Additional initialization logic can go here
  console.log('Application bootstrap completed')
}

// Cleanup function for graceful shutdown
export async function shutdown() {
  const webSocketPort = container.resolve<WebSocketPort>('webSocketPort')
  await webSocketPort.disconnect()
  console.log('Application shutdown completed')
}
