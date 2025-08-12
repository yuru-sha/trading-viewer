import { Request, Response, NextFunction } from 'express'

// Request logging middleware with performance timing
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  const originalSend = res.send

  // Override res.send to log response details
  res.send = function (data) {
    const duration = Date.now() - start
    const contentLength = Buffer.byteLength(data || '', 'utf8')

    console.log(
      `${req.method} ${req.originalUrl} - ${req.ip} - ${res.statusCode} - ${duration}ms - ${contentLength}bytes`
    )

    return originalSend.call(this, data)
  }

  next()
}

// Error logging middleware
export function errorLogger(error: any, req: Request, res: Response, next: NextFunction) {
  console.error('Request Error:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    timestamp: new Date().toISOString(),
  })

  next(error)
}
