import { createClient } from 'redis'
import { config } from '../config/environment.js'
import { logInfo, logError, logWarn } from '../utils/logger.js'

// Redis client configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const REDIS_PASSWORD = process.env.REDIS_PASSWORD
const REDIS_DATABASE = parseInt(process.env.REDIS_DATABASE || '0')

// Connection configuration
const connectionConfig = {
  url: REDIS_URL,
  ...(REDIS_PASSWORD && { password: REDIS_PASSWORD }),
  database: REDIS_DATABASE,
  socket: {
    connectTimeout: 5000,
    lazyConnect: true,
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        logError('Redis: Maximum retry attempts exceeded, giving up')
        return false
      }
      const delay = Math.min(retries * 50, 1000)
      logWarn(`Redis: Reconnecting in ${delay}ms (attempt ${retries + 1}/10)`)
      return delay
    },
  },
}

// Create Redis clients
export let redisClient: ReturnType<typeof createClient>
export let redisSubscriber: ReturnType<typeof createClient>
export let redisPublisher: ReturnType<typeof createClient>

// Redis connection health status
let isRedisHealthy = false
let connectionAttempts = 0
const MAX_CONNECTION_ATTEMPTS = 5

/**
 * Initialize Redis connections
 */
export async function initializeRedis(): Promise<boolean> {
  try {
    logInfo('Redis: Initializing connections...')

    // Create clients
    redisClient = createClient(connectionConfig)
    redisSubscriber = createClient(connectionConfig)
    redisPublisher = createClient(connectionConfig)

    // Set up error handlers before connecting
    redisClient.on('error', error => {
      isRedisHealthy = false
      logError('Redis client error:', error)
    })

    redisClient.on('connect', () => {
      logInfo('Redis: Client connected successfully')
    })

    redisClient.on('ready', () => {
      isRedisHealthy = true
      connectionAttempts = 0
      logInfo('Redis: Client ready for operations')
    })

    redisClient.on('reconnecting', () => {
      logWarn('Redis: Client reconnecting...')
    })

    redisClient.on('end', () => {
      isRedisHealthy = false
      logWarn('Redis: Client connection ended')
    })

    // Connect to Redis
    await redisClient.connect()
    await redisSubscriber.connect()
    await redisPublisher.connect()

    // Test connection with ping
    const pong = await redisClient.ping()
    if (pong === 'PONG') {
      logInfo('Redis: All connections established successfully')
      return true
    } else {
      throw new Error('Redis ping test failed')
    }
  } catch (error) {
    connectionAttempts++
    isRedisHealthy = false

    if (config.isDevelopment && connectionAttempts <= MAX_CONNECTION_ATTEMPTS) {
      logWarn(
        `Redis: Connection failed (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}), falling back to in-memory store`
      )
      return false
    } else {
      logError('Redis: Failed to initialize connections', error as Error)
      throw error
    }
  }
}

/**
 * Disconnect from Redis
 */
export async function disconnectRedis(): Promise<void> {
  try {
    logInfo('Redis: Disconnecting all connections...')

    if (redisClient?.isReady) {
      await redisClient.quit()
    }
    if (redisSubscriber?.isReady) {
      await redisSubscriber.quit()
    }
    if (redisPublisher?.isReady) {
      await redisPublisher.quit()
    }
    logInfo('Redis: All connections closed successfully')
  } catch (error) {
    logError('Redis: Error during disconnection', error as Error)
  }
}

/**
 * Check Redis health status
 */
export function isRedisConnected(): boolean {
  return isRedisHealthy && redisClient?.isReady === true
}

/**
 * Redis utility functions with error handling
 */
export class RedisManager {
  /**
   * Set a key-value pair with optional expiration
   */
  static async set(key: string, value: string, expirationSeconds?: number): Promise<boolean> {
    try {
      if (!isRedisConnected()) {
        logWarn('Redis: Not connected, cannot set key', { key })
        return false
      }

      if (expirationSeconds) {
        await redisClient.setEx(key, expirationSeconds, value)
      } else {
        await redisClient.set(key, value)
      }

      return true
    } catch (error) {
      logError('Redis: Failed to set key', error as Error, { key })
      return false
    }
  }

  /**
   * Get a value by key
   */
  static async get(key: string): Promise<string | null> {
    try {
      if (!isRedisConnected()) {
        return null
      }

      return await redisClient.get(key)
    } catch (error) {
      logError('Redis: Failed to get key', error as Error, { key })
      return null
    }
  }

  /**
   * Delete a key
   */
  static async del(key: string): Promise<boolean> {
    try {
      if (!isRedisConnected()) {
        return false
      }

      const result = await redisClient.del(key)
      return result > 0
    } catch (error) {
      logError('Redis: Failed to delete key', error as Error, { key })
      return false
    }
  }

  /**
   * Check if a key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      if (!isRedisConnected()) {
        return false
      }

      const result = await redisClient.exists(key)
      return result > 0
    } catch (error) {
      logError('Redis: Failed to check key existence', error as Error, { key })
      return false
    }
  }

  /**
   * Set expiration for a key
   */
  static async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!isRedisConnected()) {
        return false
      }

      const result = await redisClient.expire(key, seconds)
      return Boolean(result)
    } catch (error) {
      logError('Redis: Failed to set expiration', error as Error, { key, seconds })
      return false
    }
  }

  /**
   * Get keys matching a pattern
   */
  static async keys(pattern: string): Promise<string[]> {
    try {
      if (!isRedisConnected()) {
        return []
      }

      return await redisClient.keys(pattern)
    } catch (error) {
      logError('Redis: Failed to get keys', error as Error, { pattern })
      return []
    }
  }

  /**
   * Increment a counter
   */
  static async incr(key: string): Promise<number | null> {
    try {
      if (!isRedisConnected()) {
        return null
      }

      return await redisClient.incr(key)
    } catch (error) {
      logError('Redis: Failed to increment key', error as Error, { key })
      return null
    }
  }

  /**
   * Set multiple key-value pairs
   */
  static async mset(keyValues: Record<string, string>): Promise<boolean> {
    try {
      if (!isRedisConnected()) {
        return false
      }

      await redisClient.mSet(keyValues)
      return true
    } catch (error) {
      logError('Redis: Failed to set multiple keys', error as Error, {
        keyCount: Object.keys(keyValues).length,
      })
      return false
    }
  }

  /**
   * Get multiple values by keys
   */
  static async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      if (!isRedisConnected()) {
        return keys.map(() => null)
      }

      return await redisClient.mGet(keys)
    } catch (error) {
      logError('Redis: Failed to get multiple keys', error as Error, { keyCount: keys.length })
      return keys.map(() => null)
    }
  }
}

// Export Redis clients for direct access if needed
export { redisClient as redis }

// Health check function
export async function checkRedisHealth(): Promise<{
  healthy: boolean
  message: string
  details?: any
}> {
  try {
    if (!isRedisConnected()) {
      return {
        healthy: false,
        message: 'Redis is not connected',
      }
    }

    const start = Date.now()
    const pong = await redisClient.ping()
    const latency = Date.now() - start

    if (pong === 'PONG') {
      return {
        healthy: true,
        message: 'Redis is healthy',
        details: {
          latency: `${latency}ms`,
          database: REDIS_DATABASE,
        },
      }
    } else {
      return {
        healthy: false,
        message: 'Redis ping failed',
      }
    }
  } catch (error) {
    return {
      healthy: false,
      message: 'Redis health check failed',
      details: {
        error: (error as Error).message,
      },
    }
  }
}
