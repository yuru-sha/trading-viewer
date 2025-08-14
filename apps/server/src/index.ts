import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './lib/database.js'
import marketRoutes from './routes/market'
import authRoutes from './routes/auth'
import alertRoutes from './routes/alerts'
import watchlistRoutes from './routes/watchlist'
import { requestLogger, errorLogger } from './middleware/logging'
import { getWebSocketService } from './services/websocketService'
import { securityHeaders } from './middleware/auth'
import SecurityConfigValidator from './config/securityConfig'
import { config } from './config/environment'

// Load environment variables
dotenv.config()

// Validate security configuration
console.log('🔍 Validating security configuration...')
SecurityConfigValidator.printStatus()

const app: express.Application = express()
const PORT = process.env.PORT || 8000

// Rate limiting middleware - Financial application optimized
const isRateLimitingEnabled = process.env.ENABLE_RATE_LIMITING !== 'false' && process.env.NODE_ENV !== 'development'

// General API rate limiter (more permissive for trading data)
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Higher limit for trading apps
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
  },
  skip: () => !isRateLimitingEnabled,
  standardHeaders: true,
  legacyHeaders: false,
})

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_ATTEMPTS || '200'), // More reasonable limit for legitimate use
  message: {
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please try again later.',
    statusCode: 429,
  },
  skip: () => !isRateLimitingEnabled,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests - only count failed attempts would be ideal
  // but express-rate-limit doesn't support this directly
})

// Moderate rate limiter for market data endpoints
const marketDataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MARKET_DATA_MAX || '60'), // 60 requests per minute
  message: {
    code: 'MARKET_DATA_RATE_LIMIT_EXCEEDED',
    message: 'Too many market data requests. Please slow down.',
    statusCode: 429,
  },
  skip: () => !isRateLimitingEnabled,
  standardHeaders: true,
  legacyHeaders: false,
})

// Very strict rate limiter for sensitive operations
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX || '10'), // 10 requests per hour
  message: {
    code: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
    message: 'Too many sensitive operations. Please wait before trying again.',
    statusCode: 429,
  },
  skip: () => !isRateLimitingEnabled,
  standardHeaders: true,
  legacyHeaders: false,
})

// Middleware
app.use(helmet())
app.use(
  cors({
    origin: config.getCorsOrigin(),
    credentials: true,
  })
)
app.use(cookieParser())
app.use(compression())
app.use(generalLimiter) // Apply general rate limiting to all routes
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(securityHeaders)

// Request logging middleware
app.use(requestLogger)

// Health check endpoint
app.get('/health', async (_req, res) => {
  // Return unhealthy if shutting down
  if (isShuttingDown) {
    return res.status(503).json({
      status: 'shutting_down',
      database: 'disconnecting',
      timestamp: new Date().toISOString(),
    })
  }

  const dbHealthy = await checkDatabaseHealth()
  res.json({
    status: dbHealthy ? 'ok' : 'error',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

// API routes with specific rate limiting
// Use more lenient rate limiting for auth - let application-level rate limiting handle failures
app.use('/api/auth', authRoutes) // Auth routes handle their own rate limiting
app.use('/api/market', marketDataLimiter, marketRoutes) // Moderate rate limiting for market data
app.use('/api/alerts', sensitiveLimiter, alertRoutes) // Strict rate limiting for alerts
app.use('/api/watchlist', watchlistRoutes) // Use general rate limiting for watchlist

app.get('/api', (_req, res) => {
  res.json({
    name: 'TradingViewer API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        profile: 'PUT /api/auth/profile',
        changePassword: 'POST /api/auth/change-password',
        deleteAccount: 'DELETE /api/auth/account',
      },
      market: {
        search: 'GET /api/market/search?q={query}&limit={limit}',
        quote: 'GET /api/market/quote/{symbol}',
        candles:
          'GET /api/market/candles/{symbol}?resolution={resolution}&from={timestamp}&to={timestamp}',
        rateLimit: 'GET /api/market/rate-limit',
      },
      alerts: {
        list: 'GET /api/alerts',
        listBySymbol: 'GET /api/alerts/{symbol}',
        create: 'POST /api/alerts',
        update: 'PUT /api/alerts/{id}',
        delete: 'DELETE /api/alerts/{id}',
        trigger: 'POST /api/alerts/{id}/trigger',
      },
      websocket: {
        endpoint: 'ws://localhost:' + PORT + '/ws',
        stats: 'GET /api/ws/stats',
      },
      health: 'GET /health',
    },
  })
})

// WebSocket stats endpoint
app.get('/api/ws/stats', (_req, res) => {
  const wsService = getWebSocketService()
  res.json(wsService.getStats())
})

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handling middleware
app.use(errorLogger)
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Check if it's an API error
  if (error.code && error.statusCode) {
    return res.status(error.statusCode).json(error)
  }

  // Default error response
  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    statusCode: 500,
  })
})

// Global server instance for graceful shutdown
let server: ReturnType<typeof createServer> | null = null
let isShuttingDown = false
const activeConnections = new Set<any>()

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase()

    // Create HTTP server
    server = createServer(app)

    // Track active connections for graceful shutdown
    server.on('connection', connection => {
      activeConnections.add(connection)
      connection.on('close', () => {
        activeConnections.delete(connection)
      })
    })

    // Initialize WebSocket
    const wsService = getWebSocketService()
    wsService.initialize(server)

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
      console.log(`📊 API available at http://localhost:${PORT}/api`)
      console.log(`🌐 WebSocket available at ws://localhost:${PORT}/ws`)
      console.log(`❤️  Health check at http://localhost:${PORT}/health`)
      console.log(`🗄️  Database connected and ready`)
      console.log(`🛡️  Graceful shutdown enabled (timeout: 30s)`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log('⏳ Shutdown already in progress...')
    return
  }

  isShuttingDown = true
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`)

  // Set shutdown timeout (30 seconds)
  const shutdownTimeout = setTimeout(() => {
    console.error('⚠️  Graceful shutdown timeout exceeded, forcing exit')
    process.exit(1)
  }, 30000)

  try {
    // Step 1: Stop accepting new connections
    if (server) {
      console.log('📡 Closing HTTP server...')
      await new Promise<void>((resolve, reject) => {
        server!.close(err => {
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
        activeConnections.forEach(connection => {
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

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Handle uncaught errors
process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('unhandledRejection')
})

startServer()

export default app
