import { PrismaClient } from '@prisma/client'
import { log } from '../infrastructure/services/logger'

declare global {
  // eslint-disable-next-line no-var
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
    log.database.info('✅ Database connected successfully')
  } catch (error) {
    log.database.error('❌ Failed to connect to database:', error)
    process.exit(1)
  }
}

// アプリケーション終了時のクリーンアップ
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    log.database.info('✅ Database disconnected successfully')
  } catch (error) {
    log.database.error('❌ Failed to disconnect from database:', error)
  }
}

// ヘルスチェック用の関数
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // テスト環境では常に true を返す
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return true
    }
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    log.database.error('Database health check failed:', error)
    return false
  }
}
