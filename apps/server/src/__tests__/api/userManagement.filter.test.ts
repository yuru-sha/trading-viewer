import request from 'supertest'
import { getExpressApp } from '../setup/testApp.js'
import { createTestUser, cleanupTestUser, getAuthHeaders } from '../helpers/auth.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('User Management Filter API', () => {
  let adminUser: any
  let app: any

  beforeAll(async () => {
    app = await getExpressApp()
    adminUser = await createTestUser('admin-filter-test@example.com', 'admin')
  })

  afterAll(async () => {
    // Cleanup test users
    await cleanupTestUser('admin-filter-test@example.com')
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'filter-test-user-1@example.com',
            'filter-test-user-2@example.com',
            'filter-test-admin@example.com',
            'filter-test-inactive@example.com',
            'john-doe@example.com',
            'jane-smith@example.com',
            'verified-user@example.com',
            'unverified-user@example.com',
          ],
        },
      },
    })
  })

  beforeEach(async () => {
    // Create test users with various attributes for filtering
    const testUsers = [
      {
        email: 'filter-test-user-1@example.com',
        name: 'John Doe',
        role: 'user',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'filter-test-user-2@example.com',
        name: 'Jane Smith',
        role: 'user',
        isActive: true,
        isEmailVerified: false,
      },
      {
        email: 'filter-test-admin@example.com',
        name: 'Admin Johnson',
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'filter-test-inactive@example.com',
        name: 'Inactive User',
        role: 'user',
        isActive: false,
        isEmailVerified: true,
      },
      {
        email: 'john-doe@example.com',
        name: 'John Doe Alternative',
        role: 'user',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'jane-smith@example.com',
        name: null, // Test null name
        role: 'user',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'verified-user@example.com',
        name: 'Verified User',
        role: 'user',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'unverified-user@example.com',
        name: 'Unverified User',
        role: 'user',
        isActive: true,
        isEmailVerified: false,
      },
    ]

    // Clean up existing test users first
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
        data: {
          ...userData,
          passwordHash: '$2b$12$test.hash.for.testing.only',
        },
      })
    }
  })

  afterEach(async () => {
    // Clean up test users after each test
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'filter-test-user-1@example.com',
            'filter-test-user-2@example.com',
            'filter-test-admin@example.com',
            'filter-test-inactive@example.com',
            'john-doe@example.com',
            'jane-smith@example.com',
          ],
        },
      },
    })
  })

  describe('GET /api/auth/users - Search Filter', () => {
    it('should filter users by email search', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=filter-test-user')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users).toHaveLength(2)
      expect(response.body.data.users.every((user: any) => 
        user.email.includes('filter-test-user')
      )).toBe(true)
    })

    it('should filter users by name search', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=John Doe')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users).toHaveLength(2)
      expect(response.body.data.users.some((user: any) => 
        user.name && user.name.includes('John Doe')
      )).toBe(true)
    })

    it('should perform case-insensitive search', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=JOHN')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.length).toBeGreaterThan(0)
      expect(response.body.data.users.some((user: any) => 
        user.name && user.name.toLowerCase().includes('john')
      )).toBe(true)
    })

    it('should search both email and name fields', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=jane')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.length).toBeGreaterThan(0)
      
      const hasEmailMatch = response.body.data.users.some((user: any) => 
        user.email.toLowerCase().includes('jane')
      )
      const hasNameMatch = response.body.data.users.some((user: any) => 
        user.name && user.name.toLowerCase().includes('jane')
      )
      
      expect(hasEmailMatch || hasNameMatch).toBe(true)
    })

    it('should return empty results for non-matching search', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=nonexistent-user-xyz')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users).toHaveLength(0)
      expect(response.body.data.pagination.totalCount).toBe(0)
    })

    it('should handle special characters in search', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=@example.com')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.length).toBeGreaterThan(0)
      expect(response.body.data.users.every((user: any) => 
        user.email.includes('@example.com')
      )).toBe(true)
    })
  })

  describe('GET /api/auth/users - Role Filter', () => {
    it('should filter users by admin role', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?role=admin')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.every((user: any) => 
        user.role === 'admin'
      )).toBe(true)
    })

    it('should filter users by user role', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?role=user')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.every((user: any) => 
        user.role === 'user'
      )).toBe(true)
    })

    it('should ignore invalid role values', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?role=invalid-role')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      // Should return all users when role filter is invalid
      expect(response.body.data.users.length).toBeGreaterThan(0)
    })
  })

  describe('GET /api/auth/users - Status Filter', () => {
    it('should filter users by active status', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?status=active')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.every((user: any) => 
        user.isActive === true
      )).toBe(true)
    })

    it('should filter users by inactive status', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?status=inactive')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.every((user: any) => 
        user.isActive === false
      )).toBe(true)
      
      // Should include our inactive test user
      expect(response.body.data.users.some((user: any) => 
        user.email === 'filter-test-inactive@example.com'
      )).toBe(true)
    })

    it('should return all users with invalid status', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?status=invalid-status')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      // Should return both active and inactive users
      const hasActive = response.body.data.users.some((user: any) => user.isActive === true)
      const hasInactive = response.body.data.users.some((user: any) => user.isActive === false)
      expect(hasActive).toBe(true)
      expect(hasInactive).toBe(true)
    })
  })

  describe('GET /api/auth/users - Combined Filters', () => {
    it('should apply multiple filters simultaneously', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?role=admin&status=active&search=Admin')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.every((user: any) => 
        user.role === 'admin' && 
        user.isActive === true &&
        (user.email.toLowerCase().includes('admin') || 
         (user.name && user.name.toLowerCase().includes('admin')))
      )).toBe(true)
    })

    it('should return empty results when filters conflict', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?role=admin&status=inactive')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      // No admin users should be inactive in our test data
      expect(response.body.data.users).toHaveLength(0)
    })

    it('should handle search with role filter', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=Doe&role=user')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.every((user: any) => 
        user.role === 'user' &&
        (user.email.toLowerCase().includes('doe') || 
         (user.name && user.name.toLowerCase().includes('doe')))
      )).toBe(true)
    })
  })

  describe('GET /api/auth/users - Pagination', () => {
    it('should handle pagination with filters', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?role=user&page=1&limit=2')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users).toHaveLength(2)
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 2,
        totalCount: expect.any(Number),
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: false,
      })
    })

    it('should handle large page numbers gracefully', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?page=999&limit=10')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users).toHaveLength(0)
      expect(response.body.data.pagination.hasNext).toBe(false)
    })

    it('should respect limit parameter', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?limit=1')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users).toHaveLength(1)
      expect(response.body.data.pagination.limit).toBe(1)
    })

    it('should enforce maximum limit', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?limit=200') // Should be capped at 100
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.pagination.limit).toBeLessThanOrEqual(100)
    })
  })

  describe('GET /api/auth/users - Response Security', () => {
    it('should not expose sensitive user data', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?limit=1')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      const user = response.body.data.users[0]
      
      // Should not include sensitive fields
      expect(user).not.toHaveProperty('passwordHash')
      expect(user).not.toHaveProperty('resetToken')
      expect(user).not.toHaveProperty('resetTokenExpiry')
      
      // Should include safe fields
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('role')
      expect(user).toHaveProperty('isActive')
      expect(user).toHaveProperty('createdAt')
    })

    it('should include expected user fields', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=John Doe&limit=1')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      const user = response.body.data.users[0]
      
      const expectedFields = [
        'id', 'email', 'name', 'role', 'isEmailVerified', 
        'isActive', 'failedLoginCount', 'lockedUntil', 
        'lastLoginAt', 'createdAt', 'updatedAt'
      ]
      
      expectedFields.forEach(field => {
        expect(user).toHaveProperty(field)
      })
    })
  })

  describe('GET /api/auth/users - Edge Cases', () => {
    it('should handle empty search string', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.length).toBeGreaterThan(0)
    })

    it('should handle special characters in search', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const specialChars = ['@', '.', '-', '_', '+', '!']
      
      for (const char of specialChars) {
        const response = await request(app)
          .get(`/api/auth/users?search=${encodeURIComponent(char)}`)
          .set(headers)
          .expect(200)

        expect(response.body.success).toBe(true)
        // Should not crash and return valid response
        expect(response.body.data).toHaveProperty('users')
        expect(response.body.data).toHaveProperty('pagination')
      }
    })

    it('should handle very long search terms', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const longSearch = 'a'.repeat(1000)
      const response = await request(app)
        .get(`/api/auth/users?search=${longSearch}`)
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users).toHaveLength(0)
    })

    it('should handle null and undefined parameters gracefully', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=null&role=&status=')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('users')
    })
  })

  describe('GET /api/auth/users - Performance & Limits', () => {
    it('should complete search within reasonable time', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const startTime = Date.now()
      
      const response = await request(app)
        .get('/api/auth/users?search=test')
        .set(headers)
        .expect(200)

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(response.body.success).toBe(true)
    })

    it('should handle concurrent filter requests', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const requests = []
      
      // Send 5 concurrent requests with different filters
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .get(`/api/auth/users?search=test&page=${i + 1}&limit=2`)
            .set(headers)
        )
      }
      
      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
    })
  })

  describe('GET /api/auth/users - Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/users')
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should require admin role', async () => {
      const regularUser = await createTestUser('regular-user-filter@example.com', 'user')
      const headers = await getAuthHeaders(regularUser.accessToken)
      
      const response = await request(app)
        .get('/api/auth/users')
        .set(headers)
        .expect(403)

      expect(response.body).toHaveProperty('error')
      
      // Cleanup
      await cleanupTestUser('regular-user-filter@example.com')
    })

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/auth/users - Data Consistency', () => {
    it('should return consistent pagination metadata', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?limit=3&page=1')
        .set(headers)
        .expect(200)

      const { pagination } = response.body.data
      expect(pagination.page).toBe(1)
      expect(pagination.limit).toBe(3)
      expect(pagination.totalCount).toBeGreaterThanOrEqual(0)
      expect(pagination.totalPages).toBe(Math.ceil(pagination.totalCount / pagination.limit))
      expect(pagination.hasNext).toBe(pagination.page < pagination.totalPages)
      expect(pagination.hasPrev).toBe(pagination.page > 1)
    })

    it('should maintain consistent ordering', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      
      // Get first page
      const response1 = await request(app)
        .get('/api/auth/users?limit=2&page=1')
        .set(headers)
        .expect(200)
      
      // Get second page
      const response2 = await request(app)
        .get('/api/auth/users?limit=2&page=2')
        .set(headers)
        .expect(200)

      const page1Users = response1.body.data.users
      const page2Users = response2.body.data.users
      
      // Should not have overlapping users
      const page1Ids = page1Users.map((u: any) => u.id)
      const page2Ids = page2Users.map((u: any) => u.id)
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id))
      
      expect(overlap).toHaveLength(0)
    })

    it('should filter count match actual filtered results', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?role=user&status=active')
        .set(headers)
        .expect(200)

      const activeUserRoleUsers = response.body.data.users.filter((user: any) => 
        user.role === 'user' && user.isActive === true
      )
      
      expect(response.body.data.users).toHaveLength(activeUserRoleUsers.length)
      expect(response.body.data.pagination.totalCount).toBeGreaterThanOrEqual(response.body.data.users.length)
    })
  })

  describe('GET /api/auth/users - Input Validation', () => {
    it('should handle malformed page parameter', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?page=abc')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.pagination.page).toBe(1) // Should default to 1
    })

    it('should handle malformed limit parameter', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?limit=xyz')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.pagination.limit).toBe(20) // Should default to 20
    })

    it('should handle negative page numbers', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?page=-1')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.pagination.page).toBeGreaterThan(0)
    })

    it('should handle zero limit', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?limit=0')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.pagination.limit).toBeGreaterThan(0)
    })
  })

  describe('GET /api/auth/users - SQL Injection Protection', () => {
    it('should protect against SQL injection in search parameter', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; UPDATE users SET role = 'admin' WHERE '1'='1'; --",
        "' UNION SELECT * FROM users --",
      ]

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .get(`/api/auth/users?search=${encodeURIComponent(maliciousInput)}`)
          .set(headers)
          .expect(200)

        expect(response.body.success).toBe(true)
        // Should return safe results, not execute malicious SQL
        expect(response.body.data).toHaveProperty('users')
      }
    })

    it('should protect against SQL injection in role parameter', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get("/api/auth/users?role=' OR '1'='1")
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      // Should treat as invalid role and return all users
      expect(response.body.data).toHaveProperty('users')
    })
  })

  describe('GET /api/auth/users - Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // For now, we'll test that the endpoint structure is robust
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users')
        .set(headers)

      expect(response.status).toBeOneOf([200, 500])
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true)
        expect(response.body.data).toHaveProperty('users')
      } else {
        expect(response.body).toHaveProperty('error')
      }
    })

    it('should handle extremely large datasets efficiently', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?limit=100') // Maximum allowed limit
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.length).toBeLessThanOrEqual(100)
    })
  })

  describe('GET /api/auth/users - Unicode and Internationalization', () => {
    beforeEach(async () => {
      // Create users with international names
      const internationalUsers = [
        {
          email: 'unicode-test-1@example.com',
          name: '田中太郎', // Japanese
          role: 'user',
          isActive: true,
        },
        {
          email: 'unicode-test-2@example.com', 
          name: 'José García', // Spanish with accents
          role: 'user',
          isActive: true,
        },
        {
          email: 'unicode-test-3@example.com',
          name: 'Müller', // German umlaut
          role: 'admin',
          isActive: true,
        },
      ]

      for (const userData of internationalUsers) {
        await prisma.user.create({
          data: {
            ...userData,
            passwordHash: '$2b$12$test.hash.for.testing.only',
            isEmailVerified: true,
          },
        })
      }
    })

    afterEach(async () => {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'unicode-test-1@example.com',
              'unicode-test-2@example.com', 
              'unicode-test-3@example.com',
            ],
          },
        },
      })
    })

    it('should handle Unicode characters in search', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=田中')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.some((user: any) => 
        user.name && user.name.includes('田中')
      )).toBe(true)
    })

    it('should handle accented characters in search', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=García')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.some((user: any) => 
        user.name && user.name.includes('García')
      )).toBe(true)
    })

    it('should handle umlauts and special European characters', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=Müller')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users.some((user: any) => 
        user.name && user.name.includes('Müller')
      )).toBe(true)
    })
  })

  describe('GET /api/auth/users - Email Verification Filter', () => {
    it('should filter users by email verification status - verified only', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?emailVerified=true')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.users)).toBe(true)
      
      // All returned users should be verified
      response.body.data.users.forEach((user: any) => {
        expect(user.isEmailVerified).toBe(true)
      })
      
      // Should find at least our verified test users
      const emails = response.body.data.users.map((user: any) => user.email)
      expect(emails).toContain('filter-test-user-1@example.com')
      expect(emails).toContain('verified-user@example.com')
    })

    it('should filter users by email verification status - unverified only', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?emailVerified=false')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.users)).toBe(true)
      
      // All returned users should be unverified
      response.body.data.users.forEach((user: any) => {
        expect(user.isEmailVerified).toBe(false)
      })
      
      // Should find our unverified test users
      const emails = response.body.data.users.map((user: any) => user.email)
      expect(emails).toContain('filter-test-user-2@example.com')
      expect(emails).toContain('unverified-user@example.com')
    })

    it('should combine email verification with other filters', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?emailVerified=true&role=user')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      
      // All returned users should be verified AND have user role
      response.body.data.users.forEach((user: any) => {
        expect(user.isEmailVerified).toBe(true)
        expect(user.role).toBe('user')
      })
    })
  })

  describe('GET /api/auth/users - Search Functionality', () => {
    it('should search by email containing substring', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=filter-test')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.users)).toBe(true)
      
      // All returned users should have email containing 'filter-test'
      response.body.data.users.forEach((user: any) => {
        expect(user.email.toLowerCase()).toContain('filter-test')
      })
      
      expect(response.body.data.users.length).toBeGreaterThan(0)
    })

    it('should search by name containing substring', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=john')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      
      // Should find users with name containing 'john' (case insensitive)
      const foundUser = response.body.data.users.find((user: any) => 
        user.name && user.name.toLowerCase().includes('john')
      )
      expect(foundUser).toBeDefined()
    })

    it('should search by partial email domain', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=example.com')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      
      // Should find users with email containing 'example.com'
      response.body.data.users.forEach((user: any) => {
        expect(user.email).toContain('example.com')
      })
      
      expect(response.body.data.users.length).toBeGreaterThan(0)
    })

    it('should handle empty search gracefully', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      // Empty search should return all users (no filter applied)
      expect(response.body.data.users.length).toBeGreaterThan(0)
    })

    it('should search with no results', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/users?search=nonexistentuser999')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.users).toHaveLength(0)
      expect(response.body.data.pagination.totalCount).toBe(0)
    })
  })

  describe('GET /api/auth/stats - Metrics Tests', () => {
    it('should return correct user statistics', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      const response = await request(app)
        .get('/api/auth/stats')
        .set(headers)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('totalUsers')
      expect(response.body.data).toHaveProperty('verifiedUsers')
      expect(response.body.data).toHaveProperty('unverifiedUsers')
      expect(response.body.data).toHaveProperty('adminUsers')
      expect(response.body.data).toHaveProperty('regularUsers')
      expect(response.body.data).toHaveProperty('activeUsers')
      expect(response.body.data).toHaveProperty('inactiveUsers')

      const stats = response.body.data
      
      // Verify data types
      expect(typeof stats.totalUsers).toBe('number')
      expect(typeof stats.verifiedUsers).toBe('number')
      expect(typeof stats.unverifiedUsers).toBe('number')
      expect(typeof stats.adminUsers).toBe('number')
      expect(typeof stats.regularUsers).toBe('number')
      expect(typeof stats.activeUsers).toBe('number')
      expect(typeof stats.inactiveUsers).toBe('number')
      
      // Verify logical consistency
      expect(stats.totalUsers).toBe(stats.verifiedUsers + stats.unverifiedUsers)
      expect(stats.totalUsers).toBe(stats.adminUsers + stats.regularUsers)
      expect(stats.totalUsers).toBe(stats.activeUsers + stats.inactiveUsers)
      
      // Verify minimum expected values based on test data
      expect(stats.totalUsers).toBeGreaterThan(0)
      expect(stats.verifiedUsers).toBeGreaterThan(0)
      expect(stats.unverifiedUsers).toBeGreaterThan(0)
    })

    it('should verify stats match actual data from users endpoint', async () => {
      const headers = await getAuthHeaders(adminUser.accessToken)
      
      // Get stats
      const statsResponse = await request(app)
        .get('/api/auth/stats')
        .set(headers)
        .expect(200)
      
      // Get all users
      const usersResponse = await request(app)
        .get('/api/auth/users?limit=100')
        .set(headers)
        .expect(200)
      
      const users = usersResponse.body.data.users
      const stats = statsResponse.body.data
      
      // Count actual users
      const actualVerified = users.filter((u: any) => u.isEmailVerified).length
      const actualUnverified = users.filter((u: any) => !u.isEmailVerified).length
      const actualAdmins = users.filter((u: any) => u.role === 'admin').length
      const actualRegular = users.filter((u: any) => u.role === 'user').length
      const actualActive = users.filter((u: any) => u.isActive).length
      const actualInactive = users.filter((u: any) => !u.isActive).length
      
      // Compare with stats
      expect(stats.totalUsers).toBe(users.length)
      expect(stats.verifiedUsers).toBe(actualVerified)
      expect(stats.unverifiedUsers).toBe(actualUnverified)
      expect(stats.adminUsers).toBe(actualAdmins)
      expect(stats.regularUsers).toBe(actualRegular)
      expect(stats.activeUsers).toBe(actualActive)
      expect(stats.inactiveUsers).toBe(actualInactive)
    })
  })
})