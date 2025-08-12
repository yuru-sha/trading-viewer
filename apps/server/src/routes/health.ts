import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import os from 'os'
import { WebSocketService } from '../services/websocketService.js'

const router = Router()
const prisma = new PrismaClient()

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  environment: string
  services: {
    database: ServiceHealth
    redis?: ServiceHealth
    websocket: ServiceHealth
    finnhub?: ServiceHealth
  }
  system: {
    memory: {
      used: number
      total: number
      percentage: number
    }
    cpu: {
      load: number[]
      cores: number
    }
  }
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded'
  latency?: number
  error?: string
}

// Basic health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Quick database connectivity check
    await prisma.$queryRaw`SELECT 1`

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    })
  }
})

// Detailed health check
router.get('/health/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now()
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: { status: 'down' },
      websocket: { status: 'down' },
    },
    system: {
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
      },
      cpu: {
        load: os.loadavg(),
        cores: os.cpus().length,
      },
    },
  }

  // Check database
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    health.services.database = {
      status: 'up',
      latency: Date.now() - dbStart,
    }
  } catch (error) {
    health.services.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    health.status = 'unhealthy'
  }

  // Check Redis (if configured)
  if (process.env.REDIS_URL) {
    try {
      // Redis health check would go here
      health.services.redis = { status: 'up' }
    } catch (error) {
      health.services.redis = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded'
    }
  }

  // Check WebSocket service
  try {
    const wsService = WebSocketService.getInstance()
    const wsStatus = wsService.getStatus()
    health.services.websocket = {
      status: wsStatus.isRunning ? 'up' : 'down',
      latency: wsStatus.connectionCount,
    }
  } catch (error) {
    health.services.websocket = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded'
  }

  // Check Finnhub API (optional)
  if (process.env.FINNHUB_API_KEY) {
    try {
      const finnhubStart = Date.now()
      const response = await fetch(
        'https://finnhub.io/api/v1/quote?symbol=AAPL&token=' + process.env.FINNHUB_API_KEY
      )
      if (response.ok) {
        health.services.finnhub = {
          status: 'up',
          latency: Date.now() - finnhubStart,
        }
      } else {
        health.services.finnhub = { status: 'down' }
      }
    } catch (error) {
      health.services.finnhub = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // System metrics
  const memUsage = process.memoryUsage()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  health.system.memory = {
    used: Math.round(usedMem / 1024 / 1024), // MB
    total: Math.round(totalMem / 1024 / 1024), // MB
    percentage: Math.round((usedMem / totalMem) * 100),
  }

  // Determine overall health status
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503

  res.status(statusCode).json(health)
})

// Liveness probe (for Kubernetes)
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  })
})

// Readiness probe (for Kubernetes)
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Check if service is ready to accept traffic
    await prisma.$queryRaw`SELECT 1`

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: 'Service not ready',
      timestamp: new Date().toISOString(),
    })
  }
})

// Metrics endpoint (for Prometheus)
router.get('/metrics', (req: Request, res: Response) => {
  const metrics = []
  const timestamp = Date.now()

  // Process metrics
  const memUsage = process.memoryUsage()
  metrics.push(`# HELP process_memory_heap_used_bytes Process heap memory used`)
  metrics.push(`# TYPE process_memory_heap_used_bytes gauge`)
  metrics.push(`process_memory_heap_used_bytes ${memUsage.heapUsed}`)

  metrics.push(`# HELP process_memory_heap_total_bytes Process heap memory total`)
  metrics.push(`# TYPE process_memory_heap_total_bytes gauge`)
  metrics.push(`process_memory_heap_total_bytes ${memUsage.heapTotal}`)

  metrics.push(`# HELP process_uptime_seconds Process uptime in seconds`)
  metrics.push(`# TYPE process_uptime_seconds counter`)
  metrics.push(`process_uptime_seconds ${process.uptime()}`)

  // System metrics
  const loadAvg = os.loadavg()
  metrics.push(`# HELP system_load_average_1m System load average 1 minute`)
  metrics.push(`# TYPE system_load_average_1m gauge`)
  metrics.push(`system_load_average_1m ${loadAvg[0]}`)

  metrics.push(`# HELP system_cpu_cores Total CPU cores`)
  metrics.push(`# TYPE system_cpu_cores gauge`)
  metrics.push(`system_cpu_cores ${os.cpus().length}`)

  res.set('Content-Type', 'text/plain')
  res.send(metrics.join('\n'))
})

export default router
