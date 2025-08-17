import { Application } from 'express'
import rateLimit from 'express-rate-limit'

const isRateLimitingEnabled =
  process.env.ENABLE_RATE_LIMITING !== 'false' && process.env.NODE_ENV !== 'development'

// General API rate limiter (more permissive for trading data)
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Higher limit for trading apps
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429,
  },
  skip: () => !isRateLimitingEnabled,
  standardHeaders: true,
  legacyHeaders: false,
})

// Moderate rate limiter for market data endpoints
export const marketDataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MARKET_DATA_MAX || '60'), // 60 requests per minute
  message: {
    code: 'MARKET_DATA_RATE_LIMIT_EXCEEDED',
    message: 'Too many market data requests. Please slow down.',
    statusCode: 429,
  },
  skip: () => !isRateLimitingEnabled,
  standardHeaders: true,
  legacyHeaders: false,
})

// Very strict rate limiter for sensitive operations
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX || '10'), // 10 requests per hour
  message: {
    code: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
    message: 'Too many sensitive operations. Please wait before trying again.',
    statusCode: 429,
  },
  skip: () => !isRateLimitingEnabled,
  standardHeaders: true,
  legacyHeaders: false,
})

export function setupRateLimiting(app: Application): void {
  app.use(generalLimiter)
}