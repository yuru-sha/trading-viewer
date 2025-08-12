import { Router } from 'express'
import authRoutes from './auth'
import marketRoutes from './market'
import drawingRoutes from './drawings'
import { securityHeaders } from '../middleware/auth'

const router = Router()

// Apply security headers to all routes
router.use(securityHeaders)

// Mount route modules
router.use('/auth', authRoutes)
router.use('/market', marketRoutes)
router.use('/drawings', drawingRoutes)

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    service: 'TradingViewer API',
    version: '1.0.0',
  })
})

export default router
