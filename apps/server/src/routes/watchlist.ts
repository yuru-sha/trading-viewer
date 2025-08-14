import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { validateRequest } from '../middleware/errorHandling.js'
import { requireAuth, requireCSRF, AuthenticatedRequest } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

const AddWatchlistSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
})

const RemoveWatchlistSchema = z.object({
  symbol: z.string().min(1),
})

const UpdatePositionsSchema = z.object({
  items: z.array(z.object({
    symbol: z.string().min(1),
    position: z.number().int().min(0),
  })),
})

// GET /api/watchlist - Get user's watchlist
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    })

    res.json({ 
      success: true,
      data: { watchlist }
    })
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch watchlist' 
    })
  }
})

// POST /api/watchlist - Add symbol to watchlist
router.post('/', requireAuth, requireCSRF, validateRequest({ body: AddWatchlistSchema }), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const { symbol, name } = req.body

    // Check if already exists
    const existing = await prisma.watchlist.findUnique({
      where: { 
        userId_symbol: {
          userId,
          symbol: symbol.toUpperCase()
        }
      }
    })

    if (existing) {
      return res.status(409).json({ 
        success: false,
        error: 'Symbol already in watchlist' 
      })
    }

    // Get the highest position for this user and add 1
    const maxPositionItem = await prisma.watchlist.findFirst({
      where: { userId },
      orderBy: { position: 'desc' },
      select: { position: true }
    })

    const newPosition = (maxPositionItem?.position ?? -1) + 1

    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId,
        symbol: symbol.toUpperCase(),
        name,
        position: newPosition,
      },
    })

    res.status(201).json({ 
      success: true,
      data: { watchlistItem }
    })
  } catch (error) {
    console.error('Error adding to watchlist:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to add to watchlist' 
    })
  }
})

// DELETE /api/watchlist - Remove symbol from watchlist
router.delete('/', requireAuth, requireCSRF, validateRequest({ body: RemoveWatchlistSchema }), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const { symbol } = req.body

    // Check if exists
    const existing = await prisma.watchlist.findUnique({
      where: { 
        userId_symbol: {
          userId,
          symbol: symbol.toUpperCase()
        }
      }
    })

    if (!existing) {
      return res.status(404).json({ 
        success: false,
        error: 'Symbol not found in watchlist' 
      })
    }

    await prisma.watchlist.delete({
      where: { 
        userId_symbol: {
          userId,
          symbol: symbol.toUpperCase()
        }
      }
    })

    res.status(204).send()
  } catch (error) {
    console.error('Error removing from watchlist:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to remove from watchlist' 
    })
  }
})

// DELETE /api/watchlist/:symbol - Remove symbol from watchlist (URL parameter version)
router.delete('/:symbol', requireAuth, requireCSRF, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const { symbol } = req.params

    // Check if exists
    const existing = await prisma.watchlist.findUnique({
      where: { 
        userId_symbol: {
          userId,
          symbol: symbol.toUpperCase()
        }
      }
    })

    if (!existing) {
      return res.status(404).json({ 
        success: false,
        error: 'Symbol not found in watchlist' 
      })
    }

    await prisma.watchlist.delete({
      where: { 
        userId_symbol: {
          userId,
          symbol: symbol.toUpperCase()
        }
      }
    })

    res.json({ 
      success: true,
      message: `${symbol.toUpperCase()} removed from watchlist` 
    })
  } catch (error) {
    console.error('Error removing from watchlist:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to remove from watchlist' 
    })
  }
})

// PUT /api/watchlist/positions - Update watchlist item positions
router.put('/positions', requireAuth, requireCSRF, validateRequest({ body: UpdatePositionsSchema }), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const { items } = req.body

    // Update all positions in a transaction
    const updatePromises = items.map(item => 
      prisma.watchlist.updateMany({
        where: {
          userId,
          symbol: item.symbol.toUpperCase()
        },
        data: {
          position: item.position
        }
      })
    )

    await prisma.$transaction(updatePromises)

    res.json({
      success: true,
      message: 'Watchlist positions updated'
    })
  } catch (error) {
    console.error('Error updating watchlist positions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update watchlist positions'
    })
  }
})

export default router