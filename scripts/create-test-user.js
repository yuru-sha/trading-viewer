const { PrismaClient } = require('../apps/server/node_modules/@prisma/client')
const bcrypt = require('../apps/server/node_modules/bcrypt')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })

    if (existingUser) {
      console.log('Test user already exists')
      return
    }

    // Hash password
    const passwordHash = await bcrypt.hash('password123', 12)

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password_hash: passwordHash,
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_email_verified: true
      }
    })

    console.log('Test user created successfully:', user.email)
  } catch (error) {
    console.error('Error creating test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()