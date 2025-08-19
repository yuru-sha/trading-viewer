import { RedisManager, isRedisConnected } from '../lib/redis.js'
import { logInfo, logWarn, logError } from '../utils/logger.js'

// Token store prefixes
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:'
const REFRESH_TOKEN_PREFIX = 'token:refresh:'
const CSRF_TOKEN_PREFIX = 'token:csrf:'
const RATE_LIMIT_PREFIX = 'rate_limit:auth:'

// In-memory fallback stores for development
const memoryTokenBlacklist = new Set<string>()
const memoryRefreshTokenStore = new Map<string, { userId: string; version: number; createdAt: Date }>()
const memoryCsrfTokenStore = new Map<string, { userId: string; expiresAt: Date }>()
const memoryRateLimitStore = new Map<string, { count: number; lastAttempt: Date }>()

/**
 * Token Blacklist Management
 */
export class TokenBlacklist {
  /**
   * Add a token to the blacklist
   */
  static async add(jti: string, expirationSeconds?: number): Promise<boolean> {
    const key = TOKEN_BLACKLIST_PREFIX + jti
    
    if (isRedisConnected()) {
      const success = await RedisManager.set(key, 'true', expirationSeconds)
      if (success) {
        logInfo('Token blacklisted', { jti, storage: 'redis' })
        return true
      }
    }
    
    // Fallback to memory
    memoryTokenBlacklist.add(jti)
    logWarn('Token blacklisted in memory (Redis unavailable)', { jti })
    
    // Clean up memory periodically if using fallback
    if (memoryTokenBlacklist.size > 10000) {
      logWarn('Memory token blacklist size limit reached, clearing old tokens')
      memoryTokenBlacklist.clear()
    }
    
    return true
  }

  /**
   * Check if a token is blacklisted
   */
  static async isBlacklisted(jti: string): Promise<boolean> {
    const key = TOKEN_BLACKLIST_PREFIX + jti
    
    if (isRedisConnected()) {
      const exists = await RedisManager.exists(key)
      return exists
    }
    
    // Fallback to memory
    return memoryTokenBlacklist.has(jti)
  }

  /**
   * Remove a token from blacklist (if needed for testing)
   */
  static async remove(jti: string): Promise<boolean> {
    const key = TOKEN_BLACKLIST_PREFIX + jti
    
    if (isRedisConnected()) {
      return await RedisManager.del(key)
    }
    
    // Fallback to memory
    return memoryTokenBlacklist.delete(jti)
  }

  /**
   * Clear all blacklisted tokens (admin function)
   */
  static async clear(): Promise<boolean> {
    if (isRedisConnected()) {
      const keys = await RedisManager.keys(TOKEN_BLACKLIST_PREFIX + '*')
      if (keys.length > 0) {
        for (const key of keys) {
          await RedisManager.del(key)
        }
        logInfo('All blacklisted tokens cleared from Redis', { count: keys.length })
      }
      return true
    }
    
    // Fallback to memory
    memoryTokenBlacklist.clear()
    logInfo('All blacklisted tokens cleared from memory')
    return true
  }
}

/**
 * Refresh Token Store Management
 */
export interface RefreshTokenData {
  userId: string
  version: number
  createdAt: Date
}

export class RefreshTokenStore {
  /**
   * Store refresh token data
   */
  static async set(tokenId: string, data: RefreshTokenData, expirationSeconds?: number): Promise<boolean> {
    const key = REFRESH_TOKEN_PREFIX + tokenId
    const value = JSON.stringify({
      ...data,
      createdAt: data.createdAt.toISOString(),
    })
    
    if (isRedisConnected()) {
      const success = await RedisManager.set(key, value, expirationSeconds)
      if (success) {
        logInfo('Refresh token stored', { tokenId, userId: data.userId, storage: 'redis' })
        return true
      }
    }
    
    // Fallback to memory
    memoryRefreshTokenStore.set(tokenId, data)
    logWarn('Refresh token stored in memory (Redis unavailable)', { tokenId, userId: data.userId })
    return true
  }

  /**
   * Get refresh token data
   */
  static async get(tokenId: string): Promise<RefreshTokenData | null> {
    const key = REFRESH_TOKEN_PREFIX + tokenId
    
    if (isRedisConnected()) {
      const value = await RedisManager.get(key)
      if (value) {
        try {
          const parsed = JSON.parse(value)
          return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
          }
        } catch (error) {
          logError('Failed to parse refresh token data from Redis', error as Error, { tokenId })
        }
      }
      return null
    }
    
    // Fallback to memory
    return memoryRefreshTokenStore.get(tokenId) || null
  }

  /**
   * Remove refresh token
   */
  static async remove(tokenId: string): Promise<boolean> {
    const key = REFRESH_TOKEN_PREFIX + tokenId
    
    if (isRedisConnected()) {
      const success = await RedisManager.del(key)
      if (success) {
        logInfo('Refresh token removed', { tokenId, storage: 'redis' })
      }
      return success
    }
    
    // Fallback to memory
    const existed = memoryRefreshTokenStore.delete(tokenId)
    if (existed) {
      logInfo('Refresh token removed from memory', { tokenId })
    }
    return existed
  }

  /**
   * Remove all refresh tokens for a user
   */
  static async removeAllForUser(userId: string): Promise<number> {
    let removedCount = 0
    
    if (isRedisConnected()) {
      const keys = await RedisManager.keys(REFRESH_TOKEN_PREFIX + '*')
      
      for (const key of keys) {
        const value = await RedisManager.get(key)
        if (value) {
          try {
            const data = JSON.parse(value)
            if (data.userId === userId) {
              await RedisManager.del(key)
              removedCount++
            }
          } catch (error) {
            logWarn('Failed to parse refresh token during cleanup', { key })
          }
        }
      }
      
      if (removedCount > 0) {
        logInfo('Removed refresh tokens for user', { userId, count: removedCount, storage: 'redis' })
      }
    } else {
      // Fallback to memory
      for (const [tokenId, data] of memoryRefreshTokenStore.entries()) {
        if (data.userId === userId) {
          memoryRefreshTokenStore.delete(tokenId)
          removedCount++
        }
      }
      
      if (removedCount > 0) {
        logInfo('Removed refresh tokens for user from memory', { userId, count: removedCount })
      }
    }
    
    return removedCount
  }
}

/**
 * CSRF Token Store Management
 */
export interface CSRFTokenData {
  userId: string
  expiresAt: Date
}

export class CSRFTokenStore {
  /**
   * Store CSRF token
   */
  static async set(tokenId: string, data: CSRFTokenData, expirationSeconds?: number): Promise<boolean> {
    const key = CSRF_TOKEN_PREFIX + tokenId
    const value = JSON.stringify({
      ...data,
      expiresAt: data.expiresAt.toISOString(),
    })
    
    if (isRedisConnected()) {
      const success = await RedisManager.set(key, value, expirationSeconds)
      if (success) {
        logInfo('CSRF token stored', { tokenId, userId: data.userId, storage: 'redis' })
        return true
      }
    }
    
    // Fallback to memory
    memoryCsrfTokenStore.set(tokenId, data)
    logWarn('CSRF token stored in memory (Redis unavailable)', { tokenId, userId: data.userId })
    return true
  }

  /**
   * Get CSRF token data
   */
  static async get(tokenId: string): Promise<CSRFTokenData | null> {
    const key = CSRF_TOKEN_PREFIX + tokenId
    
    if (isRedisConnected()) {
      const value = await RedisManager.get(key)
      if (value) {
        try {
          const parsed = JSON.parse(value)
          return {
            ...parsed,
            expiresAt: new Date(parsed.expiresAt),
          }
        } catch (error) {
          logError('Failed to parse CSRF token data from Redis', error as Error, { tokenId })
        }
      }
      return null
    }
    
    // Fallback to memory
    return memoryCsrfTokenStore.get(tokenId) || null
  }

  /**
   * Remove CSRF token
   */
  static async remove(tokenId: string): Promise<boolean> {
    const key = CSRF_TOKEN_PREFIX + tokenId
    
    if (isRedisConnected()) {
      return await RedisManager.del(key)
    }
    
    // Fallback to memory
    return memoryCsrfTokenStore.delete(tokenId)
  }

  /**
   * Remove all CSRF tokens for a user
   */
  static async removeAllForUser(userId: string): Promise<number> {
    let removedCount = 0
    
    if (isRedisConnected()) {
      const keys = await RedisManager.keys(CSRF_TOKEN_PREFIX + '*')
      
      for (const key of keys) {
        const value = await RedisManager.get(key)
        if (value) {
          try {
            const data = JSON.parse(value)
            if (data.userId === userId) {
              await RedisManager.del(key)
              removedCount++
            }
          } catch (error) {
            logWarn('Failed to parse CSRF token during cleanup', { key })
          }
        }
      }
    } else {
      // Fallback to memory
      for (const [tokenId, data] of memoryCsrfTokenStore.entries()) {
        if (data.userId === userId) {
          memoryCsrfTokenStore.delete(tokenId)
          removedCount++
        }
      }
    }
    
    return removedCount
  }

  /**
   * Clean up expired CSRF tokens
   */
  static async cleanupExpired(): Promise<number> {
    const now = new Date()
    let cleanedCount = 0
    
    if (isRedisConnected()) {
      const keys = await RedisManager.keys(CSRF_TOKEN_PREFIX + '*')
      
      for (const key of keys) {
        const value = await RedisManager.get(key)
        if (value) {
          try {
            const data = JSON.parse(value)
            const expiresAt = new Date(data.expiresAt)
            
            if (expiresAt <= now) {
              await RedisManager.del(key)
              cleanedCount++
            }
          } catch (error) {
            // Invalid data, remove it
            await RedisManager.del(key)
            cleanedCount++
          }
        }
      }
    } else {
      // Fallback to memory
      for (const [tokenId, data] of memoryCsrfTokenStore.entries()) {
        if (data.expiresAt <= now) {
          memoryCsrfTokenStore.delete(tokenId)
          cleanedCount++
        }
      }
    }
    
    if (cleanedCount > 0) {
      logInfo('Cleaned up expired CSRF tokens', { count: cleanedCount })
    }
    
    return cleanedCount
  }
}

/**
 * Rate Limiting Store Management
 */
export interface RateLimitData {
  count: number
  lastAttempt: Date
}

export class RateLimitStore {
  /**
   * Get rate limit data for an identifier
   */
  static async get(identifier: string): Promise<RateLimitData | null> {
    const key = RATE_LIMIT_PREFIX + identifier
    
    if (isRedisConnected()) {
      const value = await RedisManager.get(key)
      if (value) {
        try {
          const parsed = JSON.parse(value)
          return {
            ...parsed,
            lastAttempt: new Date(parsed.lastAttempt),
          }
        } catch (error) {
          logError('Failed to parse rate limit data from Redis', error as Error, { identifier })
        }
      }
      return null
    }
    
    // Fallback to memory
    return memoryRateLimitStore.get(identifier) || null
  }

  /**
   * Set rate limit data for an identifier
   */
  static async set(identifier: string, data: RateLimitData, expirationSeconds?: number): Promise<boolean> {
    const key = RATE_LIMIT_PREFIX + identifier
    const value = JSON.stringify({
      ...data,
      lastAttempt: data.lastAttempt.toISOString(),
    })
    
    if (isRedisConnected()) {
      const success = await RedisManager.set(key, value, expirationSeconds)
      if (success) {
        logInfo('Rate limit data stored', { identifier, count: data.count, storage: 'redis' })
        return true
      }
    }
    
    // Fallback to memory
    memoryRateLimitStore.set(identifier, data)
    logWarn('Rate limit data stored in memory (Redis unavailable)', { identifier, count: data.count })
    
    // Clean up memory periodically if using fallback  
    if (memoryRateLimitStore.size > 5000) {
      logWarn('Memory rate limit store size limit reached, clearing old entries')
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      for (const [id, data] of memoryRateLimitStore.entries()) {
        if (data.lastAttempt < oneHourAgo) {
          memoryRateLimitStore.delete(id)
        }
      }
    }
    
    return true
  }

  /**
   * Remove rate limit data for an identifier
   */
  static async remove(identifier: string): Promise<boolean> {
    const key = RATE_LIMIT_PREFIX + identifier
    
    if (isRedisConnected()) {
      return await RedisManager.del(key)
    }
    
    // Fallback to memory
    return memoryRateLimitStore.delete(identifier)
  }

  /**
   * Clean up expired rate limit entries
   */
  static async cleanupExpired(windowMs: number): Promise<number> {
    const cutoffTime = new Date(Date.now() - windowMs)
    let cleanedCount = 0
    
    if (isRedisConnected()) {
      const keys = await RedisManager.keys(RATE_LIMIT_PREFIX + '*')
      
      for (const key of keys) {
        const value = await RedisManager.get(key)
        if (value) {
          try {
            const data = JSON.parse(value)
            const lastAttempt = new Date(data.lastAttempt)
            
            if (lastAttempt <= cutoffTime) {
              await RedisManager.del(key)
              cleanedCount++
            }
          } catch (error) {
            // Invalid data, remove it
            await RedisManager.del(key)
            cleanedCount++
          }
        }
      }
    } else {
      // Fallback to memory
      for (const [identifier, data] of memoryRateLimitStore.entries()) {
        if (data.lastAttempt <= cutoffTime) {
          memoryRateLimitStore.delete(identifier)
          cleanedCount++
        }
      }
    }
    
    if (cleanedCount > 0) {
      logInfo('Cleaned up expired rate limit entries', { count: cleanedCount })
    }
    
    return cleanedCount
  }
}