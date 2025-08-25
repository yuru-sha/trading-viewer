import { vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { DatabaseService, IDatabaseService } from '../../services/databaseService'

// Mock PrismaClient
const mockPrismaClient = {
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  $disconnect: vi.fn(),
} as unknown as PrismaClient

// Mock repositories
vi.mock('../../repositories/SymbolRepository', () => ({
  SymbolRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    findById: vi.fn(),
    findBySymbol: vi.fn(),
  })),
}))

vi.mock('../../repositories/CandleRepository', () => ({
  CandleRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    findById: vi.fn(),
    bulkCreate: vi.fn(),
  })),
}))

vi.mock('../../repositories/UserPreferencesRepository', () => ({
  UserPreferencesRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    findByUserId: vi.fn(),
    upsertByUserId: vi.fn(),
  })),
}))

describe.skip('DatabaseService', () => {
  let service: IDatabaseService

  beforeEach(() => {
    service = new DatabaseService(mockPrismaClient)
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with provided PrismaClient', () => {
      const customPrisma = {} as PrismaClient
      const customService = new DatabaseService(customPrisma)

      expect(customService.symbols).toBeDefined()
      expect(customService.candles).toBeDefined()
      expect(customService.userPreferences).toBeDefined()
    })

    it('should initialize with default PrismaClient when not provided', () => {
      const defaultService = new DatabaseService()

      expect(defaultService.symbols).toBeDefined()
      expect(defaultService.candles).toBeDefined()
      expect(defaultService.userPreferences).toBeDefined()
    })
  })

  describe('startTransaction', () => {
    it('should start a transaction with repository instances', async () => {
      const mockTransaction = {
        symbols: expect.any(Object),
        candles: expect.any(Object),
        userPreferences: expect.any(Object),
        commit: expect.any(Function),
        rollback: expect.any(Function),
      }

      ;(mockPrismaClient.$transaction as vi.Mock).mockImplementation(async callback => {
        return await callback(mockPrismaClient)
      })

      const transaction = await service.startTransaction()

      expect(transaction).toEqual(mockTransaction)
      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should handle transaction rollback', async () => {
      ;(mockPrismaClient.$transaction as vi.Mock).mockImplementation(async callback => {
        return await callback(mockPrismaClient)
      })

      const transaction = await service.startTransaction()

      await expect(transaction.rollback()).rejects.toThrow('Transaction rollback requested')
    })
  })

  describe('isHealthy', () => {
    it('should return true when database is healthy', async () => {
      ;(mockPrismaClient.$queryRaw as vi.Mock).mockResolvedValue([{ 1: 1 }])

      const result = await service.isHealthy()

      expect(result).toBe(true)
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(expect.any(Array))
    })

    it('should return false when database is unhealthy', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation()
      ;(mockPrismaClient.$queryRaw as vi.Mock).mockRejectedValue(new Error('Database error'))

      const result = await service.isHealthy()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Database health check failed:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('cleanup', () => {
    it('should disconnect from database', async () => {
      ;(mockPrismaClient.$disconnect as vi.Mock).mockResolvedValue(undefined)

      await service.cleanup()

      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
    })
  })

  describe('repository access', () => {
    it('should provide access to symbols repository', () => {
      expect(service.symbols).toBeDefined()
      expect(typeof service.symbols.create).toBe('function')
    })

    it('should provide access to candles repository', () => {
      expect(service.candles).toBeDefined()
      expect(typeof service.candles.create).toBe('function')
    })

    it('should provide access to userPreferences repository', () => {
      expect(service.userPreferences).toBeDefined()
      expect(typeof service.userPreferences.create).toBe('function')
    })
  })
})
