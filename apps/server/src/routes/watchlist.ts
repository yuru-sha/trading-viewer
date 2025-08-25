import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { validateRequest } from '../middleware/errorHandling.js'
import { requireAuth, requireCSRF, AuthenticatedRequest } from '../middleware/auth.js'
import { getYahooFinanceService } from '../services/yahooFinanceService.js'
import { WatchlistRepository } from '../repositories'

const router: import('express').Router = Router()
const prisma = new PrismaClient()
const watchlistRepository = new WatchlistRepository(prisma)

const AddWatchlistSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
})

const RemoveWatchlistSchema = z.object({
  symbol: z.string().min(1),
})

const UpdatePositionsSchema = z.object({
  items: z.array(
    z.object({
      symbol: z.string().min(1),
      position: z.number().int().min(0),
    })
  ),
})

const BulkRemoveWatchlistSchema = z.object({
  symbols: z.array(z.string().min(1)).min(1).max(50), // 最大 50 シンボルまで
})

// GET /api/watchlist - Get user's watchlist
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const watchlist = await watchlistRepository.findByUserId(userId, {
      orderBy: [{ position: 'asc' }],
    })

    res.json({
      success: true,
      data: { watchlist },
    })
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch watchlist',
    })
  }
})

// POST /api/watchlist - Add symbol to watchlist
router.post(
  '/',
  requireAuth,
  requireCSRF,
  validateRequest({ body: AddWatchlistSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { symbol, name } = req.body

      // Check if already exists
      const existing = await watchlistRepository.findByUserIdAndSymbol(userId, symbol.toUpperCase())

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Symbol already in watchlist',
        })
      }

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

      const watchlistItem = await watchlistRepository.create({
        userId,
        symbol: symbol.toUpperCase(),
        name,
        currency,
        exchange,
        timezone,
      })

      res.status(201).json({
        success: true,
        data: { watchlistItem },
      })
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to add to watchlist',
      })
    }
  }
)

// DELETE /api/watchlist - Remove symbol from watchlist
router.delete(
  '/',
  requireAuth,
  requireCSRF,
  validateRequest({ body: RemoveWatchlistSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { symbol } = req.body

      // Check if exists
      const existing = await watchlistRepository.findByUserIdAndSymbol(userId, symbol.toUpperCase())

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Symbol not found in watchlist',
        })
      }

      await watchlistRepository.removeSymbolFromWatchlist(userId, symbol.toUpperCase())

      res.status(204).send()
    } catch (error) {
      console.error('Error removing from watchlist:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to remove from watchlist',
      })
    }
  }
)

// DELETE /api/watchlist/:symbol - Remove symbol from watchlist (URL parameter version)
router.delete('/:symbol', requireAuth, requireCSRF, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const { symbol } = req.params

    // Check if exists
    const existing = await watchlistRepository.findByUserIdAndSymbol(userId, symbol.toUpperCase())

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Symbol not found in watchlist',
      })
    }

    await watchlistRepository.removeSymbolFromWatchlist(userId, symbol.toUpperCase())

    res.json({
      success: true,
      message: `${symbol.toUpperCase()} removed from watchlist`,
    })
  } catch (error) {
    console.error('Error removing from watchlist:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to remove from watchlist',
    })
  }
})

// DELETE /api/watchlist/bulk - Remove multiple symbols from watchlist
router.delete(
  '/bulk',
  requireAuth,
  requireCSRF,
  validateRequest({ body: BulkRemoveWatchlistSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { symbols } = req.body

      // バルク削除: 複数シンボルを削除
      let deletedCount = 0
      for (const symbol of symbols) {
        try {
          await watchlistRepository.removeSymbolFromWatchlist(userId, symbol.toUpperCase())
          deletedCount++
        } catch (error) {
          console.warn(`Failed to remove ${symbol} from watchlist:`, error)
        }
      }

      res.json({
        success: true,
        deletedCount: deletedCount,
        message: `Removed ${deletedCount} symbols from watchlist`,
        symbols: symbols.map(s => s.toUpperCase()),
      })
    } catch (error) {
      console.error('Error bulk removing from watchlist:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to remove symbols from watchlist',
      })
    }
  }
)

// PUT /api/watchlist/positions - Update watchlist item positions
router.put(
  '/positions',
  requireAuth,
  requireCSRF,
  validateRequest({ body: UpdatePositionsSchema }),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const { items } = req.body

      // Update all positions in a transaction
      const symbolPositions = items.map(item => ({
        symbol: item.symbol.toUpperCase(),
        position: item.position,
      }))

      await watchlistRepository.reorderWatchlist(userId, symbolPositions)

      res.json({
        success: true,
        message: 'Watchlist positions updated',
      })
    } catch (error) {
      console.error('Error updating watchlist positions:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update watchlist positions',
      })
    }
  }
)

export default router
