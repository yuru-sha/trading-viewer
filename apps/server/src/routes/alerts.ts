import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { validateRequest } from '../middleware/errorHandling.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

const CreateAlertSchema = z.object({
  symbol: z.string().min(1),
  type: z.enum(['above', 'below', 'crosses']),
  price: z.number().positive(),
  message: z.string().optional(),
})

const UpdateAlertSchema = z.object({
  enabled: z.boolean().optional(),
  price: z.number().positive().optional(),
  message: z.string().optional(),
})

// GET /api/alerts - Get user's alerts
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const alerts = await prisma.priceAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ alerts })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

// GET /api/alerts/:symbol - Get alerts for specific symbol
router.get('/:symbol', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id
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

    res.json({ alerts })
  } catch (error) {
    console.error('Error fetching symbol alerts:', error)
    res.status(500).json({ error: 'Failed to fetch symbol alerts' })
  }
})

// POST /api/alerts - Create new alert
router.post('/', requireAuth, validateRequest({ body: CreateAlertSchema }), async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const { symbol, type, price, message } = req.body

    const alert = await prisma.priceAlert.create({
      data: {
        userId,
        symbol: symbol.toUpperCase(),
        type,
        price,
        message,
        enabled: true,
      },
    })

    res.status(201).json({ alert })
  } catch (error) {
    console.error('Error creating alert:', error)
    res.status(500).json({ error: 'Failed to create alert' })
  }
})

// PUT /api/alerts/:id - Update alert
router.put('/:id', requireAuth, validateRequest({ body: UpdateAlertSchema }), async (req, res) => {
  try {
    const userId = req.user?.id
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
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id
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
router.post('/:id/trigger', requireAuth, async (req, res) => {
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
