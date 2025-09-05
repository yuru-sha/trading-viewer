import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import * as Sentry from '@sentry/node'
import { Request, Response, NextFunction } from 'express'

// Initialize Sentry (if configured)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [Sentry.httpIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event, __hint) {
      // Filter out sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies
      }
      if (event.request?.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.cookie
      }
      return event
    },
  })
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
}

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
}

// Add colors to winston
winston.addColors(logColors)

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.align(),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
)

// Create transports
const transports: winston.transport[] = []

// Console transport
if (process.env.NODE_ENV !== 'test') {
  transports.push(
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    })
  )
}

// File transports for production
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    })
  )

  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    })
  )

  // HTTP request log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '7d',
      format: logFormat,
    })
  )
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,
})

// HTTP request logger middleware
export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  // Log request
  logger.http({
    message: 'Incoming request',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  // Log response
  const originalSend = res.send
  res.send = function (data) {
    const duration = Date.now() - start

    logger.http({
      message: 'Request completed',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    })

    // Track slow requests
    if (duration > 1000) {
      logger.warn({
        message: 'Slow request detected',
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
      })
    }

    return originalSend.call(this, data)
  }

  next()
}

// Error logger middleware
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  // Send to Sentry in production
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      contexts: {
        request: {
          url: req.url,
          method: req.method,
          headers: req.headers,
        },
      },
    })
  }

  next(err)
}

// Utility functions for structured logging
export const logInfo = (message: string, meta?: Record<string, unknown>) => {
  logger.info({ message, ...meta })
}

export const logError = (message: string, error?: Error, meta?: Record<string, unknown>) => {
  logger.error({
    message,
    error: error?.message,
    stack: error?.stack,
    ...meta,
  })

  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN && error) {
    Sentry.captureException(error, { extra: meta })
  }
}

export const logWarn = (message: string, meta?: Record<string, unknown>) => {
  logger.warn({ message, ...meta })
}

export const logDebug = (message: string, meta?: Record<string, unknown>) => {
  logger.debug({ message, ...meta })
}

// Performance monitoring
export const logPerformance = (
  operation: string,
  duration: number,
  meta?: Record<string, unknown>
) => {
  const level = duration > 1000 ? 'warn' : 'info'
  logger.log(level, {
    message: `Performance: ${operation}`,
    duration: `${duration}ms`,
    ...meta,
  })

  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${operation} - ${duration}ms`,
      level: 'info',
      data: { operation, duration },
    })
  }
}

// Audit logging for sensitive operations
export const logAudit = (action: string, userId: string, details: Record<string, unknown>) => {
  logger.info({
    type: 'AUDIT',
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  })
}

export default logger
