import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './lib/database.js'
import { initializeRedis, disconnectRedis, checkRedisHealth } from './lib/redis.js'
import { setupRoutes } from './routes/index.js'
import { setupMiddleware } from './middleware/index.js'
import { setupRateLimiting } from './middleware/rateLimiting.js'
import { requestLogger, errorLogger } from './middleware/logging.js'
import { getWebSocketService } from './services/websocketService.js'
import { securityHeaders } from './middleware/auth.js'
import SecurityConfigValidator from './config/securityConfig.js'
import { config } from './config/environment.js'

// Load environment variables
dotenv.config()

export class ApplicationBootstrap {
  private app: express.Application
  private server: ReturnType<typeof createServer> | null = null
  private isShuttingDown = false
  private activeConnections = new Set<any>()
  private readonly PORT = process.env.PORT || 8000

  constructor() {
    this.app = express()
    this.validateConfiguration()
  }

  private validateConfiguration(): void {
    console.log('🔍 Validating security configuration...')
    SecurityConfigValidator.printStatus()
  }

  private setupCoreMiddleware(): void {
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

  private setupHealthCheck(): void {
    this.app.get('/health', async (_req, res) => {
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

  private setupErrorHandling(): void {
    // Request logging middleware
    this.app.use(requestLogger)

    // 404 handler
    this.app.use('*', (_req, res) => {
      return res.status(404).json({ error: 'Route not found' })
    })

    // Error handling middleware
    this.app.use(errorLogger)
    this.app.use(
      (error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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

  private trackConnections(): void {
    if (!this.server) return

    this.server.on('connection', connection => {
      this.activeConnections.add(connection)
      connection.on('close', () => {
        this.activeConnections.delete(connection)
      })
    })
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'))
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'))

    // Handle uncaught errors
    process.on('uncaughtException', error => {
      console.error('❌ Uncaught Exception:', error)
      this.gracefulShutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
      this.gracefulShutdown('unhandledRejection')
    })
  }

  public async initialize(): Promise<void> {
    try {
      // Setup application components
      this.setupCoreMiddleware()
      setupRateLimiting(this.app)
      this.setupHealthCheck()
      setupRoutes(this.app)
      this.setupErrorHandling()

      // Connect to database
      await connectDatabase()

      // Initialize Redis
      await initializeRedis()

      // Create HTTP server
      this.server = createServer(this.app)
      this.trackConnections()

      // Initialize WebSocket
      const wsService = getWebSocketService()
      wsService.initialize(this.server)

      // Setup signal handlers
      this.setupSignalHandlers()
    } catch (error) {
      console.error('Failed to initialize application:', error)
      throw error
    }
  }

  public async start(): Promise<void> {
    if (!this.server) {
      throw new Error('Application must be initialized before starting')
    }

    return new Promise((resolve, reject) => {
      this.server!.listen(this.PORT, (error?: Error) => {
        if (error) {
          reject(error)
          return
        }

        console.log(`🚀 Server running on http://localhost:${this.PORT}`)
        console.log(`📊 API available at http://localhost:${this.PORT}/api`)
        console.log(`🌐 WebSocket available at ws://localhost:${this.PORT}/ws`)
        console.log(`❤️  Health check at http://localhost:${this.PORT}/health`)
        console.log(`🗄️  Database connected and ready`)
        console.log(`🛡️  Graceful shutdown enabled (timeout: 30s)`)
        resolve()
      })
    })
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      console.log('⏳ Shutdown already in progress...')
      return
    }

    this.isShuttingDown = true
    console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`)

    // Set shutdown timeout (30 seconds)
    const shutdownTimeout = setTimeout(() => {
      console.error('⚠️  Graceful shutdown timeout exceeded, forcing exit')
      process.exit(1)
    }, 30000)

    try {
      // Step 1: Stop accepting new connections
      if (this.server) {
        console.log('📡 Closing HTTP server...')
        await new Promise<void>((resolve, reject) => {
          this.server!.close(err => {
            if (err) {
              reject(err)
            } else {
              console.log('✅ HTTP server closed')
              resolve()
            }
          })
        })

        // Force close any remaining connections after 5 seconds
        setTimeout(() => {
          this.activeConnections.forEach(connection => {
            console.log('⚠️  Force closing active connection')
            connection.destroy()
          })
        }, 5000)
      }

      // Step 2: Close WebSocket connections
      console.log('🌐 Closing WebSocket connections...')
      const wsService = getWebSocketService()
      wsService.close()
      console.log('✅ WebSocket connections closed')

      // Step 3: Wait for pending requests to complete (max 10 seconds)
      console.log('⏳ Waiting for pending requests...')
      await new Promise(resolve =>
        setTimeout(resolve, Math.min(10000, parseInt(process.env.SHUTDOWN_DELAY || '5000')))
      )

      // Step 4: Close database connections
      console.log('🗄️  Closing database connections...')
      await disconnectDatabase()
      console.log('✅ Database connections closed')

      // Step 5: Close Redis connections
      console.log('📡 Closing Redis connections...')
      await disconnectRedis()
      console.log('✅ Redis connections closed')

      // Clear the timeout
      clearTimeout(shutdownTimeout)

      console.log('👋 Graceful shutdown completed')
      process.exit(0)
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error)
      clearTimeout(shutdownTimeout)
      process.exit(1)
    }
  }

  public getApp(): express.Application {
    return this.app
  }
}
