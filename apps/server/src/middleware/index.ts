import { Application } from 'express'
import { requestLogger } from './logging.js'

export function setupMiddleware(app: Application): void {
  // Request logging middleware
  app.use(requestLogger)

  // Additional middleware can be added here as needed
}
