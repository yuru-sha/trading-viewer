import { Application } from 'express'
import authRoutes from './auth.js'
import marketRoutes from './market.js'
import alertRoutes from './alerts.js'
import watchlistRoutes from './watchlist.js'
import newsRoutes from './news.js'
import drawingRoutes from './drawings.js'
import indicatorRoutes from './indicators.js'
import { marketDataLimiter, sensitiveLimiter } from '../middleware/rateLimiting.js'
import { getWebSocketService } from '../services/websocketService.js'

export function setupRoutes(app: Application): void {
  // API routes with specific rate limiting
  // Use more lenient rate limiting for auth - let application-level rate limiting handle failures
  app.use('/api/auth', authRoutes) // Auth routes handle their own rate limiting
  app.use('/api/market', marketDataLimiter, marketRoutes) // Moderate rate limiting for market data
  app.use('/api/alerts', sensitiveLimiter, alertRoutes) // Strict rate limiting for alerts
  app.use('/api/watchlist', watchlistRoutes) // Use general rate limiting for watchlist
  app.use('/api/news', marketDataLimiter, newsRoutes) // Moderate rate limiting for news data
  app.use('/api/drawings', drawingRoutes) // Drawing tools with general rate limiting
  app.use('/api/indicators', indicatorRoutes) // Indicators with general rate limiting

  // API information endpoint
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
          endpoint: `ws://localhost:${process.env.PORT || 8000}/ws`,
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
}
