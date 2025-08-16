/**
 * インフラストラクチャ層: インメモリキャッシュ実装
 * 市場データ専用のキャッシュレイヤー
 */

import { IMarketDataCache } from '../../domain/interfaces/IMarketDataService'
import { MarketDataEntity } from '../../domain/entities/MarketData'

interface CacheEntry {
  data: any
  expiresAt: number
  createdAt: number
}

export class InMemoryMarketDataCache implements IMarketDataCache {
  private cache = new Map<string, CacheEntry>()
  private defaultTTL = 300 // 5 分
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // 期限切れエントリの定期クリーンアップ（5 分間隔）
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000
    )
  }

  async get(key: string): Promise<MarketDataEntity | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    // MarketDataEntity の場合は復元、それ以外は元のデータを返す
    if (this.isMarketDataEntry(entry.data)) {
      return this.deserializeMarketData(entry.data)
    }

    return entry.data
  }

  async set(key: string, data: MarketDataEntity, ttlInSeconds?: number): Promise<void> {
    const ttl = (ttlInSeconds || this.defaultTTL) * 1000
    const now = Date.now()

    const entry: CacheEntry = {
      data: this.isMarketDataEntity(data) ? this.serializeMarketData(data) : data,
      expiresAt: now + ttl,
      createdAt: now,
    }

    this.cache.set(key, entry)
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = Array.from(this.cache.keys())
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))

    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // ヘルスチェック: 簡単な読み書きテスト
      const testKey = '__health_check__'
      const testData = new MarketDataEntity(
        'TEST',
        { open: 100, high: 100, low: 100, close: 100, volume: 0, timestamp: Date.now() },
        { source: 'test', reliability: 1, updatedAt: new Date() }
      )

      await this.set(testKey, testData, 1)
      const retrieved = await this.get(testKey)

      return retrieved !== null
    } catch (error) {
      return false
    }
  }

  // 統計情報を取得
  getStats(): {
    totalEntries: number
    expiredEntries: number
    memoryUsage: string
    hitRate?: number
  } {
    const now = Date.now()
    let expiredCount = 0

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    }
  }

  // クリーンアップを手動実行
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
    }
  }

  // リソースクリーンアップ
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.cache.clear()
  }

  private isMarketDataEntity(data: any): data is MarketDataEntity {
    return (
      data &&
      typeof data === 'object' &&
      'symbol' in data &&
      'priceData' in data &&
      'metadata' in data
    )
  }

  private isMarketDataEntry(data: any): boolean {
    return (
      data && typeof data === 'object' && '__type' in data && data.__type === 'MarketDataEntity'
    )
  }

  private serializeMarketData(entity: MarketDataEntity): any {
    return {
      __type: 'MarketDataEntity',
      symbol: entity.symbol,
      priceData: entity.priceData,
      metadata: {
        ...entity.metadata,
        updatedAt: entity.metadata.updatedAt.toISOString(),
      },
    }
  }

  private deserializeMarketData(data: any): MarketDataEntity {
    return new MarketDataEntity(data.symbol, data.priceData, {
      ...data.metadata,
      updatedAt: new Date(data.metadata.updatedAt),
    })
  }
}

export const createInMemoryMarketDataCache = (): InMemoryMarketDataCache => {
  return new InMemoryMarketDataCache()
}
