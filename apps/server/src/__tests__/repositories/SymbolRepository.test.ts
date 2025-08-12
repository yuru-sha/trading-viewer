import { PrismaClient } from '@prisma/client'
import {
  SymbolRepository,
  DuplicateError,
  NotFoundError,
} from '../../repositories/SymbolRepository'

// Mock PrismaClient
const mockPrismaClient = {
  symbol: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
} as unknown as PrismaClient

describe('SymbolRepository', () => {
  let repository: SymbolRepository

  beforeEach(() => {
    repository = new SymbolRepository(mockPrismaClient)
    jest.clearAllMocks()
  })

  describe('create', () => {
    const createData = {
      symbol: 'AAPL',
      description: 'Apple Inc',
      displaySymbol: 'AAPL',
      type: 'Common Stock',
    }

    it('should create a symbol successfully', async () => {
      const expectedSymbol = {
        id: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...createData,
      }

      ;(mockPrismaClient.symbol.create as jest.Mock).mockResolvedValue(expectedSymbol)

      const result = await repository.create(createData)

      expect(result).toEqual(expectedSymbol)
      expect(mockPrismaClient.symbol.create).toHaveBeenCalledWith({
        data: createData,
      })
    })

    it('should throw DuplicateError when symbol already exists', async () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint violation',
      }

      ;(mockPrismaClient.symbol.create as jest.Mock).mockRejectedValue(prismaError)

      await expect(repository.create(createData)).rejects.toThrow(DuplicateError)
    })
  })

  describe('findById', () => {
    it('should find symbol by id', async () => {
      const symbol = {
        id: '1',
        symbol: 'AAPL',
        description: 'Apple Inc',
        displaySymbol: 'AAPL',
        type: 'Common Stock',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrismaClient.symbol.findUnique as jest.Mock).mockResolvedValue(symbol)

      const result = await repository.findById('1')

      expect(result).toEqual(symbol)
      expect(mockPrismaClient.symbol.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })

    it('should return null when symbol not found', async () => {
      ;(mockPrismaClient.symbol.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await repository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findBySymbol', () => {
    it('should find symbol by symbol name', async () => {
      const symbol = {
        id: '1',
        symbol: 'AAPL',
        description: 'Apple Inc',
        displaySymbol: 'AAPL',
        type: 'Common Stock',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrismaClient.symbol.findUnique as jest.Mock).mockResolvedValue(symbol)

      const result = await repository.findBySymbol('AAPL')

      expect(result).toEqual(symbol)
      expect(mockPrismaClient.symbol.findUnique).toHaveBeenCalledWith({
        where: { symbol: 'AAPL' },
      })
    })
  })

  describe('findMany', () => {
    it('should find symbols with filter', async () => {
      const symbols = [
        {
          id: '1',
          symbol: 'AAPL',
          description: 'Apple Inc',
          displaySymbol: 'AAPL',
          type: 'Common Stock',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      ;(mockPrismaClient.symbol.findMany as jest.Mock).mockResolvedValue(symbols)

      const result = await repository.findMany({ symbol: 'AAP' }, { skip: 0, take: 10 })

      expect(result).toEqual(symbols)
      expect(mockPrismaClient.symbol.findMany).toHaveBeenCalledWith({
        where: {
          symbol: { contains: 'AAP', mode: 'insensitive' },
        },
        skip: 0,
        take: 10,
        orderBy: undefined,
      })
    })

    it('should find all symbols when no filter provided', async () => {
      const symbols = []

      ;(mockPrismaClient.symbol.findMany as jest.Mock).mockResolvedValue(symbols)

      const result = await repository.findMany()

      expect(result).toEqual(symbols)
      expect(mockPrismaClient.symbol.findMany).toHaveBeenCalledWith({
        where: {},
        skip: undefined,
        take: undefined,
        orderBy: undefined,
      })
    })
  })

  describe('search', () => {
    it('should search symbols by query', async () => {
      const symbols = [
        {
          id: '1',
          symbol: 'AAPL',
          description: 'Apple Inc',
          displaySymbol: 'AAPL',
          type: 'Common Stock',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      ;(mockPrismaClient.symbol.findMany as jest.Mock).mockResolvedValue(symbols)

      const result = await repository.search('Apple', 25)

      expect(result).toEqual(symbols)
      expect(mockPrismaClient.symbol.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { symbol: { contains: 'Apple', mode: 'insensitive' } },
            { description: { contains: 'Apple', mode: 'insensitive' } },
            { displaySymbol: { contains: 'Apple', mode: 'insensitive' } },
          ],
        },
        take: 25,
        orderBy: [{ symbol: 'asc' }, { description: 'asc' }],
      })
    })
  })

  describe('update', () => {
    it('should update symbol successfully', async () => {
      const updateData = {
        description: 'Apple Inc. (Updated)',
      }

      const updatedSymbol = {
        id: '1',
        symbol: 'AAPL',
        description: 'Apple Inc. (Updated)',
        displaySymbol: 'AAPL',
        type: 'Common Stock',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrismaClient.symbol.update as jest.Mock).mockResolvedValue(updatedSymbol)

      const result = await repository.update('1', updateData)

      expect(result).toEqual(updatedSymbol)
      expect(mockPrismaClient.symbol.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      })
    })

    it('should throw NotFoundError when symbol not found', async () => {
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      }

      ;(mockPrismaClient.symbol.update as jest.Mock).mockRejectedValue(prismaError)

      await expect(repository.update('non-existent', {})).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('should delete symbol successfully', async () => {
      ;(mockPrismaClient.symbol.delete as jest.Mock).mockResolvedValue({})

      await repository.delete('1')

      expect(mockPrismaClient.symbol.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })

    it('should throw NotFoundError when symbol not found', async () => {
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      }

      ;(mockPrismaClient.symbol.delete as jest.Mock).mockRejectedValue(prismaError)

      await expect(repository.delete('non-existent')).rejects.toThrow(NotFoundError)
    })
  })

  describe('count', () => {
    it('should count symbols with filter', async () => {
      ;(mockPrismaClient.symbol.count as jest.Mock).mockResolvedValue(5)

      const result = await repository.count({ type: 'Common Stock' })

      expect(result).toBe(5)
      expect(mockPrismaClient.symbol.count).toHaveBeenCalledWith({
        where: {
          type: 'Common Stock',
        },
      })
    })
  })

  describe('upsertBySymbol', () => {
    it('should upsert symbol successfully', async () => {
      const upsertData = {
        symbol: 'AAPL',
        description: 'Apple Inc',
        displaySymbol: 'AAPL',
        type: 'Common Stock',
      }

      const upsertedSymbol = {
        id: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...upsertData,
      }

      ;(mockPrismaClient.symbol.upsert as jest.Mock).mockResolvedValue(upsertedSymbol)

      const result = await repository.upsertBySymbol(upsertData)

      expect(result).toEqual(upsertedSymbol)
      expect(mockPrismaClient.symbol.upsert).toHaveBeenCalledWith({
        where: { symbol: 'AAPL' },
        update: {
          description: 'Apple Inc',
          displaySymbol: 'AAPL',
          type: 'Common Stock',
        },
        create: upsertData,
      })
    })
  })
})
