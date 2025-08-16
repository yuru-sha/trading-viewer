import { PrismaClient } from '@prisma/client/default'

declare global {
  var __prisma: PrismaClient | undefined
}

// PrismaClient インスタンスのシングルトン管理
const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma
}

export { prisma }

// データベース接続をテストする関数
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
  } catch (error) {
    console.error('❌ Failed to connect to database:', error)
    process.exit(1)
  }
}

// アプリケーション終了時のクリーンアップ
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('✅ Database disconnected successfully')
  } catch (error) {
    console.error('❌ Failed to disconnect from database:', error)
  }
}

// ヘルスチェック用の関数
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}
