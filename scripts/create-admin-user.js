const { PrismaClient } = require('../apps/server/node_modules/@prisma/client')
const bcrypt = require('../apps/server/node_modules/bcrypt')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@tradingviewer.com' },
    })

    if (existingUser) {
      console.log('Admin user already exists')
      return
    }

    // Hash password: Admin123!
    const passwordHash = await bcrypt.hash('Admin123!', 12)

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: 'admin@tradingviewer.com',
        passwordHash: passwordHash,
        name: 'Admin User',
        role: 'admin',
        isEmailVerified: true,
      },
    })

    console.log('Admin user created successfully:', user.email)
  } catch (error) {
    console.error('Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
