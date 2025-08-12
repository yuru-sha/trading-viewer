import { securityLogger, SecurityEventType, SecuritySeverity } from './securityLogger'

// Rate limit store interface
export interface RateLimitStore {
  increment(key: string): Promise<{ count: number; ttl: number }>
  reset(key: string): Promise<void>
  get(key: string): Promise<{ count: number; ttl: number } | null>
  setWithExpiry(key: string, value: any, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
}

// In-memory fallback store
export class InMemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; expiresAt: Date }> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  private cleanup(): void {
    const now = new Date()
    for (const [key, value] of this.store.entries()) {
      if (value.expiresAt < now) {
        this.store.delete(key)
      }
    }
  }

  async increment(key: string): Promise<{ count: number; ttl: number }> {
    const now = new Date()
    const existing = this.store.get(key)

    if (existing && existing.expiresAt > now) {
      existing.count++
      const ttl = Math.floor((existing.expiresAt.getTime() - now.getTime()) / 1000)
      return { count: existing.count, ttl }
    }

    // Create new entry with 15 minute expiry
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)
    this.store.set(key, { count: 1, expiresAt })
    return { count: 1, ttl: 900 }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }

  async get(key: string): Promise<{ count: number; ttl: number } | null> {
    const now = new Date()
    const existing = this.store.get(key)

    if (!existing || existing.expiresAt <= now) {
      return null
    }

    const ttl = Math.floor((existing.expiresAt.getTime() - now.getTime()) / 1000)
    return { count: existing.count, ttl }
  }

  async setWithExpiry(key: string, value: any, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
    this.store.set(key, { count: value.count || 0, expiresAt })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// Redis store implementation (requires redis client)
export class RedisRateLimitStore implements RateLimitStore {
  private redisClient: any // In production, use proper Redis client type
  private prefix: string = 'ratelimit:'

  constructor(redisClient?: any) {
    if (!redisClient) {
      console.warn('Redis client not provided, using in-memory fallback')
      // In production, you would initialize Redis client here
      // this.redisClient = new Redis(process.env.REDIS_URL)
    } else {
      this.redisClient = redisClient
    }
  }

  async increment(key: string): Promise<{ count: number; ttl: number }> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const fullKey = this.prefix + key

    try {
      // Use Redis MULTI for atomic operations
      const pipeline = this.redisClient.multi()
      pipeline.incr(fullKey)
      pipeline.ttl(fullKey)

      const results = await pipeline.exec()
      const count = results[0][1]
      let ttl = results[1][1]

      // Set expiry if key is new
      if (ttl === -1) {
        ttl = 900 // 15 minutes
        await this.redisClient.expire(fullKey, ttl)
      }

      return { count, ttl }
    } catch (error) {
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.WARNING,
        message: 'Redis rate limit increment failed',
        metadata: { error: error.message, key },
      })
      throw error
    }
  }

  async reset(key: string): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const fullKey = this.prefix + key
    await this.redisClient.del(fullKey)
  }

  async get(key: string): Promise<{ count: number; ttl: number } | null> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const fullKey = this.prefix + key

    try {
      const pipeline = this.redisClient.multi()
      pipeline.get(fullKey)
      pipeline.ttl(fullKey)

      const results = await pipeline.exec()
      const count = parseInt(results[0][1] || '0', 10)
      const ttl = results[1][1]

      if (ttl <= 0) {
        return null
      }

      return { count, ttl }
    } catch (error) {
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.WARNING,
        message: 'Redis rate limit get failed',
        metadata: { error: error.message, key },
      })
      return null
    }
  }

  async setWithExpiry(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const fullKey = this.prefix + key
    await this.redisClient.setex(fullKey, ttlSeconds, JSON.stringify(value))
  }

  async delete(key: string): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const fullKey = this.prefix + key
    await this.redisClient.del(fullKey)
  }
}

// Enhanced rate limiter with persistent storage
export class EnhancedRateLimiter {
  private store: RateLimitStore
  private windowMs: number
  private maxAttempts: number
  private lockoutDuration: number

  constructor(
    store?: RateLimitStore,
    config?: {
      windowMs?: number
      maxAttempts?: number
      lockoutDuration?: number
    }
  ) {
    this.store = store || new InMemoryRateLimitStore()
    this.windowMs = config?.windowMs || 15 * 60 * 1000 // 15 minutes
    this.maxAttempts = config?.maxAttempts || 5
    this.lockoutDuration = config?.lockoutDuration || 30 * 60 * 1000 // 30 minutes
  }

  async checkLimit(identifier: string): Promise<{
    allowed: boolean
    remaining: number
    resetAt: Date
    retryAfter?: number
  }> {
    const lockoutKey = `lockout:${identifier}`
    const attemptKey = `attempt:${identifier}`

    // Check if account is locked
    const lockout = await this.store.get(lockoutKey)
    if (lockout) {
      const resetAt = new Date(Date.now() + lockout.ttl * 1000)
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: lockout.ttl,
      }
    }

    // Check attempts
    const attempts = await this.store.increment(attemptKey)
    const remaining = Math.max(0, this.maxAttempts - attempts.count)
    const resetAt = new Date(Date.now() + attempts.ttl * 1000)

    if (attempts.count > this.maxAttempts) {
      // Lock the account
      await this.store.setWithExpiry(
        lockoutKey,
        { locked: true, reason: 'Too many attempts' },
        Math.floor(this.lockoutDuration / 1000)
      )

      securityLogger.log({
        eventType: SecurityEventType.ACCOUNT_LOCKED,
        severity: SecuritySeverity.HIGH,
        message: `Account locked due to excessive attempts: ${identifier}`,
        metadata: { identifier, attempts: attempts.count },
      })

      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + this.lockoutDuration),
        retryAfter: Math.floor(this.lockoutDuration / 1000),
      }
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    }
  }

  async recordSuccess(identifier: string): Promise<void> {
    const attemptKey = `attempt:${identifier}`
    const lockoutKey = `lockout:${identifier}`

    await this.store.delete(attemptKey)
    await this.store.delete(lockoutKey)
  }

  async recordFailure(identifier: string): Promise<void> {
    // Increment is already done in checkLimit
    // This method is for additional logging or actions
    const attemptKey = `attempt:${identifier}`
    const attempts = await this.store.get(attemptKey)

    if (attempts && attempts.count >= this.maxAttempts - 1) {
      securityLogger.log({
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
        severity: SecuritySeverity.WARNING,
        message: `Rate limit approaching for ${identifier}`,
        metadata: { identifier, attempts: attempts.count },
      })
    }
  }

  async reset(identifier: string): Promise<void> {
    const attemptKey = `attempt:${identifier}`
    const lockoutKey = `lockout:${identifier}`

    await this.store.delete(attemptKey)
    await this.store.delete(lockoutKey)

    securityLogger.log({
      eventType: SecurityEventType.ACCOUNT_UNLOCKED,
      severity: SecuritySeverity.INFO,
      message: `Rate limit reset for ${identifier}`,
      metadata: { identifier },
    })
  }

  async getStatus(identifier: string): Promise<{
    attempts: number
    isLocked: boolean
    remainingTime: number
  }> {
    const attemptKey = `attempt:${identifier}`
    const lockoutKey = `lockout:${identifier}`

    const attempts = await this.store.get(attemptKey)
    const lockout = await this.store.get(lockoutKey)

    return {
      attempts: attempts?.count || 0,
      isLocked: !!lockout,
      remainingTime: lockout?.ttl || attempts?.ttl || 0,
    }
  }
}

// Export singleton instances
let rateLimitStore: RateLimitStore
let enhancedRateLimiter: EnhancedRateLimiter

// Initialize based on environment
if (process.env.REDIS_URL) {
  // In production with Redis
  console.log('🔴 Using Redis for rate limiting')
  // const redisClient = new Redis(process.env.REDIS_URL)
  // rateLimitStore = new RedisRateLimitStore(redisClient)
  rateLimitStore = new InMemoryRateLimitStore() // Fallback for now
} else {
  // Development or no Redis
  console.log('💾 Using in-memory store for rate limiting')
  rateLimitStore = new InMemoryRateLimitStore()
}

enhancedRateLimiter = new EnhancedRateLimiter(rateLimitStore, {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  maxAttempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '5'),
  lockoutDuration: parseInt(process.env.RATE_LIMIT_LOCKOUT_MS || '1800000'),
})

export { rateLimitStore, enhancedRateLimiter }
