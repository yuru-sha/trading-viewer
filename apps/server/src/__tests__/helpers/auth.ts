import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../../middleware/auth.js'

const prisma = new PrismaClient()

export interface TestUser {
  id: string
  email: string
  role: 'user' | 'admin'
  accessToken: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'

export async function createTestUser(
  email: string = 'test@example.com',
  role: 'user' | 'admin' = 'user'
): Promise<TestUser> {
  // Clean up existing test user
  await prisma.user.deleteMany({
    where: { email },
  })

  // Create new test user
  const hashedPassword = await hashPassword('testpassword123')
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      role,
      isEmailVerified: true,
    },
  })

  // Generate access token
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    accessToken,
  }
}

export async function cleanupTestUser(email: string = 'test@example.com'): Promise<void> {
  await prisma.user.deleteMany({
    where: { email },
  })
}

export async function getAuthHeaders(
  accessToken: string,
  includeCsrf: boolean = false
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  if (includeCsrf) {
    // Generate and add CSRF token for write operations
    const { generateCSRFToken } = await import('../../middleware/auth.js')
    const decoded = jwt.decode(accessToken) as any
    const csrfToken = await generateCSRFToken(decoded.userId)
    headers['x-csrf-token'] = csrfToken
  }

  return headers
}
