import { Router, type Router as ExpressRouter } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import { validateRequest } from '../middleware/errorHandling.js'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { getService } from '../infrastructure/di/container.js'
import { TYPES } from '../infrastructure/di/types.js'
import type { IYahooFinanceService } from '../infrastructure/di/interfaces.js'
import { PriceAlertRepository } from '../infrastructure/repositories'
import { log } from '../infrastructure/services/logger'

const router: ExpressRouter = Router()
const priceAlertRepository = new PriceAlertRepository(prisma)

const CreateAlertSchema = z
  .object({
    symbol: z.string().min(1),
    condition: z.enum(['above', 'below']),
    targetPrice: z.number().positive().optional(),
    percentageChange: z.number().optional(),
    enabled: z.boolean().optional(),
  })
  .refine(data => data.targetPrice !== undefined || data.percentageChange !== undefined, {
    message: 'Either targetPrice or percentageChange must be provided',
  })

const UpdateAlertSchema = z.object({
  enabled: z.boolean().optional(),
  targetPrice: z.number().positive().optional(),
  percentageChange: z.number().optional(),
})

const BulkDisableAlertsSchema = z.object({
  symbols: z.array(z.string().min(1)).min(1).max(50), // 最大 50 シンボルまで
})

// GET /api/alerts - Get user's alerts
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const alerts = await priceAlertRepository.findByUserId(userId, {
      orderBy: [{ createdAt: 'desc' }],
    })

    // Map database fields to UI expected format
    const mappedAlerts = alerts.map(alert => ({
      id: alert.id,
      symbol: alert.symbol,
      condition: alert.type, // Map type back to condition
      targetPrice: alert.price,
      percentageChange: alert.percentageChange,
      enabled: alert.enabled,
      currency: alert.currency || 'USD',
      exchange: alert.exchange,
      timezone: alert.timezone,
      triggeredAt: alert.triggeredAt?.toISOString(),
      createdAt: alert.createdAt.toISOString(),
    }))

    res.json(mappedAlerts)
  } catch (error) {
    log.business.error('Error fetching alerts', error, { userId: req.user?.userId })
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

// GET /api/alerts/:symbol - Get alerts for specific symbol
router.get('/:symbol', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    const { symbol } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const alerts = await priceAlertRepository.findByUserIdAndSymbol(userId, symbol.toUpperCase(), {
      orderBy: [{ createdAt: 'desc' }],
    })

    // Map database fields to UI expected format
    const mappedAlerts = alerts.map(alert => ({
      id: alert.id,
      symbol: alert.symbol,
      condition: alert.type,
      targetPrice: alert.price,
      percentageChange: alert.percentageChange,
      enabled: alert.enabled,
      currency: alert.currency || 'USD',
      exchange: alert.exchange,
      timezone: alert.timezone,
      triggeredAt: alert.triggeredAt?.toISOString(),
      createdAt: alert.createdAt.toISOString(),
    }))

    res.json(mappedAlerts)
  } catch (error) {
    log.business.error('Error fetching symbol alerts', error, {
      symbol: req.params?.symbol,
      userId: req.user?.userId,
    })
    res.status(500).json({ error: 'Failed to fetch symbol alerts' })
  }
})

// POST /api/alerts - Create new alert
router.post(
  '/',
  requireAuth,
  validateRequest({ body: CreateAlertSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { symbol, condition, targetPrice, percentageChange, enabled = true } = req.body

      // Fetch currency and exchange information from Yahoo Finance
      let currency = 'USD'
      let exchange = null
      let timezone = null

      try {
        const yahooService = getService<IYahooFinanceService>(TYPES.YahooFinanceService)
        const quote = await yahooService.getQuote(symbol.toUpperCase())
        currency = quote.currency || 'USD'
        exchange = quote.exchangeName
        timezone = quote.exchangeTimezoneName
      } catch (error) {
        log.business.warn(`Failed to fetch currency info for ${symbol}`, { symbol, error, userId })
        // Continue with default values
      }

      const alert = await priceAlertRepository.create({
        userId,
        symbol: symbol.toUpperCase(),
        type: condition, // Map condition to type for database compatibility
        price: targetPrice || 0, // Use targetPrice or default to 0 for percentage alerts
        percentageChange,
        enabled,
        currency,
        exchange,
        timezone,
      })

      res.status(201).json({ alert })
    } catch (error) {
      log.business.error('Error creating alert', error, {
        symbol: req.body?.symbol,
        userId: req.user?.userId,
      })
      res.status(500).json({ error: 'Failed to create alert' })
    }
  }
)

// PUT /api/alerts/:id - Update alert
router.put(
  '/:id',
  requireAuth,
  validateRequest({ body: UpdateAlertSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId
      const { id } = req.params

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      // Check if alert belongs to user
      const existingAlert = await priceAlertRepository.findById(id)
      if (!existingAlert || existingAlert.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found',
        })
      }

      const updatedAlert = await priceAlertRepository.update(id, {
        ...req.body,
        // Reset triggeredAt when re-enabling
        ...(req.body.enabled === true && { triggeredAt: null }),
      })

      res.json({ alert: updatedAlert })
    } catch (error) {
      log.business.error('Error updating alert', error, {
        alertId: req.params?.id,
        userId: req.user?.userId,
      })
      res.status(500).json({ error: 'Failed to update alert' })
    }
  }
)

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    // Check if alert belongs to user
    const existingAlert = await priceAlertRepository.findById(id)
    if (!existingAlert || existingAlert.userId !== userId) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    await priceAlertRepository.delete(id)

    res.status(204).send()
  } catch (error) {
    log.business.error('Error deleting alert', error, {
      alertId: req.params?.id,
      userId: req.user?.userId,
    })
    res.status(500).json({ error: 'Failed to delete alert' })
  }
})

// PUT /api/alerts/symbol/:symbol/disable - Disable all alerts for a symbol
router.put('/symbol/:symbol/disable', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    const { symbol } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    // First get the alert IDs to disable
    const alertsToDisable = await priceAlertRepository.findByUserIdAndSymbol(
      userId,
      symbol.toUpperCase(),
      {
        orderBy: [{ createdAt: 'desc' }],
      }
    )

    const enabledAlertIds = alertsToDisable.filter(alert => alert.enabled).map(alert => alert.id)

    const disabledCount =
      enabledAlertIds.length > 0
        ? await priceAlertRepository.bulkUpdateStatus(enabledAlertIds, false)
        : 0

    res.json({
      success: true,
      disabledCount: disabledCount,
      message: `Disabled ${disabledCount} alerts for ${symbol.toUpperCase()}`,
    })
  } catch (error) {
    log.business.error('Error disabling symbol alerts', error, {
      symbol: req.params?.symbol,
      userId: req.user?.userId,
    })
    res.status(500).json({ error: 'Failed to disable symbol alerts' })
  }
})

// GET /api/alerts/count/:symbol - Get alert count for a symbol
router.get('/count/:symbol', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    const { symbol } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const alertCount = await priceAlertRepository.count({
      userId,
      symbol: symbol.toUpperCase(),
    })

    const alerts = await priceAlertRepository.findMany(
      {
        userId,
        symbol: symbol.toUpperCase(),
      },
      {
        orderBy: [{ createdAt: 'desc' }],
      }
    )

    res.json({
      symbol: symbol.toUpperCase(),
      count: alertCount,
      alerts: alerts.map(alert => ({
        id: alert.id,
        condition: alert.type,
        targetPrice: alert.price,
        percentageChange: alert.percentageChange,
        enabled: alert.enabled,
        createdAt: alert.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    log.business.error('Error counting symbol alerts', error, {
      symbol: req.params?.symbol,
      userId: req.user?.userId,
    })
    res.status(500).json({ error: 'Failed to count symbol alerts' })
  }
})

// PUT /api/alerts/bulk/disable - Disable alerts for multiple symbols
router.put(
  '/bulk/disable',
  requireAuth,
  validateRequest({ body: BulkDisableAlertsSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { symbols } = req.body

      // バルク無効化: 複数シンボルのアラートを無効化
      const alertsToDisable = await priceAlertRepository.findMany({
        userId,
      })

      const enabledAlertIds = alertsToDisable
        .filter(alert => alert.enabled && symbols.map(s => s.toUpperCase()).includes(alert.symbol))
        .map(alert => alert.id)

      const disabledCount =
        enabledAlertIds.length > 0
          ? await priceAlertRepository.bulkUpdateStatus(enabledAlertIds, false)
          : 0

      res.json({
        success: true,
        disabledCount: disabledCount,
        message: `Disabled ${disabledCount} alerts for ${symbols.length} symbols`,
        symbols: symbols.map(s => s.toUpperCase()),
      })
    } catch (error) {
      log.business.error('Error bulk disabling alerts', error, {
        symbolCount: req.body?.symbols?.length,
        userId: req.user?.userId,
      })
      res.status(500).json({ error: 'Failed to disable alerts' })
    }
  }
)

// POST /api/alerts/:id/trigger - Mark alert as triggered (internal use)
router.post('/:id/trigger', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params

    const alert = await priceAlertRepository.update(id, { triggeredAt: new Date() })

    res.json({ alert })
  } catch (error) {
    log.business.error('Error triggering alert', error, {
      alertId: req.params?.id,
      userId: req.user?.userId,
    })
    res.status(500).json({ error: 'Failed to trigger alert' })
  }
})

export default router
