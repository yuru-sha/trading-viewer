import { Router } from 'express'
import { z } from 'zod'
import { UserIndicatorRepository } from '../repositories/UserIndicatorRepository.js'
import { IndicatorCalculationService } from '../services/IndicatorCalculationService.js'
import { prisma } from '../lib/database.js'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validation.js'

const router: import('express').Router = Router()

console.log('🔍 Initializing indicators router...')

let userIndicatorRepository: UserIndicatorRepository
let indicatorCalculationService: IndicatorCalculationService

try {
  console.log('🔍 Creating UserIndicatorRepository...')
  userIndicatorRepository = new UserIndicatorRepository(prisma)
  console.log('🔍 Creating IndicatorCalculationService...')
  indicatorCalculationService = new IndicatorCalculationService()
  console.log('✅ Indicators router dependencies initialized successfully')
} catch (error) {
  console.error('❌ Failed to initialize indicators router dependencies:', error)
  throw error
}

// Validation schemas
const createIndicatorSchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.string().optional().default('D'),
  type: z.enum(['sma', 'ema', 'rsi', 'macd', 'bollinger', 'stochastic', 'williams_r']),
  name: z.string().min(1),
  parameters: z.record(z.any()),
  visible: z.boolean().optional().default(true),
  style: z.record(z.any()).optional(),
  position: z.number().int().min(0).optional().default(0),
})

const updateIndicatorSchema = z.object({
  name: z.string().min(1).optional(),
  parameters: z.record(z.any()).optional(),
  visible: z.boolean().optional(),
  style: z.record(z.any()).optional(),
  position: z.number().int().min(0).optional(),
})

const updatePositionsSchema = z.object({
  positions: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
    })
  ),
})

const paramsSchema = z.object({
  id: z.string(),
})

const querySchema = z.object({
  symbol: z.string().optional(),
  timeframe: z.string().optional(),
})

const calculateIndicatorSchema = z.object({
  symbol: z.string().min(1),
  type: z.enum(['sma', 'ema', 'rsi', 'macd', 'bollinger', 'stochastic', 'williams_r']),
  parameters: z.record(z.any()),
})

// GET /api/indicators - Get all indicators for authenticated user
router.get(
  '/',
  (req: AuthenticatedRequest, res, next) => {
    console.log('🔍 Indicators route hit - before auth:', {
      url: req.url,
      method: req.method,
      headers: Object.keys(req.headers),
      cookies: Object.keys(req.cookies || {}),
      user: req.user ? 'exists' : 'missing',
    })
    next()
  },
  requireAuth,
  (req: AuthenticatedRequest, res, next) => {
    console.log('🔍 After auth middleware - before validation:', {
      userId: req.user?.userId,
      userExists: !!req.user,
    })
    next()
  },
  validateRequest(querySchema, 'query'),
  async (req: AuthenticatedRequest, res) => {
    try {
      console.log('🔍 Indicators API called:', {
        userId: req.user?.userId,
        symbol: req.query?.symbol,
        userExists: !!req.user,
        queryParams: req.query,
        headers: req.headers,
        cookies: req.cookies,
      })

      const userId = req.user!.userId
      const { symbol, timeframe } = req.query

      console.log('🔍 About to query repository:', { userId, symbol, timeframe })

      let indicators
      if (symbol && timeframe) {
        console.log('🔍 Querying by userId, symbol and timeframe...')
        indicators = await userIndicatorRepository.findByUserIdSymbolAndTimeframe(
          userId,
          symbol as string,
          timeframe as string
        )
      } else if (symbol) {
        console.log('🔍 Querying by userId and symbol...')
        indicators = await userIndicatorRepository.findByUserIdAndSymbol(userId, symbol as string)
      } else {
        console.log('🔍 Querying by userId only...')
        indicators = await userIndicatorRepository.findByUserId(userId)
      }

      console.log('🔍 Raw indicators from DB:', indicators)

      // Parse JSON fields
      const parsedIndicators = indicators.map(indicator =>
        userIndicatorRepository.parseIndicator(indicator)
      )

      res.json({
        success: true,
        data: parsedIndicators,
      })
    } catch (error) {
      console.error('❌ Error fetching indicators:', error)
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'Unknown error')
      console.error('❌ Error details:', {
        userId: req.user?.userId,
        symbol: req.query?.symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(500).json({
        success: false,
        error: 'Failed to fetch indicators',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
)

// GET /api/indicators/:id - Get specific indicator
router.get(
  '/:id',
  requireAuth,
  validateRequest(paramsSchema, 'params'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId
      const { id } = req.params

      const indicator = await userIndicatorRepository.findById(id)

      if (!indicator || indicator.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Indicator not found',
        })
      }

      const parsedIndicator = userIndicatorRepository.parseIndicator(indicator)

      res.json({
        success: true,
        data: parsedIndicator,
      })
    } catch (error) {
      console.error('Error fetching indicator:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to fetch indicator',
      })
    }
  }
)

// POST /api/indicators - Create new indicator
router.post(
  '/',
  requireAuth,
  validateRequest(createIndicatorSchema, 'body'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId
      const indicatorData = req.body

      // Check if indicator with same name already exists for this user/symbol/timeframe
      const existing = await userIndicatorRepository.findByUserIdSymbolTimeframeAndName(
        userId,
        indicatorData.symbol,
        indicatorData.timeframe || 'D',
        indicatorData.name
      )

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Indicator with this name already exists for this symbol and timeframe',
        })
      }

      const indicator = await userIndicatorRepository.create({
        userId,
        ...indicatorData,
      })

      const parsedIndicator = userIndicatorRepository.parseIndicator(indicator)

      res.status(201).json({
        success: true,
        data: parsedIndicator,
      })
    } catch (error) {
      console.error('Error creating indicator:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create indicator',
      })
    }
  }
)

// PUT /api/indicators/:id - Update indicator
router.put(
  '/:id',
  requireAuth,
  validateRequest(paramsSchema, 'params'),
  validateRequest(updateIndicatorSchema, 'body'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId
      const { id } = req.params
      const updateData = req.body

      // Check if indicator exists and belongs to user
      const existing = await userIndicatorRepository.findById(id)
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Indicator not found',
        })
      }

      // Check for name conflicts if name is being updated
      if (updateData.name && updateData.name !== existing.name) {
        const nameConflict = await userIndicatorRepository.findByUserIdSymbolTimeframeAndName(
          userId,
          existing.symbol,
          existing.timeframe,
          updateData.name
        )
        if (nameConflict) {
          return res.status(400).json({
            success: false,
            error: 'Indicator with this name already exists for this symbol and timeframe',
          })
        }
      }

      const indicator = await userIndicatorRepository.update(id, updateData)
      const parsedIndicator = userIndicatorRepository.parseIndicator(indicator)

      res.json({
        success: true,
        data: parsedIndicator,
      })
    } catch (error) {
      console.error('Error updating indicator:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update indicator',
      })
    }
  }
)

// DELETE /api/indicators/:id - Delete indicator
router.delete(
  '/:id',
  requireAuth,
  validateRequest(paramsSchema, 'params'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId
      const { id } = req.params

      // Check if indicator exists and belongs to user
      const existing = await userIndicatorRepository.findById(id)
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Indicator not found',
        })
      }

      await userIndicatorRepository.delete(id)

      res.json({
        success: true,
        message: 'Indicator deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting indicator:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete indicator',
      })
    }
  }
)

// PUT /api/indicators/positions - Update indicator positions
router.put(
  '/positions',
  requireAuth,
  validateRequest(
    z.object({ symbol: z.string(), timeframe: z.string().optional().default('D') }),
    'query'
  ),
  validateRequest(updatePositionsSchema, 'body'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId
      const { symbol, timeframe } = req.query
      const { positions } = req.body

      // Verify all indicators belong to user, symbol and timeframe
      const indicators = await userIndicatorRepository.findByUserIdSymbolAndTimeframe(
        userId,
        symbol as string,
        timeframe as string
      )
      const indicatorIds = indicators.map(i => i.id)

      const requestIds = positions.map(p => p.id)
      const invalidIds = requestIds.filter(id => !indicatorIds.includes(id))

      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Some indicators do not belong to this user, symbol or timeframe',
        })
      }

      await userIndicatorRepository.updatePositions(
        userId,
        symbol as string,
        timeframe as string,
        positions
      )

      res.json({
        success: true,
        message: 'Indicator positions updated successfully',
      })
    } catch (error) {
      console.error('Error updating indicator positions:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update indicator positions',
      })
    }
  }
)

// POST /api/indicators/calculate - Calculate indicator values for a symbol
router.post(
  '/calculate',
  requireAuth,
  validateRequest(calculateIndicatorSchema, 'body'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { symbol, type, parameters } = req.body

      // Fetch candle data for the symbol
      const candles = await prisma.candle.findMany({
        where: { symbol },
        orderBy: { timestamp: 'asc' },
        take: 1000, // Limit to last 1000 candles for performance
      })

      if (candles.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No candle data found for symbol',
        })
      }

      // Calculate indicator
      const result = indicatorCalculationService.calculateIndicator(
        type,
        candles,
        parameters,
        `${type}_${Date.now()}`
      )

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error('Error calculating indicator:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate indicator',
      })
    }
  }
)

export default router
