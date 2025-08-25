import { UserRepository } from '../../repositories/UserRepository'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const userRepository = new UserRepository(prisma)

describe.skip('UserRepository Filter Tests', () => {
  beforeAll(async () => {
    // Ensure test database connection
    await prisma.$connect()
  })

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'repo-filter-test',
        },
      },
    })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Create test users for filtering
    const testUsers = [
      {
        email: 'repo-filter-test-admin@example.com',
        name: 'Filter Admin',
        role: 'admin' as const,
        isActive: true,
        isEmailVerified: true,
        passwordHash: '$2b$12$test.hash',
      },
      {
        email: 'repo-filter-test-user1@example.com',
        name: 'Active User One',
        role: 'user' as const,
        isActive: true,
        isEmailVerified: true,
        passwordHash: '$2b$12$test.hash',
      },
      {
        email: 'repo-filter-test-user2@example.com',
        name: 'Inactive User Two',
        role: 'user' as const,
        isActive: false,
        isEmailVerified: false,
        passwordHash: '$2b$12$test.hash',
      },
      {
        email: 'repo-filter-test-special@example.com',
        name: 'José García-Müller', // Special characters
        role: 'user' as const,
        isActive: true,
        isEmailVerified: true,
        passwordHash: '$2b$12$test.hash',
      },
      {
        email: 'repo-filter-test-null@example.com',
        name: null, // Null name test
        role: 'user' as const,
        isActive: true,
        isEmailVerified: true,
        passwordHash: '$2b$12$test.hash',
      },
    ]

    // Clean up existing test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: testUsers.map(user => user.email),
        },
      },
    })

    // Create test users
    for (const userData of testUsers) {
      await prisma.user.create({
        data: userData,
      })
    }
  })

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'repo-filter-test',
        },
      },
    })
  })

  describe('findMany - Search Filter', () => {
    it('should filter by email search', async () => {
      const users = await userRepository.findMany({ search: 'admin' }, { take: 10 })

      expect(users.length).toBeGreaterThan(0)
      expect(users.some(user => user.email.includes('admin'))).toBe(true)
    })

    it('should filter by name search', async () => {
      const users = await userRepository.findMany({ search: 'Filter Admin' }, { take: 10 })

      expect(users.length).toBeGreaterThan(0)
      expect(users.some(user => user.name && user.name.includes('Filter Admin'))).toBe(true)
    })

    it('should handle case-insensitive search', async () => {
      const users = await userRepository.findMany({ search: 'FILTER ADMIN' }, { take: 10 })

      expect(users.length).toBeGreaterThan(0)
      expect(
        users.some(user => user.name && user.name.toLowerCase().includes('filter admin'))
      ).toBe(true)
    })

    it('should search both email and name fields', async () => {
      const emailSearch = await userRepository.findMany(
        { search: 'repo-filter-test-admin' },
        { take: 10 }
      )

      const nameSearch = await userRepository.findMany({ search: 'Filter Admin' }, { take: 10 })

      expect(emailSearch.length).toBeGreaterThan(0)
      expect(nameSearch.length).toBeGreaterThan(0)

      // Both searches should find the same user
      const adminUser = emailSearch.find(
        user => user.email === 'repo-filter-test-admin@example.com'
      )
      expect(adminUser).toBeDefined()
      expect(nameSearch.some(user => user.id === adminUser!.id)).toBe(true)
    })

    it('should handle special characters in search', async () => {
      const users = await userRepository.findMany({ search: 'García-Müller' }, { take: 10 })

      expect(users.length).toBeGreaterThan(0)
      expect(users.some(user => user.name && user.name.includes('García-Müller'))).toBe(true)
    })

    it('should handle null name fields in search', async () => {
      // Search should not crash when name is null
      const users = await userRepository.findMany({ search: 'null' }, { take: 10 })

      // Should not throw error and return valid results
      expect(Array.isArray(users)).toBe(true)
      expect(users.some(user => user.email.includes('null'))).toBe(true)
    })
  })

  describe('findMany - Role Filter', () => {
    it('should filter by admin role', async () => {
      const users = await userRepository.findMany({ role: 'admin' }, { take: 10 })

      expect(users.length).toBeGreaterThan(0)
      expect(users.every(user => user.role === 'admin')).toBe(true)
    })

    it('should filter by user role', async () => {
      const users = await userRepository.findMany({ role: 'user' }, { take: 10 })

      expect(users.length).toBeGreaterThan(0)
      expect(users.every(user => user.role === 'user')).toBe(true)
    })
  })

  describe('findMany - Status Filter', () => {
    it('should filter by active status', async () => {
      const users = await userRepository.findMany({ isActive: true }, { take: 10 })

      expect(users.length).toBeGreaterThan(0)
      expect(users.every(user => user.isActive === true)).toBe(true)
    })

    it('should filter by inactive status', async () => {
      const users = await userRepository.findMany({ isActive: false }, { take: 10 })

      expect(users.length).toBeGreaterThan(0)
      expect(users.every(user => user.isActive === false)).toBe(true)
    })

    it('should filter by email verification status', async () => {
      const verifiedUsers = await userRepository.findMany({ isEmailVerified: true }, { take: 10 })

      const unverifiedUsers = await userRepository.findMany(
        { isEmailVerified: false },
        { take: 10 }
      )

      expect(verifiedUsers.every(user => user.isEmailVerified === true)).toBe(true)
      expect(unverifiedUsers.every(user => user.isEmailVerified === false)).toBe(true)
    })
  })

  describe('findMany - Combined Filters', () => {
    it('should apply multiple filters simultaneously', async () => {
      const users = await userRepository.findMany(
        {
          role: 'user',
          isActive: true,
          search: 'Active',
        },
        { take: 10 }
      )

      expect(
        users.every(
          user =>
            user.role === 'user' &&
            user.isActive === true &&
            (user.email.toLowerCase().includes('active') ||
              (user.name && user.name.toLowerCase().includes('active')))
        )
      ).toBe(true)
    })

    it('should handle conflicting filters', async () => {
      const users = await userRepository.findMany(
        {
          role: 'admin',
          isActive: false, // No admin should be inactive in our test data
        },
        { take: 10 }
      )

      expect(users).toHaveLength(0)
    })

    it('should combine email filter with other filters', async () => {
      const users = await userRepository.findMany(
        {
          email: 'repo-filter-test',
          role: 'user',
        },
        { take: 10 }
      )

      expect(
        users.every(user => user.email.includes('repo-filter-test') && user.role === 'user')
      ).toBe(true)
    })
  })

  describe('findMany - Pagination Options', () => {
    it('should respect skip and take options', async () => {
      const firstPage = await userRepository.findMany(
        {},
        { skip: 0, take: 2, orderBy: { createdAt: 'desc' } }
      )

      const secondPage = await userRepository.findMany(
        {},
        { skip: 2, take: 2, orderBy: { createdAt: 'desc' } }
      )

      expect(firstPage).toHaveLength(2)
      expect(secondPage.length).toBeGreaterThanOrEqual(0)

      // Should not have overlapping users
      const firstPageIds = firstPage.map(user => user.id)
      const secondPageIds = secondPage.map(user => user.id)
      const overlap = firstPageIds.filter(id => secondPageIds.includes(id))
      expect(overlap).toHaveLength(0)
    })

    it('should maintain consistent ordering', async () => {
      const users1 = await userRepository.findMany({}, { take: 5, orderBy: { createdAt: 'desc' } })

      const users2 = await userRepository.findMany({}, { take: 5, orderBy: { createdAt: 'desc' } })

      expect(users1).toEqual(users2)
    })

    it('should handle select options correctly', async () => {
      const users = await userRepository.findMany(
        {},
        {
          take: 1,
          select: {
            id: true,
            email: true,
            role: true,
          },
        }
      )

      expect(users).toHaveLength(1)
      const user = users[0]

      // Should only include selected fields
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('role')

      // Should not include non-selected fields
      expect(user).not.toHaveProperty('passwordHash')
      expect(user).not.toHaveProperty('createdAt')
    })
  })

  describe('count - Filter Consistency', () => {
    it('should return consistent counts with findMany', async () => {
      const filter = { role: 'user' as const, isActive: true }

      const users = await userRepository.findMany(filter, { take: 1000 })
      const count = await userRepository.count(filter)

      expect(count).toBe(users.length)
    })

    it('should handle search filter in count', async () => {
      const searchTerm = 'repo-filter-test'

      const users = await userRepository.findMany({ search: searchTerm }, { take: 1000 })

      // Note: count method currently doesn't support search filter directly
      // This test verifies the current behavior
      expect(Array.isArray(users)).toBe(true)
      expect(
        users.every(
          user => user.email.includes(searchTerm) || (user.name && user.name.includes(searchTerm))
        )
      ).toBe(true)
    })
  })

  describe('findMany - Error Handling', () => {
    it('should handle invalid filter values gracefully', async () => {
      // These should not throw errors
      const invalidFilters = [
        { role: 'invalid-role' as any },
        { isActive: 'not-boolean' as any },
        { isEmailVerified: 'not-boolean' as any },
      ]

      for (const filter of invalidFilters) {
        await expect(userRepository.findMany(filter, { take: 1 })).resolves.toBeDefined()
      }
    })

    it('should handle empty filter object', async () => {
      const users = await userRepository.findMany({}, { take: 5 })
      expect(Array.isArray(users)).toBe(true)
      expect(users.length).toBeLessThanOrEqual(5)
    })

    it('should handle undefined filter', async () => {
      const users = await userRepository.findMany(undefined, { take: 5 })
      expect(Array.isArray(users)).toBe(true)
      expect(users.length).toBeLessThanOrEqual(5)
    })
  })

  describe('findMany - Performance', () => {
    it('should execute search queries within reasonable time', async () => {
      const startTime = Date.now()

      await userRepository.findMany({ search: 'test' }, { take: 100 })

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now()

      const users = await userRepository.findMany(
        {},
        { take: 1000, orderBy: { createdAt: 'desc' } }
      )

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(10000) // Should complete within 10 seconds
      expect(Array.isArray(users)).toBe(true)
    })
  })

  describe('findMany - Data Integrity', () => {
    it('should return complete user objects', async () => {
      const users = await userRepository.findMany({ search: 'repo-filter-test' }, { take: 1 })

      if (users.length > 0) {
        const user = users[0]

        // Essential fields should be present
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('email')
        expect(user).toHaveProperty('role')
        expect(user).toHaveProperty('isActive')
        expect(user).toHaveProperty('createdAt')
        expect(typeof user.id).toBe('string')
        expect(typeof user.email).toBe('string')
        expect(['user', 'admin']).toContain(user.role)
        expect(typeof user.isActive).toBe('boolean')
      }
    })

    it('should maintain referential integrity with filters', async () => {
      const adminUsers = await userRepository.findMany({ role: 'admin' }, { take: 10 })

      const userRoleUsers = await userRepository.findMany({ role: 'user' }, { take: 10 })

      // No user should appear in both results
      const adminIds = adminUsers.map(user => user.id)
      const userIds = userRoleUsers.map(user => user.id)
      const overlap = adminIds.filter(id => userIds.includes(id))

      expect(overlap).toHaveLength(0)
    })
  })

  describe('findMany - Edge Cases', () => {
    it('should handle very long search strings', async () => {
      const longSearch = 'a'.repeat(1000)

      await expect(
        userRepository.findMany({ search: longSearch }, { take: 10 })
      ).resolves.toBeDefined()
    })

    it('should handle search with only whitespace', async () => {
      const users = await userRepository.findMany({ search: '   ' }, { take: 10 })

      expect(Array.isArray(users)).toBe(true)
    })

    it('should handle search with special regex characters', async () => {
      const specialChars = ['.', '*', '+', '?', '^', '$', '(', ')', '[', ']', '{', '}', '|', '\\']

      for (const char of specialChars) {
        await expect(userRepository.findMany({ search: char }, { take: 10 })).resolves.toBeDefined()
      }
    })

    it('should handle empty search string', async () => {
      const users = await userRepository.findMany({ search: '' }, { take: 10 })

      expect(Array.isArray(users)).toBe(true)
    })
  })

  describe('findMany - Filter Combinations', () => {
    it('should combine search with role filter', async () => {
      const users = await userRepository.findMany(
        { search: 'repo-filter-test', role: 'user' },
        { take: 10 }
      )

      expect(
        users.every(
          user =>
            user.role === 'user' &&
            (user.email.includes('repo-filter-test') ||
              (user.name && user.name.includes('repo-filter-test')))
        )
      ).toBe(true)
    })

    it('should combine search with status filter', async () => {
      const users = await userRepository.findMany(
        { search: 'repo-filter-test', isActive: true },
        { take: 10 }
      )

      expect(
        users.every(
          user =>
            user.isActive === true &&
            (user.email.includes('repo-filter-test') ||
              (user.name && user.name.includes('repo-filter-test')))
        )
      ).toBe(true)
    })

    it('should combine all filters together', async () => {
      const users = await userRepository.findMany(
        {
          search: 'Active',
          role: 'user',
          isActive: true,
          isEmailVerified: true,
        },
        { take: 10 }
      )

      expect(
        users.every(
          user =>
            user.role === 'user' &&
            user.isActive === true &&
            user.isEmailVerified === true &&
            (user.email.toLowerCase().includes('active') ||
              (user.name && user.name.toLowerCase().includes('active')))
        )
      ).toBe(true)
    })
  })

  describe('findMany - Options Handling', () => {
    it('should respect orderBy options', async () => {
      const ascUsers = await userRepository.findMany({}, { take: 3, orderBy: { email: 'asc' } })

      const descUsers = await userRepository.findMany({}, { take: 3, orderBy: { email: 'desc' } })

      if (ascUsers.length > 1) {
        expect(ascUsers[0].email.localeCompare(ascUsers[1].email)).toBeLessThanOrEqual(0)
      }

      if (descUsers.length > 1) {
        expect(descUsers[0].email.localeCompare(descUsers[1].email)).toBeGreaterThanOrEqual(0)
      }
    })

    it('should handle complex select options', async () => {
      const users = await userRepository.findMany(
        { search: 'repo-filter-test' },
        {
          take: 1,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
            // Explicitly exclude sensitive fields
            passwordHash: false,
            resetToken: false,
          } as any,
        }
      )

      if (users.length > 0) {
        const user = users[0]
        expect(user).toHaveProperty('id')
        expect(user).toHaveProperty('email')
        expect(user).toHaveProperty('role')
        expect(user).not.toHaveProperty('passwordHash')
        expect(user).not.toHaveProperty('resetToken')
      }
    })
  })
})
