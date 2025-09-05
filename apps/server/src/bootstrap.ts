import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './lib/database.js'
import { initializeRedis, disconnectRedis, checkRedisHealth } from './lib/redis.js'
import { log } from './infrastructure/services/logger.js'
import { setupRoutes } from './routes/index.js'
import { setupRateLimiting } from './middleware/rateLimiting.js'
import { requestLogger, errorLogger } from './middleware/logging.js'
import { getWebSocketService } from './application/services/websocketService.js'
import { securityHeaders } from './middleware/auth.js'
import SecurityConfigValidator from './config/securityConfig.js'
import { config } from './config/environment.js'

// Load environment variables
dotenv.config()

export class ApplicationBootstrap {
  private app: express.Application
  private middlewareService: MiddlewareService
  private healthService: HealthService
  private connectionService: ConnectionService
  private serverService: ServerService

  constructor() {
    this.app = express()
    this.middlewareService = new MiddlewareService(this.app)
    this.healthService = new HealthService()
    this.connectionService = new ConnectionService()
    this.serverService = new ServerService()
    this.validateConfiguration()
  }

  private validateConfiguration(): void {
    log.security.info('Validating security configuration...')
    SecurityConfigValidator.printStatus()
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'))
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'))

    // Handle uncaught errors
    process.on('uncaughtException', error => {
      log.fatal('Uncaught Exception', error)
      this.gracefulShutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason, promise) => {
      log.fatal(
        'Unhandled Rejection',
        reason instanceof Error ? reason : new Error(String(reason)),
        { promise: String(promise) }
      )
      this.gracefulShutdown('unhandledRejection')
    })
  }

  public async initialize(): Promise<void> {
    try {
      // Setup middleware
      this.middlewareService.setupCore()
      this.middlewareService.setupRateLimiting()

      // Setup health check
      this.healthService.setupHealthEndpoint(this.app)

      // Setup routes
      setupRoutes(this.app)

      // Setup error handling and logging
      this.middlewareService.setupRequestLogging()
      this.middlewareService.setupErrorHandling()

      // Connect to database
      await connectDatabase()

      // Initialize Redis
      await initializeRedis(config.isDevelopment)

      // Create HTTP server
      const server = this.serverService.createServer(this.app)
      this.connectionService.setServer(server)

      // Initialize WebSocket
      const wsService = getWebSocketService()
      wsService.initialize(server)

      // Setup signal handlers
      this.setupSignalHandlers()
    } catch (error) {
      log.system.error('Failed to initialize application:', error)
      throw error
    }
  }

  public async start(): Promise<void> {
    await this.serverService.start()
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    this.healthService.setShuttingDown(true)
    await this.connectionService.gracefulShutdown(signal)
  }

  public getApp(): express.Application {
    return this.app
  }
}

// ===== Bootstrap Services =====

/**
 * Express middleware configuration service
 */
class MiddlewareService {
  private app: express.Application

  constructor(app: express.Application) {
    this.app = app
  }

  setupCore(): void {
    // Core security and parsing middleware
    this.app.use(helmet())
    this.app.use(
      cors({
        origin: config.getCorsOrigin(),
        credentials: true,
      })
    )
    this.app.use(cookieParser())
    this.app.use(compression())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))
    this.app.use(securityHeaders)
  }

  setupRateLimiting(): void {
    setupRateLimiting(this.app)
  }

  setupRequestLogging(): void {
    this.app.use(requestLogger)
  }

  setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (_req, res) => {
      return res.status(404).json({ error: 'Route not found' })
    })

    // Error handling middleware
    this.app.use(errorLogger)
    this.app.use(
      (
        error: Error & { code?: string; statusCode?: number },
        _req: express.Request,
        res: express.Response,
        __next: express.NextFunction
      ) => {
        // Check if it's an API error
        if (error.code && error.statusCode) {
          return res.status(error.statusCode).json(error)
        }

        // Default error response
        return res.status(500).json({
          code: 'INTERNAL_SERVER_ERROR',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
          statusCode: 500,
        })
      }
    )
  }
}

/**
 * Health check service
 */
class HealthService {
  private isShuttingDown = false

  setShuttingDown(shutting: boolean): void {
    this.isShuttingDown = shutting
  }

  setupHealthEndpoint(app: express.Application): void {
    app.get('/health', async (_req, res) => {
      // Return unhealthy if shutting down
      if (this.isShuttingDown) {
        return res.status(503).json({
          status: 'shutting_down',
          database: 'disconnecting',
          timestamp: new Date().toISOString(),
        })
      }

      const dbHealthy = await checkDatabaseHealth()
      const redisHealth = await checkRedisHealth()
      const overallHealthy = dbHealthy && redisHealth.healthy

      return res.json({
        status: overallHealthy ? 'ok' : 'error',
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealth.healthy ? 'connected' : 'disconnected',
        redisDetails: redisHealth.details,
        timestamp: new Date().toISOString(),
      })
    })
  }
}

/**
 * Connection management service
 */
class ConnectionService {
  private activeConnections = new Set<import('net').Socket>()
  private server: ReturnType<typeof createServer> | null = null

  setServer(server: ReturnType<typeof createServer>): void {
    this.server = server
    this.trackConnections()
  }

  private trackConnections(): void {
    if (!this.server) return

    this.server.on('connection', connection => {
      this.activeConnections.add(connection)
      connection.on('close', () => {
        this.activeConnections.delete(connection)
      })
    })
  }

  async gracefulShutdown(signal: string): Promise<void> {
    log.system.info(`\n🛑 Received ${signal}, starting graceful shutdown...`)

    // Set shutdown timeout (30 seconds)
    const shutdownTimeout = setTimeout(() => {
      log.system.error('⚠️ Graceful shutdown timeout exceeded, forcing exit')
      process.exit(1)
    }, 30000)

    try {
      // Step 1: Stop accepting new connections
      if (this.server) {
        log.system.info('📡 Closing HTTP server...')
        await new Promise<void>((resolve, reject) => {
          this.server!.close(err => {
            if (err) {
              reject(err)
            } else {
              log.system.info('✅ HTTP server closed')
              resolve()
            }
          })
        })

        // Force close any remaining connections after 5 seconds
        setTimeout(() => {
          this.activeConnections.forEach(connection => {
            log.system.warn('⚠️ Force closing active connection')
            connection.destroy()
          })
        }, 5000)
      }

      // Step 2: Close WebSocket connections
      log.websocket.info('🌐 Closing WebSocket connections...')
      const wsService = getWebSocketService()
      wsService.close()
      log.websocket.info('✅ WebSocket connections closed')

      // Step 3: Wait for pending requests to complete (max 10 seconds)
      log.system.info('⏳ Waiting for pending requests...')
      await new Promise(resolve =>
        setTimeout(resolve, Math.min(10000, parseInt(process.env.SHUTDOWN_DELAY || '5000')))
      )

      // Step 4: Close database connections
      log.database.info('🗄️ Closing database connections...')
      await disconnectDatabase()
      log.database.info('✅ Database connections closed')

      // Step 5: Close Redis connections
      log.system.info('📡 Closing Redis connections...')
      await disconnectRedis()
      log.system.info('✅ Redis connections closed')

      // Clear the timeout
      clearTimeout(shutdownTimeout)

      log.system.info('👋 Graceful shutdown completed')
      process.exit(0)
    } catch (error) {
      log.system.error('❌ Error during graceful shutdown:', error)
      clearTimeout(shutdownTimeout)
      process.exit(1)
    }
  }
}

/**
 * HTTP server management service
 */
class ServerService {
  private server: ReturnType<typeof createServer> | null = null
  private readonly PORT = process.env.PORT || 8000

  createServer(app: express.Application): ReturnType<typeof createServer> {
    this.server = createServer(app)
    return this.server
  }

  async start(): Promise<void> {
    if (!this.server) {
      throw new Error('Server must be created before starting')
    }

    return new Promise((resolve, reject) => {
      this.server!.listen(this.PORT, (error?: Error) => {
        if (error) {
          reject(error)
          return
        }

        log.system.info(`Server running on http://localhost:${this.PORT}`)
        log.system.info(`API available at http://localhost:${this.PORT}/api`)
        log.system.info(`WebSocket available at ws://localhost:${this.PORT}/ws`)
        log.system.info(`Health check at http://localhost:${this.PORT}/health`)
        log.database.info('Database connected and ready')
        log.system.info('Graceful shutdown enabled (timeout: 30s)')
        resolve()
      })
    })
  }

  getServer(): ReturnType<typeof createServer> | null {
    return this.server
  }
}
