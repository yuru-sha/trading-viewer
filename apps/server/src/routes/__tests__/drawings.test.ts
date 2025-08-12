import request from 'supertest'
import express from 'express'
import { prisma } from '../../lib/database'
import drawingRoutes from '../drawings'

// Create test app
const app = express()
app.use(express.json())
app.use('/api/drawings', drawingRoutes)

describe('Drawing Tools API', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.drawingTool.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/drawings', () => {
    it('should create a new drawing tool', async () => {
      const newDrawingTool = {
        symbol: 'AAPL',
        tool: {
          type: 'trendline',
          points: [
            { timestamp: 1640995200000, price: 150.0 },
            { timestamp: 1641081600000, price: 155.0 }
          ],
          style: {
            color: '#3b82f6',
            thickness: 2,
            opacity: 1,
          },
          visible: true,
          locked: false,
        },
      }

      const response = await request(app)
        .post('/api/drawings')
        .send(newDrawingTool)
        .expect(201)

      expect(response.body.status).toBe('success')
      expect(response.body.data).toBeDefined()
      expect(response.body.data.type).toBe('trendline')
      expect(response.body.data.id).toBeDefined()
    })

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        symbol: 'AAPL',
        tool: {
          type: 'invalid_type',
        },
      }

      const response = await request(app)
        .post('/api/drawings')
        .send(invalidData)
        .expect(400)

      expect(response.body.status).toBe('error')
    })
  })

  describe('GET /api/drawings/:symbol', () => {
    it('should get all drawing tools for a symbol', async () => {
      // Create a test drawing tool
      const drawingTool = await prisma.drawingTool.create({
        data: {
          userId: 'default-user',
          symbol: 'AAPL',
          type: 'trendline',
          points: JSON.stringify([
            { timestamp: 1640995200000, price: 150.0 },
            { timestamp: 1641081600000, price: 155.0 }
          ]),
          style: JSON.stringify({
            color: '#3b82f6',
            thickness: 2,
            opacity: 1,
          }),
          visible: true,
          locked: false,
        },
      })

      const response = await request(app)
        .get('/api/drawings/AAPL')
        .expect(200)

      expect(response.body.status).toBe('success')
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].id).toBe(drawingTool.id)
      expect(response.body.data[0].type).toBe('trendline')
    })

    it('should return empty array for symbol with no drawings', async () => {
      const response = await request(app)
        .get('/api/drawings/MSFT')
        .expect(200)

      expect(response.body.status).toBe('success')
      expect(response.body.data).toHaveLength(0)
    })
  })

  describe('DELETE /api/drawings/:id', () => {
    it('should delete a drawing tool', async () => {
      // Create a test drawing tool
      const drawingTool = await prisma.drawingTool.create({
        data: {
          userId: 'default-user',
          symbol: 'AAPL',
          type: 'trendline',
          points: JSON.stringify([
            { timestamp: 1640995200000, price: 150.0 },
            { timestamp: 1641081600000, price: 155.0 }
          ]),
          style: JSON.stringify({
            color: '#3b82f6',
            thickness: 2,
            opacity: 1,
          }),
          visible: true,
          locked: false,
        },
      })

      const response = await request(app)
        .delete(`/api/drawings/${drawingTool.id}`)
        .expect(200)

      expect(response.body.status).toBe('success')

      // Verify it was deleted
      const deletedTool = await prisma.drawingTool.findUnique({
        where: { id: drawingTool.id },
      })
      expect(deletedTool).toBeNull()
    })

    it('should return 404 for non-existent drawing tool', async () => {
      const response = await request(app)
        .delete('/api/drawings/non-existent-id')
        .expect(404)

      expect(response.body.status).toBe('error')
      expect(response.body.message).toBe('Drawing tool not found')
    })
  })
})