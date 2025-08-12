/**
 * Data management service interface - handles cross-cutting data operations
 * Follows Single Responsibility Principle for general data management tasks
 */

export interface DataStats {
  symbolsInDatabase: number
  candlesInDatabase: number
  userPreferencesCount: number
  cacheStats: {
    symbolsCount: number
    quotesCount: number
    candleDataCount: number
    memoryUsage?: number
  }
}

export interface IDataManagementService {
  /**
   * Invalidate cache for specific symbol or all data
   * @param symbol - Symbol identifier (optional, invalidates all if not provided)
   */
  invalidateCache(symbol?: string): Promise<void>

  /**
   * Get comprehensive data statistics
   * @returns Data statistics object
   */
  getDataStats(): Promise<DataStats>

  /**
   * Perform data cleanup and optimization
   * @returns Number of records affected
   */
  performDataCleanup(): Promise<number>

  /**
   * Get system health metrics
   * @returns Health status object
   */
  getHealthMetrics(): Promise<{
    database: 'healthy' | 'degraded' | 'unhealthy'
    cache: 'healthy' | 'degraded' | 'unhealthy'
    externalApi: 'healthy' | 'degraded' | 'unhealthy'
    overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  }>

  /**
   * Backup critical data
   * @returns Backup status and metadata
   */
  backupData(): Promise<{
    success: boolean
    backupId: string
    timestamp: number
    size: number
  }>

  /**
   * Restore data from backup
   * @param backupId - Backup identifier
   * @returns Restore status
   */
  restoreData(backupId: string): Promise<{
    success: boolean
    recordsRestored: number
  }>
}