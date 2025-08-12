import { prisma } from '../lib/database'

/**
 * Drawing Tools Cleanup Service
 * 
 * Manages automatic cleanup of expired drawing tools to prevent
 * unlimited database growth.
 */
export class DrawingCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly DEFAULT_EXPIRY_DAYS = 30
  private readonly INACTIVE_EXPIRY_DAYS = 7 // Delete if not accessed for 7 days
  private readonly CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // Run daily

  /**
   * Start the automatic cleanup scheduler
   */
  start() {
    if (this.cleanupInterval) {
      console.log('⚠️ Drawing cleanup service is already running')
      return
    }

    console.log('🧹 Starting drawing tools cleanup service')
    
    // Run initial cleanup
    this.runCleanup().catch(error => {
      console.error('❌ Initial cleanup failed:', error)
    })

    // Schedule regular cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup().catch(error => {
        console.error('❌ Scheduled cleanup failed:', error)
      })
    }, this.CLEANUP_INTERVAL_MS)

    console.log('✅ Drawing cleanup service started - runs every 24 hours')
  }

  /**
   * Stop the automatic cleanup scheduler
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('🛑 Drawing cleanup service stopped')
    }
  }

  /**
   * Run the cleanup process manually
   */
  async runCleanup(): Promise<{
    expiredCount: number
    inactiveCount: number
    totalDeleted: number
  }> {
    console.log('🧹 Running drawing tools cleanup...')
    
    try {
      const now = new Date()
      
      // 1. Delete explicitly expired drawings
      const expiredResult = await prisma.drawingTool.deleteMany({
        where: {
          expiresAt: {
            not: null,
            lte: now
          }
        }
      })

      // 2. Delete drawings that haven't been accessed for too long
      const inactiveThreshold = new Date(now.getTime() - (this.INACTIVE_EXPIRY_DAYS * 24 * 60 * 60 * 1000))
      const inactiveResult = await prisma.drawingTool.deleteMany({
        where: {
          lastAccessedAt: {
            lte: inactiveThreshold
          },
          // Don't delete locked drawings
          locked: false
        }
      })

      const totalDeleted = expiredResult.count + inactiveResult.count

      if (totalDeleted > 0) {
        console.log(`✅ Cleanup completed:`, {
          expired: expiredResult.count,
          inactive: inactiveResult.count,
          total: totalDeleted
        })
      } else {
        console.log('✅ Cleanup completed - no drawings to delete')
      }

      return {
        expiredCount: expiredResult.count,
        inactiveCount: inactiveResult.count,
        totalDeleted
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error)
      throw error
    }
  }

  /**
   * Set expiration date for a drawing tool
   */
  async setExpiration(toolId: string, days: number = this.DEFAULT_EXPIRY_DAYS): Promise<void> {
    const expiresAt = new Date(Date.now() + (days * 24 * 60 * 60 * 1000))
    
    await prisma.drawingTool.update({
      where: { id: toolId },
      data: { expiresAt }
    })

    console.log(`⏰ Set expiration for tool ${toolId}: ${expiresAt.toISOString()}`)
  }

  /**
   * Remove expiration date (make permanent)
   */
  async makePermament(toolId: string): Promise<void> {
    await prisma.drawingTool.update({
      where: { id: toolId },
      data: { expiresAt: null }
    })

    console.log(`♾️ Made tool ${toolId} permanent`)
  }

  /**
   * Update last accessed timestamp
   */
  async updateLastAccessed(toolId: string): Promise<void> {
    await prisma.drawingTool.update({
      where: { id: toolId },
      data: { lastAccessedAt: new Date() }
    })
  }

  /**
   * Get cleanup statistics
   */
  async getStatistics(): Promise<{
    total: number
    expiringSoon: number // Expiring within 7 days
    expired: number
    inactive: number
  }> {
    const now = new Date()
    const soonThreshold = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))
    const inactiveThreshold = new Date(now.getTime() - (this.INACTIVE_EXPIRY_DAYS * 24 * 60 * 60 * 1000))

    const [total, expiringSoon, expired, inactive] = await Promise.all([
      prisma.drawingTool.count(),
      prisma.drawingTool.count({
        where: {
          expiresAt: {
            not: null,
            lte: soonThreshold,
            gt: now
          }
        }
      }),
      prisma.drawingTool.count({
        where: {
          expiresAt: {
            not: null,
            lte: now
          }
        }
      }),
      prisma.drawingTool.count({
        where: {
          lastAccessedAt: {
            lte: inactiveThreshold
          },
          locked: false
        }
      })
    ])

    return { total, expiringSoon, expired, inactive }
  }
}

// Singleton instance
let cleanupService: DrawingCleanupService | null = null

export const getDrawingCleanupService = (): DrawingCleanupService => {
  if (!cleanupService) {
    cleanupService = new DrawingCleanupService()
  }
  return cleanupService
}

export default DrawingCleanupService