import { vi } from 'vitest'
import { PrismaClient } from '@prisma/client/default'
import {
  UserPreferencesRepository,
  NotFoundError,
} from '../../repositories/UserPreferencesRepository'

// Mock PrismaClient
const mockPrismaClient = {
  userPreferences: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  },
} as unknown as PrismaClient

describe('UserPreferencesRepository', () => {
  let repository: UserPreferencesRepository

  beforeEach(() => {
    repository = new UserPreferencesRepository(mockPrismaClient)
    vi.clearAllMocks()
  })

  describe('create', () => {
    const createData = {
      userId: 'user123',
      theme: 'dark',
      chartType: 'candlestick',
      timeframe: '1D',
      indicators: '[]',
    }

    it('should create user preferences successfully', async () => {
      const expectedPrefs = {
        id: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...createData,
      }

      ;(mockPrismaClient.userPreferences.create as vi.Mock).mockResolvedValue(expectedPrefs)

      const result = await repository.create(createData)

      expect(result).toEqual(expectedPrefs)
      expect(mockPrismaClient.userPreferences.create).toHaveBeenCalledWith({
        data: createData,
      })
    })

    it('should use default values when not provided', async () => {
      const minimalData = { userId: 'user123' }
      const expectedPrefs = {
        id: '1',
        userId: 'user123',
        theme: 'dark',
        chartType: 'candlestick',
        timeframe: '1D',
        indicators: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrismaClient.userPreferences.create as vi.Mock).mockResolvedValue(expectedPrefs)

      const result = await repository.create(minimalData)

      expect(mockPrismaClient.userPreferences.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          theme: 'dark',
          chartType: 'candlestick',
          timeframe: '1D',
          indicators: '[]',
        },
      })
    })

    it('should throw error when user preferences already exist', async () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint violation',
      }

      ;(mockPrismaClient.userPreferences.create as vi.Mock).mockRejectedValue(prismaError)

      await expect(repository.create(createData)).rejects.toThrow(
        'User preferences for user user123 already exist'
      )
    })
  })

  describe('findById', () => {
    it('should find user preferences by id', async () => {
      const prefs = {
        id: '1',
        userId: 'user123',
        theme: 'dark',
        chartType: 'candlestick',
        timeframe: '1D',
        indicators: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrismaClient.userPreferences.findUnique as vi.Mock).mockResolvedValue(prefs)

      const result = await repository.findById('1')

      expect(result).toEqual(prefs)
      expect(mockPrismaClient.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })
  })

  describe('findByUserId', () => {
    it('should find user preferences by userId', async () => {
      const prefs = {
        id: '1',
        userId: 'user123',
        theme: 'dark',
        chartType: 'candlestick',
        timeframe: '1D',
        indicators: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrismaClient.userPreferences.findUnique as vi.Mock).mockResolvedValue(prefs)

      const result = await repository.findByUserId('user123')

      expect(result).toEqual(prefs)
      expect(mockPrismaClient.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user123' },
      })
    })
  })

  describe('findMany', () => {
    it('should find user preferences with filter', async () => {
      const prefs = [
        {
          id: '1',
          userId: 'user123',
          theme: 'dark',
          chartType: 'candlestick',
          timeframe: '1D',
          indicators: '[]',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      ;(mockPrismaClient.userPreferences.findMany as vi.Mock).mockResolvedValue(prefs)

      const result = await repository.findMany({ theme: 'dark' }, { skip: 0, take: 10 })

      expect(result).toEqual(prefs)
      expect(mockPrismaClient.userPreferences.findMany).toHaveBeenCalledWith({
        where: {
          theme: 'dark',
        },
        skip: 0,
        take: 10,
        orderBy: [{ updatedAt: 'desc' }],
      })
    })
  })

  describe('update', () => {
    it('should update user preferences successfully', async () => {
      const updateData = {
        theme: 'light',
      }

      const updatedPrefs = {
        id: '1',
        userId: 'user123',
        theme: 'light',
        chartType: 'candlestick',
        timeframe: '1D',
        indicators: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrismaClient.userPreferences.update as vi.Mock).mockResolvedValue(updatedPrefs)

      const result = await repository.update('1', updateData)

      expect(result).toEqual(updatedPrefs)
      expect(mockPrismaClient.userPreferences.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      })
    })

    it('should throw NotFoundError when preferences not found', async () => {
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      }

      ;(mockPrismaClient.userPreferences.update as vi.Mock).mockRejectedValue(prismaError)

      await expect(repository.update('non-existent', {})).rejects.toThrow(NotFoundError)
    })
  })

  describe('updateByUserId', () => {
    it('should update user preferences by userId', async () => {
      const updateData = {
        theme: 'light',
      }

      const updatedPrefs = {
        id: '1',
        userId: 'user123',
        theme: 'light',
        chartType: 'candlestick',
        timeframe: '1D',
        indicators: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrismaClient.userPreferences.update as vi.Mock).mockResolvedValue(updatedPrefs)

      const result = await repository.updateByUserId('user123', updateData)

      expect(result).toEqual(updatedPrefs)
      expect(mockPrismaClient.userPreferences.update).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        data: updateData,
      })
    })
  })

  describe('delete', () => {
    it('should delete user preferences successfully', async () => {
      ;(mockPrismaClient.userPreferences.delete as vi.Mock).mockResolvedValue({})

      await repository.delete('1')

      expect(mockPrismaClient.userPreferences.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })
  })

  describe('deleteByUserId', () => {
    it('should delete user preferences by userId', async () => {
      ;(mockPrismaClient.userPreferences.delete as vi.Mock).mockResolvedValue({})

      await repository.deleteByUserId('user123')

      expect(mockPrismaClient.userPreferences.delete).toHaveBeenCalledWith({
        where: { userId: 'user123' },
      })
    })
  })

  describe('count', () => {
    it('should count user preferences with filter', async () => {
      ;(mockPrismaClient.userPreferences.count as vi.Mock).mockResolvedValue(5)

      const result = await repository.count({ theme: 'dark' })

      expect(result).toBe(5)
      expect(mockPrismaClient.userPreferences.count).toHaveBeenCalledWith({
        where: {
          theme: 'dark',
        },
      })
    })
  })

  describe('upsertByUserId', () => {
    it('should upsert user preferences successfully', async () => {
      const upsertData = {
        theme: 'light',
        chartType: 'line',
      }

      const upsertedPrefs = {
        id: '1',
        userId: 'user123',
        theme: 'light',
        chartType: 'line',
        timeframe: '1D',
        indicators: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrismaClient.userPreferences.upsert as vi.Mock).mockResolvedValue(upsertedPrefs)

      const result = await repository.upsertByUserId('user123', upsertData)

      expect(result).toEqual(upsertedPrefs)
      expect(mockPrismaClient.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        update: upsertData,
        create: {
          userId: 'user123',
          theme: 'light',
          chartType: 'line',
          timeframe: '1D',
          indicators: '[]',
        },
      })
    })
  })

  describe('Indicator helper methods', () => {
    beforeEach(() => {
      const prefs = {
        id: '1',
        userId: 'user123',
        theme: 'dark',
        chartType: 'candlestick',
        timeframe: '1D',
        indicators: '[{"name":"SMA","type":"overlay","parameters":{"period":20},"visible":true}]',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrismaClient.userPreferences.findUnique as vi.Mock).mockResolvedValue(prefs)
    })

    describe('getIndicators', () => {
      it('should get indicators for user', async () => {
        const result = await repository.getIndicators('user123')

        expect(result).toEqual([
          {
            name: 'SMA',
            type: 'overlay',
            parameters: { period: 20 },
            visible: true,
          },
        ])
      })

      it('should return empty array when no preferences found', async () => {
        ;(mockPrismaClient.userPreferences.findUnique as vi.Mock).mockResolvedValue(null)

        const result = await repository.getIndicators('user123')

        expect(result).toEqual([])
      })

      it('should return empty array when indicators JSON is invalid', async () => {
        const prefs = {
          id: '1',
          userId: 'user123',
          indicators: 'invalid-json',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        ;(mockPrismaClient.userPreferences.findUnique as vi.Mock).mockResolvedValue(prefs)

        const result = await repository.getIndicators('user123')

        expect(result).toEqual([])
      })
    })

    describe('updateIndicators', () => {
      it('should update indicators for user', async () => {
        const indicators = [
          {
            name: 'RSI',
            type: 'oscillator',
            parameters: { period: 14 },
            visible: true,
          },
        ]

        const updatedPrefs = {
          id: '1',
          userId: 'user123',
          theme: 'dark',
          chartType: 'candlestick',
          timeframe: '1D',
          indicators: JSON.stringify(indicators),
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        ;(mockPrismaClient.userPreferences.upsert as vi.Mock).mockResolvedValue(updatedPrefs)

        const result = await repository.updateIndicators('user123', indicators)

        expect(result).toEqual(updatedPrefs)
        expect(mockPrismaClient.userPreferences.upsert).toHaveBeenCalledWith({
          where: { userId: 'user123' },
          update: { indicators: JSON.stringify(indicators) },
          create: {
            userId: 'user123',
            theme: 'dark',
            chartType: 'candlestick',
            timeframe: '1D',
            indicators: JSON.stringify(indicators),
          },
        })
      })
    })

    describe('addIndicator', () => {
      it('should add indicator to existing indicators', async () => {
        const newIndicator = {
          name: 'MACD',
          type: 'oscillator',
          parameters: { fastPeriod: 12, slowPeriod: 26 },
          visible: true,
        }

        const updatedPrefs = {
          id: '1',
          userId: 'user123',
          indicators: '[]',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        ;(mockPrismaClient.userPreferences.upsert as vi.Mock).mockResolvedValue(updatedPrefs)

        const result = await repository.addIndicator('user123', newIndicator)

        expect(result).toEqual(updatedPrefs)
      })
    })

    describe('removeIndicator', () => {
      it('should remove indicator from existing indicators', async () => {
        const updatedPrefs = {
          id: '1',
          userId: 'user123',
          indicators: '[]',
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        ;(mockPrismaClient.userPreferences.upsert as vi.Mock).mockResolvedValue(updatedPrefs)

        const result = await repository.removeIndicator('user123', 'SMA')

        expect(result).toEqual(updatedPrefs)
      })
    })
  })
})
