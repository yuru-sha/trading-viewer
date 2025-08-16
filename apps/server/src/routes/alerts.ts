import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import { validateRequest } from '../middleware/errorHandling.js'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js'
import { getYahooFinanceService } from '../services/yahooFinanceService.js'

const router = Router()

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

// GET /api/alerts - Get user's alerts
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const alerts = await prisma.priceAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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
    console.error('Error fetching alerts:', error)
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

    const alerts = await prisma.priceAlert.findMany({
      where: {
        userId,
        symbol: symbol.toUpperCase(),
      },
      orderBy: { createdAt: 'desc' },
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
    console.error('Error fetching symbol alerts:', error)
    res.status(500).json({ error: 'Failed to fetch symbol alerts' })
  }
})

// POST /api/alerts - Create new alert
router.post('/', requireAuth, validateRequest({ body: CreateAlertSchema }), async (req: AuthenticatedRequest, res) => {
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
      const yahooService = getYahooFinanceService()
      const quote = await yahooService.getQuote(symbol.toUpperCase())
      currency = quote.currency || 'USD'
      exchange = quote.exchangeName
      timezone = quote.exchangeTimezoneName
    } catch (error) {
      console.warn(`Failed to fetch currency info for ${symbol}:`, error)
      // Continue with default values
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId,
        symbol: symbol.toUpperCase(),
        type: condition, // Map condition to type for database compatibility
        price: targetPrice || 0, // Use targetPrice or default to 0 for percentage alerts
        percentageChange,
        enabled,
        currency,
        exchange,
        timezone,
      },
    })

    res.status(201).json({ alert })
  } catch (error) {
    console.error('Error creating alert:', error)
    res.status(500).json({ error: 'Failed to create alert' })
  }
})

// PUT /api/alerts/:id - Update alert
router.put('/:id', requireAuth, validateRequest({ body: UpdateAlertSchema }), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    // Check if alert belongs to user
    const existingAlert = await prisma.priceAlert.findFirst({
      where: { id, userId },
    })

    if (!existingAlert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    const updatedAlert = await prisma.priceAlert.update({
      where: { id },
      data: {
        ...req.body,
        // Reset triggeredAt when re-enabling
        ...(req.body.enabled === true && { triggeredAt: null }),
      },
    })

    res.json({ alert: updatedAlert })
  } catch (error) {
    console.error('Error updating alert:', error)
    res.status(500).json({ error: 'Failed to update alert' })
  }
})

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    const { id } = req.params

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    // Check if alert belongs to user
    const existingAlert = await prisma.priceAlert.findFirst({
      where: { id, userId },
    })

    if (!existingAlert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    await prisma.priceAlert.delete({
      where: { id },
    })

    res.status(204).send()
  } catch (error) {
    console.error('Error deleting alert:', error)
    res.status(500).json({ error: 'Failed to delete alert' })
  }
})

// POST /api/alerts/:id/trigger - Mark alert as triggered (internal use)
router.post('/:id/trigger', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params

    const alert = await prisma.priceAlert.update({
      where: { id },
      data: { triggeredAt: new Date() },
    })

    res.json({ alert })
  } catch (error) {
    console.error('Error triggering alert:', error)
    res.status(500).json({ error: 'Failed to trigger alert' })
  }
})

export default router
