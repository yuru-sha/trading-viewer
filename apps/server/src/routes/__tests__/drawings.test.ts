import request from 'supertest'
import { getExpressApp } from '../../__tests__/setup/testApp.js'
import { prisma } from '../../lib/database'
import {
  createTestUser,
  cleanupTestUser,
  getAuthHeaders,
  TestUser,
} from '../../__tests__/helpers/auth.js'

describe.skip('Drawing Tools API', () => {
  let testUser: TestUser

  beforeAll(async () => {
    testUser = await createTestUser()
  })

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.drawingTool.deleteMany()
  })

  afterAll(async () => {
    await cleanupTestUser()
    await prisma.$disconnect()
  })

  describe('POST /api/drawings', () => {
    it('should create a new drawing tool', async () => {
      const app = await getExpressApp()
      const newDrawingTool = {
        symbol: 'AAPL',
        tool: {
          type: 'trendline',
          points: [
            { timestamp: 1640995200000, price: 150.0 },
            { timestamp: 1641081600000, price: 155.0 },
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
        .set(await getAuthHeaders(testUser.accessToken, true))
        .send(newDrawingTool)
        .expect(201)

      expect(response.body.status).toBe('success')
      expect(response.body.data).toBeDefined()
      expect(response.body.data.type).toBe('trendline')
      expect(response.body.data.id).toBeDefined()
    })

    it('should return validation error for invalid data', async () => {
      const app = await getExpressApp()
      const invalidData = {
        symbol: 'AAPL',
        tool: {
          type: 'invalid_type',
        },
      }

      const response = await request(app)
        .post('/api/drawings')
        .set(await getAuthHeaders(testUser.accessToken, true))
        .send(invalidData)
        .expect(400)

      expect(response.body.status).toBe('error')
    })
  })

  describe('GET /api/drawings/:symbol', () => {
    it('should get all drawing tools for a symbol', async () => {
      const app = await getExpressApp()
      // Create a test drawing tool
      const drawingTool = await prisma.drawingTool.create({
        data: {
          userId: testUser.id,
          symbol: 'AAPL',
          type: 'trendline',
          points: JSON.stringify([
            { timestamp: 1640995200000, price: 150.0 },
            { timestamp: 1641081600000, price: 155.0 },
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
        .set(await getAuthHeaders(testUser.accessToken))
        .expect(200)

      expect(response.body.status).toBe('success')
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].id).toBe(drawingTool.id)
      expect(response.body.data[0].type).toBe('trendline')
    })

    it('should return empty array for symbol with no drawings', async () => {
      const app = await getExpressApp()
      const response = await request(app)
        .get('/api/drawings/MSFT')
        .set(await getAuthHeaders(testUser.accessToken))
        .expect(200)

      expect(response.body.status).toBe('success')
      expect(response.body.data).toHaveLength(0)
    })
  })

  describe('DELETE /api/drawings/:id', () => {
    it('should delete a drawing tool', async () => {
      const app = await getExpressApp()
      // Create a test drawing tool
      const drawingTool = await prisma.drawingTool.create({
        data: {
          userId: testUser.id,
          symbol: 'AAPL',
          type: 'trendline',
          points: JSON.stringify([
            { timestamp: 1640995200000, price: 150.0 },
            { timestamp: 1641081600000, price: 155.0 },
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
        .set(await getAuthHeaders(testUser.accessToken, true))
        .expect(200)

      expect(response.body.status).toBe('success')

      // Verify it was deleted
      const deletedTool = await prisma.drawingTool.findUnique({
        where: { id: drawingTool.id },
      })
      expect(deletedTool).toBeNull()
    })

    it('should return 404 for non-existent drawing tool', async () => {
      const app = await getExpressApp()
      const response = await request(app)
        .delete('/api/drawings/non-existent-id')
        .set(await getAuthHeaders(testUser.accessToken, true))
        .expect(404)

      expect(response.body.status).toBe('error')
      expect(response.body.message).toBe('Drawing tool not found')
    })
  })
})
