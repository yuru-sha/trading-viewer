import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/database'
import { requireAuth, requireCSRF, AuthenticatedRequest } from '../middleware/auth.js'
import { DrawingToolRepository } from '../infrastructure/repositories'
import type {
  CreateDrawingToolRequest,
  CreateDrawingToolResponse,
  GetDrawingToolsRequest,
  GetDrawingToolsResponse,
  UpdateDrawingToolRequest,
  UpdateDrawingToolResponse,
  DeleteDrawingToolRequest,
  DeleteDrawingToolResponse,
} from '@trading-viewer/shared'
import { DrawingToolType, DrawingPoint, DrawingStyle, DrawingObject } from '@trading-viewer/shared'
import { log } from '../infrastructure/services/logger'

// Define local DrawingTool interface for server responses
interface DrawingTool {
  id: string
  type: DrawingToolType
  points: DrawingPoint[]
  style: DrawingStyle
  text?: string
  locked?: boolean
  visible?: boolean
  createdAt: number
  updatedAt: number
}

const router: import('express').Router = Router()
const drawingToolRepository = new DrawingToolRepository(prisma)

// Validation schemas
const drawingPointSchema = z.object({
  timestamp: z.number(),
  price: z.number(),
})

const drawingStyleSchema = z.object({
  color: z.string(),
  thickness: z.number(),
  opacity: z.number(),
  dashPattern: z.array(z.number()).optional(),
  fillColor: z.string().optional(),
  fillOpacity: z.number().optional(),
  fontSize: z.number().optional(),
  fontFamily: z.string().optional(),
})

const createDrawingToolSchema = z.object({
  symbol: z.string(),
  timeframe: z.string().optional().default('1D'),
  tool: z.object({
    type: z.enum(['trendline', 'horizontal', 'vertical', 'fibonacci']),
    points: z.array(drawingPointSchema),
    style: drawingStyleSchema,
    text: z.string().optional(),
    locked: z.boolean().optional(),
    visible: z.boolean().optional(),
  }),
})

const updateDrawingToolSchema = z.object({
  id: z.string(),
  updates: z.object({
    type: z.enum(['trendline', 'horizontal', 'vertical', 'fibonacci']).optional(),
    points: z.array(drawingPointSchema).optional(),
    style: drawingStyleSchema.optional(),
    text: z.string().optional(),
    locked: z.boolean().optional(),
    visible: z.boolean().optional(),
  }),
})

// GET /api/drawings/:symbol - Get all drawing tools for a symbol and timeframe
router.get('/:symbol', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { symbol } = req.params
    const { timeframe = '1D' } = req.query

    if (!symbol) {
      return res.status(400).json({
        status: 'error',
        message: 'Symbol is required',
      })
    }

    // Use authenticated user ID
    const searchUserId = req.user?.userId
    if (!searchUserId) {
      return res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      })
    }

    const drawingTools = await drawingToolRepository.findByUserIdSymbolAndTimeframe(
      searchUserId,
      symbol,
      timeframe as string,
      { orderBy: [{ createdAt: 'desc' }] }
    )

    // Transform database records to API format
    const transformedTools: DrawingTool[] = drawingTools.map(tool => ({
      id: tool.id,
      type: tool.type as DrawingTool['type'],
      points: JSON.parse(tool.points) as DrawingPoint[],
      style: JSON.parse(tool.style) as DrawingStyle,
      text: tool.text || undefined,
      locked: tool.locked,
      visible: tool.visible,
      createdAt: tool.createdAt.getTime(),
      updatedAt: tool.updatedAt.getTime(),
    }))

    const response: any = {
      data: transformedTools,
      status: 'success',
    }

    res.json(response)
  } catch (error) {
    log.business.error('Error fetching drawing tools', error, {
      symbol: req.params?.symbol,
      userId: req.user?.userId,
    })
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    })
  }
})

// POST /api/drawings - Create a new drawing tool
router.post('/', requireAuth, requireCSRF, async (req: AuthenticatedRequest, res) => {
  try {
    const validation = createDrawingToolSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: validation.error.errors,
      })
    }

    const { symbol, timeframe, tool } = validation.data

    // Use authenticated user ID
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      })
    }

    const createdTool = await drawingToolRepository.create({
      userId,
      symbol,
      timeframe: timeframe || '1D',
      type: tool.type,
      points: JSON.stringify(tool.points),
      style: JSON.stringify(tool.style),
      text: tool.text,
      locked: tool.locked ?? false,
      visible: tool.visible ?? true,
    })

    // Transform to API format
    const transformedTool: DrawingTool = {
      id: createdTool.id,
      type: createdTool.type as DrawingTool['type'],
      points: JSON.parse(createdTool.points) as DrawingPoint[],
      style: JSON.parse(createdTool.style) as DrawingStyle,
      text: createdTool.text || undefined,
      locked: createdTool.locked,
      visible: createdTool.visible,
      createdAt: createdTool.createdAt.getTime(),
      updatedAt: createdTool.updatedAt.getTime(),
    }

    const response: any = {
      data: transformedTool,
      status: 'success',
    }

    res.status(201).json(response)
  } catch (error) {
    log.business.error('Error creating drawing tool', error, {
      symbol: req.body?.symbol,
      userId: req.user?.userId,
    })
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    })
  }
})

// PUT /api/drawings/:id - Update a drawing tool
router.put('/:id', requireAuth, requireCSRF, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params
    const validation = updateDrawingToolSchema.safeParse({ id, ...req.body })
    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: validation.error.errors,
      })
    }

    const { updates } = validation.data

    // Build update data
    const updateData: any = {}
    if (updates.type) updateData.type = updates.type
    if (updates.points) updateData.points = JSON.stringify(updates.points)
    if (updates.style) updateData.style = JSON.stringify(updates.style)
    if (updates.text !== undefined) updateData.text = updates.text
    if (updates.locked !== undefined) updateData.locked = updates.locked
    if (updates.visible !== undefined) updateData.visible = updates.visible

    const updatedTool = await drawingToolRepository.update(id, updateData)

    // Transform to API format
    const transformedTool: DrawingTool = {
      id: updatedTool.id,
      type: updatedTool.type as DrawingTool['type'],
      points: JSON.parse(updatedTool.points) as DrawingPoint[],
      style: JSON.parse(updatedTool.style) as DrawingStyle,
      text: updatedTool.text || undefined,
      locked: updatedTool.locked,
      visible: updatedTool.visible,
      createdAt: updatedTool.createdAt.getTime(),
      updatedAt: updatedTool.updatedAt.getTime(),
    }

    const response: any = {
      data: transformedTool,
      status: 'success',
    }

    res.json(response)
  } catch (error) {
    log.business.error('Error updating drawing tool', error, {
      drawingId: req.params?.id,
      userId: req.user?.userId,
    })
    if ((error as any).code === 'P2025') {
      res.status(404).json({
        status: 'error',
        message: 'Drawing tool not found',
      })
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      })
    }
  }
})

// DELETE /api/drawings/:id - Delete a drawing tool
router.delete('/:id', requireAuth, requireCSRF, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Drawing tool ID is required',
      })
    }

    await drawingToolRepository.delete(id)

    const response: any = {
      status: 'success',
    }

    res.json(response)
  } catch (error) {
    log.business.error('Error deleting drawing tool', error, {
      drawingId: req.params?.id,
      userId: req.user?.userId,
    })
    if ((error as any).code === 'P2025') {
      res.status(404).json({
        status: 'error',
        message: 'Drawing tool not found',
      })
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      })
    }
  }
})

// POST /api/drawings/batch - Bulk operations for drawing tools
router.post('/batch', requireAuth, requireCSRF, async (req: AuthenticatedRequest, res) => {
  try {
    const { operation, data } = req.body
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      })
    }

    if (operation === 'replace') {
      // Replace all drawing tools for a symbol/timeframe combination
      const { symbol, timeframe = '1D', tools } = data

      if (!symbol || !Array.isArray(tools)) {
        return res.status(400).json({
          status: 'error',
          message: 'Symbol and tools array are required for replace operation',
        })
      }

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async tx => {
        // First, delete existing tools for this user/symbol/timeframe
        const deleteResult = await tx.drawingTool.deleteMany({
          where: {
            userId,
            symbol,
            timeframe,
          },
        })

        log.business.info('Batch delete completed', {
          userId,
          symbol,
          timeframe,
          deletedCount: deleteResult.count,
        })

        // Then, create new tools if any
        if (tools.length > 0) {
          const createData = tools.map((tool: any) => ({
            userId,
            symbol,
            timeframe,
            type: tool.type,
            points: JSON.stringify(tool.points),
            style: JSON.stringify(tool.style),
            text: tool.text,
            locked: tool.locked ?? false,
            visible: tool.visible ?? true,
          }))

          const createResult = await tx.drawingTool.createMany({
            data: createData,
          })

          log.business.info('Batch create completed', {
            userId,
            symbol,
            timeframe,
            createdCount: createResult.count,
          })

          // Fetch the created tools to return them
          const createdTools = await tx.drawingTool.findMany({
            where: {
              userId,
              symbol,
              timeframe,
            },
            orderBy: { createdAt: 'desc' },
          })

          return {
            deleted: deleteResult.count,
            created: createResult.count,
            tools: createdTools,
          }
        }

        return {
          deleted: deleteResult.count,
          created: 0,
          tools: [],
        }
      })

      // Transform tools to API format
      const transformedTools = result.tools.map(tool => ({
        id: tool.id,
        type: tool.type as any,
        points: JSON.parse(tool.points),
        style: JSON.parse(tool.style),
        text: tool.text || undefined,
        locked: tool.locked,
        visible: tool.visible,
        createdAt: tool.createdAt.getTime(),
        updatedAt: tool.updatedAt.getTime(),
      }))

      res.json({
        status: 'success',
        data: {
          operation: 'replace',
          deleted: result.deleted,
          created: result.created,
          tools: transformedTools,
        },
      })
    } else if (operation === 'bulkDelete') {
      // Delete multiple tools by IDs
      const { ids } = data

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'IDs array is required for bulk delete operation',
        })
      }

      // Verify all tools belong to the user before deletion
      const userTools = await prisma.drawingTool.findMany({
        where: {
          id: { in: ids },
          userId,
        },
        select: { id: true },
      })

      if (userTools.length !== ids.length) {
        return res.status(403).json({
          status: 'error',
          message: 'Some drawing tools do not belong to the authenticated user',
        })
      }

      const deleteCount = await drawingToolRepository.bulkDelete(ids)

      log.business.info('Bulk delete completed', {
        userId,
        requestedIds: ids.length,
        deletedCount: deleteCount,
      })

      res.json({
        status: 'success',
        data: {
          operation: 'bulkDelete',
          deleted: deleteCount,
        },
      })
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Unsupported operation. Use "replace" or "bulkDelete"',
      })
    }
  } catch (error) {
    log.business.error('Error in batch drawing operation', error, {
      operation: req.body?.operation,
      userId: req.user?.userId,
    })
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    })
  }
})

export default router
