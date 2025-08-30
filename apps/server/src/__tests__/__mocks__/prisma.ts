import { vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>()

// Mock the PrismaClient constructor
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => prismaMock),
}))

// Helper to reset all mocks
export const resetPrismaMock = () => {
  mockReset(prismaMock)
}

// Type for the mocked client
export type PrismaMockType = DeepMockProxy<PrismaClient>
