import { PrismaClient } from '@prisma/client'
import { CandleRepository, NotFoundError } from '../../repositories/CandleRepository'

// Mock PrismaClient
const mockPrismaClient = {
  candle: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
} as unknown as PrismaClient

describe('CandleRepository', () => {
  let repository: CandleRepository

  beforeEach(() => {
    repository = new CandleRepository(mockPrismaClient)
    jest.clearAllMocks()
  })

  describe('create', () => {
    const createData = {
      symbol: 'AAPL',
      timestamp: 1640995200,
      open: 149.0,
      high: 152.0,
      low: 148.0,
      close: 150.0,
      volume: 1000000,
    }

    it('should create a candle successfully', async () => {
      const expectedCandle = {
        id: '1',
        createdAt: new Date(),
        ...createData,
      }

      ;(mockPrismaClient.candle.create as jest.Mock).mockResolvedValue(expectedCandle)

      const result = await repository.create(createData)

      expect(result).toEqual(expectedCandle)
      expect(mockPrismaClient.candle.create).toHaveBeenCalledWith({
        data: createData,
      })
    })

    it('should throw error when candle already exists', async () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint violation',
      }

      ;(mockPrismaClient.candle.create as jest.Mock).mockRejectedValue(prismaError)

      await expect(repository.create(createData)).rejects.toThrow(
        'Candle data for symbol AAPL at timestamp 1640995200 already exists'
      )
    })
  })

  describe('findById', () => {
    it('should find candle by id', async () => {
      const candle = {
        id: '1',
        symbol: 'AAPL',
        timestamp: 1640995200,
        open: 149.0,
        high: 152.0,
        low: 148.0,
        close: 150.0,
        volume: 1000000,
        createdAt: new Date(),
      }

      ;(mockPrismaClient.candle.findUnique as jest.Mock).mockResolvedValue(candle)

      const result = await repository.findById('1')

      expect(result).toEqual(candle)
      expect(mockPrismaClient.candle.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })
  })

  describe('findBySymbolAndTimeRange', () => {
    it('should find candles by symbol and time range', async () => {
      const candles = [
        {
          id: '1',
          symbol: 'AAPL',
          timestamp: 1640995200,
          open: 149.0,
          high: 152.0,
          low: 148.0,
          close: 150.0,
          volume: 1000000,
          createdAt: new Date(),
        },
      ]

      ;(mockPrismaClient.candle.findMany as jest.Mock).mockResolvedValue(candles)

      const result = await repository.findBySymbolAndTimeRange('AAPL', 1640995200, 1641081600)

      expect(result).toEqual(candles)
      expect(mockPrismaClient.candle.findMany).toHaveBeenCalledWith({
        where: {
          symbol: 'AAPL',
          timestamp: {
            gte: 1640995200,
            lte: 1641081600,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      })
    })
  })

  describe('findLatestBySymbol', () => {
    it('should find latest candles by symbol', async () => {
      const candles = [
        {
          id: '1',
          symbol: 'AAPL',
          timestamp: 1641081600,
          open: 150.0,
          high: 153.0,
          low: 149.0,
          close: 151.0,
          volume: 1100000,
          createdAt: new Date(),
        },
      ]

      ;(mockPrismaClient.candle.findMany as jest.Mock).mockResolvedValue(candles)

      const result = await repository.findLatestBySymbol('AAPL', 50)

      expect(result).toEqual(candles)
      expect(mockPrismaClient.candle.findMany).toHaveBeenCalledWith({
        where: { symbol: 'AAPL' },
        take: 50,
        orderBy: {
          timestamp: 'desc',
        },
      })
    })
  })

  describe('findMany', () => {
    it('should find candles with filter', async () => {
      const candles = []

      ;(mockPrismaClient.candle.findMany as jest.Mock).mockResolvedValue(candles)

      const result = await repository.findMany(
        { symbol: 'AAPL', fromTimestamp: 1640995200 },
        { skip: 0, take: 10 }
      )

      expect(result).toEqual(candles)
      expect(mockPrismaClient.candle.findMany).toHaveBeenCalledWith({
        where: {
          symbol: 'AAPL',
          timestamp: { gte: 1640995200 },
        },
        skip: 0,
        take: 10,
        orderBy: [{ timestamp: 'asc' }],
      })
    })
  })

  describe('update', () => {
    it('should update candle successfully', async () => {
      const updateData = {
        close: 151.0,
      }

      const updatedCandle = {
        id: '1',
        symbol: 'AAPL',
        timestamp: 1640995200,
        open: 149.0,
        high: 152.0,
        low: 148.0,
        close: 151.0,
        volume: 1000000,
        createdAt: new Date(),
      }

      ;(mockPrismaClient.candle.update as jest.Mock).mockResolvedValue(updatedCandle)

      const result = await repository.update('1', updateData)

      expect(result).toEqual(updatedCandle)
      expect(mockPrismaClient.candle.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      })
    })

    it('should throw NotFoundError when candle not found', async () => {
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      }

      ;(mockPrismaClient.candle.update as jest.Mock).mockRejectedValue(prismaError)

      await expect(repository.update('non-existent', {})).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('should delete candle successfully', async () => {
      ;(mockPrismaClient.candle.delete as jest.Mock).mockResolvedValue({})

      await repository.delete('1')

      expect(mockPrismaClient.candle.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })
  })

  describe('count', () => {
    it('should count candles with filter', async () => {
      ;(mockPrismaClient.candle.count as jest.Mock).mockResolvedValue(100)

      const result = await repository.count({ symbol: 'AAPL' })

      expect(result).toBe(100)
      expect(mockPrismaClient.candle.count).toHaveBeenCalledWith({
        where: {
          symbol: 'AAPL',
        },
      })
    })
  })

  describe('bulkCreate', () => {
    it('should create multiple candles', async () => {
      const candlesData = [
        {
          symbol: 'AAPL',
          timestamp: 1640995200,
          open: 149.0,
          high: 152.0,
          low: 148.0,
          close: 150.0,
          volume: 1000000,
        },
        {
          symbol: 'AAPL',
          timestamp: 1641081600,
          open: 150.0,
          high: 153.0,
          low: 149.0,
          close: 151.0,
          volume: 1100000,
        },
      ]

      ;(mockPrismaClient.candle.createMany as jest.Mock).mockResolvedValue({ count: 2 })

      const result = await repository.bulkCreate(candlesData)

      expect(result).toBe(2)
      expect(mockPrismaClient.candle.createMany).toHaveBeenCalledWith({
        data: candlesData,
        skipDuplicates: true,
      })
    })
  })

  describe('upsertCandle', () => {
    it('should upsert candle successfully', async () => {
      const upsertData = {
        symbol: 'AAPL',
        timestamp: 1640995200,
        open: 149.0,
        high: 152.0,
        low: 148.0,
        close: 150.0,
        volume: 1000000,
      }

      const upsertedCandle = {
        id: '1',
        createdAt: new Date(),
        ...upsertData,
      }

      ;(mockPrismaClient.candle.upsert as jest.Mock).mockResolvedValue(upsertedCandle)

      const result = await repository.upsertCandle(upsertData)

      expect(result).toEqual(upsertedCandle)
      expect(mockPrismaClient.candle.upsert).toHaveBeenCalledWith({
        where: {
          symbol_timestamp: {
            symbol: 'AAPL',
            timestamp: 1640995200,
          },
        },
        update: {
          open: 149.0,
          high: 152.0,
          low: 148.0,
          close: 150.0,
          volume: 1000000,
        },
        create: upsertData,
      })
    })
  })

  describe('deleteOldData', () => {
    it('should delete old candles', async () => {
      ;(mockPrismaClient.candle.deleteMany as jest.Mock).mockResolvedValue({ count: 50 })

      const result = await repository.deleteOldData('AAPL', 1640000000)

      expect(result).toBe(50)
      expect(mockPrismaClient.candle.deleteMany).toHaveBeenCalledWith({
        where: {
          symbol: 'AAPL',
          timestamp: {
            lt: 1640000000,
          },
        },
      })
    })
  })
})
