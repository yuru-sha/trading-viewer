import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/database'
import { requireAuth, requireCSRF, AuthenticatedRequest } from '../middleware/auth.js'
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
import { DrawingTool, DrawingPoint, DrawingStyle } from '@trading-viewer/shared'

const router = Router()

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
  tool: z.object({
    type: z.enum(['trendline', 'horizontal', 'vertical', 'rectangle', 'circle', 'arrow', 'text']),
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
    type: z.enum(['trendline', 'horizontal', 'vertical', 'rectangle', 'circle', 'arrow', 'text']).optional(),
    points: z.array(drawingPointSchema).optional(),
    style: drawingStyleSchema.optional(),
    text: z.string().optional(),
    locked: z.boolean().optional(),
    visible: z.boolean().optional(),
  }),
})

// GET /api/drawings/:symbol - Get all drawing tools for a symbol
router.get('/:symbol', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { symbol } = req.params
    const { userId } = req.query

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

    const drawingTools = await prisma.drawingTool.findMany({
      where: {
        symbol,
        userId: searchUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

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

    const response: GetDrawingToolsResponse = {
      data: transformedTools,
      status: 'success',
    }

    res.json(response)
  } catch (error) {
    console.error('Error fetching drawing tools:', error)
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

    const { symbol, tool } = validation.data

    // Use authenticated user ID
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      })
    }

    const createdTool = await prisma.drawingTool.create({
      data: {
        userId,
        symbol,
        type: tool.type,
        points: JSON.stringify(tool.points),
        style: JSON.stringify(tool.style),
        text: tool.text,
        locked: tool.locked ?? false,
        visible: tool.visible ?? true,
      },
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

    const response: CreateDrawingToolResponse = {
      data: transformedTool,
      status: 'success',
    }

    res.status(201).json(response)
  } catch (error) {
    console.error('Error creating drawing tool:', error)
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

    const updatedTool = await prisma.drawingTool.update({
      where: { id },
      data: updateData,
    })

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

    const response: UpdateDrawingToolResponse = {
      data: transformedTool,
      status: 'success',
    }

    res.json(response)
  } catch (error) {
    console.error('Error updating drawing tool:', error)
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

    await prisma.drawingTool.delete({
      where: { id },
    })

    const response: DeleteDrawingToolResponse = {
      status: 'success',
    }

    res.json(response)
  } catch (error) {
    console.error('Error deleting drawing tool:', error)
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

export default router