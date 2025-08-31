import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { log } from '../infrastructure/services/logger'

const router: Router = Router()
const prisma = new PrismaClient()

// Validation schemas
const SaveChartSchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  chartType: z.string(),
  indicators: z.string(),
  drawingTools: z.string(),
  chartSettings: z.string(),
  isDefault: z.boolean().optional().default(false),
})

const UpdateChartSchema = SaveChartSchema.partial().extend({
  id: z.string(),
})

// GET /api/charts - Get saved charts for user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { symbol, timeframe, page = '1', limit = '10' } = req.query

    const where = {
      userId,
      ...(symbol && { symbol: symbol as string }),
      ...(timeframe && { timeframe: timeframe as string }),
    }

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const [charts, total] = await Promise.all([
      prisma.savedChart.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { position: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: limitNum,
      }),
      prisma.savedChart.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        charts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    log.business.error('Error fetching saved charts', error, {
      userId: (req as any).userId,
      symbol: req.query?.symbol as string,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved charts',
    })
  }
})

// GET /api/charts/:id - Get specific chart
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    const chart = await prisma.savedChart.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!chart) {
      return res.status(404).json({
        success: false,
        message: 'Chart not found',
      })
    }

    res.json({
      success: true,
      data: chart,
    })
  } catch (error) {
    log.business.error('Error fetching chart', error, {
      chartId: req.params?.id,
      userId: (req as any).userId,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart',
    })
  }
})

// POST /api/charts - Save new chart
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const validatedData = SaveChartSchema.parse(req.body)

    // Check if chart name already exists for this user/symbol/timeframe
    const existingChart = await prisma.savedChart.findFirst({
      where: {
        userId,
        symbol: validatedData.symbol,
        timeframe: validatedData.timeframe,
        name: validatedData.name,
      },
    })

    if (existingChart) {
      return res.status(400).json({
        success: false,
        message: 'Chart with this name already exists for this symbol and timeframe',
      })
    }

    // If this is set as default, remove default from others
    if (validatedData.isDefault) {
      await prisma.savedChart.updateMany({
        where: {
          userId,
          symbol: validatedData.symbol,
          timeframe: validatedData.timeframe,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    // Get next position
    const lastChart = await prisma.savedChart.findFirst({
      where: {
        userId,
        symbol: validatedData.symbol,
        timeframe: validatedData.timeframe,
      },
      orderBy: { position: 'desc' },
    })

    const position = lastChart ? lastChart.position + 1 : 0

    const chart = await prisma.savedChart.create({
      data: {
        userId,
        symbol: validatedData.symbol,
        timeframe: validatedData.timeframe,
        name: validatedData.name,
        description: validatedData.description,
        chartType: validatedData.chartType,
        indicators: validatedData.indicators,
        drawingTools: validatedData.drawingTools,
        chartSettings: validatedData.chartSettings,
        isDefault: validatedData.isDefault,
        position,
      },
    })

    res.json({
      success: true,
      data: chart,
      message: 'Chart saved successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data',
        errors: error.errors,
      })
    }

    log.business.error('Error saving chart', error, {
      userId: (req as any).userId,
      symbol: req.body?.symbol,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to save chart',
    })
  }
})

// PUT /api/charts/:id - Update chart
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params
    const validatedData = UpdateChartSchema.parse({ id, ...req.body })

    // Check if chart exists and belongs to user
    const existingChart = await prisma.savedChart.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existingChart) {
      return res.status(404).json({
        success: false,
        message: 'Chart not found',
      })
    }

    // Check name uniqueness if name is being changed
    if (validatedData.name && validatedData.name !== existingChart.name) {
      const duplicateChart = await prisma.savedChart.findFirst({
        where: {
          userId,
          symbol: validatedData.symbol || existingChart.symbol,
          timeframe: validatedData.timeframe || existingChart.timeframe,
          name: validatedData.name,
          id: { not: id },
        },
      })

      if (duplicateChart) {
        return res.status(400).json({
          success: false,
          message: 'Chart with this name already exists for this symbol and timeframe',
        })
      }
    }

    // If this is set as default, remove default from others
    if (validatedData.isDefault) {
      await prisma.savedChart.updateMany({
        where: {
          userId,
          symbol: validatedData.symbol || existingChart.symbol,
          timeframe: validatedData.timeframe || existingChart.timeframe,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      })
    }

    const { id: _, ...updateData } = validatedData
    const chart = await prisma.savedChart.update({
      where: { id },
      data: updateData,
    })

    res.json({
      success: true,
      data: chart,
      message: 'Chart updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data',
        errors: error.errors,
      })
    }

    log.business.error('Error updating chart', error, {
      chartId: req.params?.id,
      userId: (req as any).userId,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to update chart',
    })
  }
})

// DELETE /api/charts/:id - Delete chart
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    // Check if chart exists and belongs to user
    const existingChart = await prisma.savedChart.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existingChart) {
      return res.status(404).json({
        success: false,
        message: 'Chart not found',
      })
    }

    await prisma.savedChart.delete({
      where: { id },
    })

    res.json({
      success: true,
      message: 'Chart deleted successfully',
    })
  } catch (error) {
    log.business.error('Error deleting chart', error, {
      chartId: req.params?.id,
      userId: (req as any).userId,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to delete chart',
    })
  }
})

// PUT /api/charts/:id/default - Set chart as default
router.put('/:id/default', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    // Check if chart exists and belongs to user
    const existingChart = await prisma.savedChart.findFirst({
      where: {
        id,
        userId,
      },
    })

    if (!existingChart) {
      return res.status(404).json({
        success: false,
        message: 'Chart not found',
      })
    }

    // Remove default from other charts for same symbol/timeframe
    await prisma.savedChart.updateMany({
      where: {
        userId,
        symbol: existingChart.symbol,
        timeframe: existingChart.timeframe,
        isDefault: true,
        id: { not: id },
      },
      data: {
        isDefault: false,
      },
    })

    // Set this chart as default
    const chart = await prisma.savedChart.update({
      where: { id },
      data: {
        isDefault: true,
      },
    })

    res.json({
      success: true,
      data: chart,
      message: 'Chart set as default successfully',
    })
  } catch (error) {
    log.business.error('Error setting chart as default', error, {
      chartId: req.params?.id,
      userId: (req as any).userId,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to set chart as default',
    })
  }
})

// GET /api/charts/default/:symbol/:timeframe - Get default chart for symbol/timeframe
router.get('/default/:symbol/:timeframe', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { symbol, timeframe } = req.params

    const chart = await prisma.savedChart.findFirst({
      where: {
        userId,
        symbol,
        timeframe,
        isDefault: true,
      },
    })

    if (!chart) {
      return res.status(404).json({
        success: false,
        message: 'No default chart found for this symbol and timeframe',
      })
    }

    res.json({
      success: true,
      data: chart,
    })
  } catch (error) {
    log.business.error('Error fetching default chart', error, {
      symbol: req.params?.symbol,
      timeframe: req.params?.timeframe,
      userId: (req as any).userId,
    })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch default chart',
    })
  }
})

export default router
