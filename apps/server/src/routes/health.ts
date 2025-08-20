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
    yahooFinance?: ServiceHealth
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

// 基本的なヘルスチェック
router.get('/health', async (req: Request, res: Response) => {
  try {
    // 簡単なデータベース接続チェック
    await prisma.$queryRaw`SELECT 1`

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'データベース接続に失敗しました',
      timestamp: new Date().toISOString(),
    })
  }
})

// 詳細なヘルスチェック
router.get('/health/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now()
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
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

  // データベースのチェック
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
      error: error instanceof Error ? error.message : '不明なエラー',
    }
    health.status = 'unhealthy'
  }

  // Redisのチェック (設定されている場合)
  if (process.env.REDIS_URL) {
    try {
      // Redisのヘルスチェックはここに実装
      health.services.redis = { status: 'up' }
    } catch (error) {
      health.services.redis = {
        status: 'down',
        error: error instanceof Error ? error.message : '不明なエラー',
      }
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded'
    }
  }

  // WebSocketサービスのチェック
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
      error: error instanceof Error ? error.message : '不明なエラー',
    }
    health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded'
  }

  // 市場データサービス(Yahoo Finance)のチェック
  try {
    const yahooStart = Date.now()
    const response = await fetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL')
    if (response.ok) {
      health.services.yahooFinance = {
        status: 'up',
        latency: Date.now() - yahooStart,
      }
    } else {
      health.services.yahooFinance = { status: 'down' }
    }
  } catch (error) {
    health.services.yahooFinance = {
      status: 'down',
      error: error instanceof Error ? error.message : '不明なエラー',
    }
  }

  // システムメトリクス
  const memUsage = process.memoryUsage()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  health.system.memory = {
    used: Math.round(usedMem / 1024 / 1024), // MB
    total: Math.round(totalMem / 1024 / 1024), // MB
    percentage: Math.round((usedMem / totalMem) * 100),
  }

  // 全体的なヘルスステータスを決定
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503

  res.status(statusCode).json(health)
})

// Liveness probe (Kubernetes用)
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  })
})

// Readiness probe (Kubernetes用)
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // サービスがトラフィックを受け入れられる準備ができているか確認
    await prisma.$queryRaw`SELECT 1`

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: 'サービスは準備ができていません',
      timestamp: new Date().toISOString(),
    })
  }
})

// メトリクスエンドポイント (Prometheus用)
router.get('/metrics', (req: Request, res: Response) => {
  const metrics = []
  const timestamp = Date.now()

  // プロセスメトリクス
  const memUsage = process.memoryUsage()
  metrics.push(`# HELP process_memory_heap_used_bytes プロセスのヒープ使用量`)
  metrics.push(`# TYPE process_memory_heap_used_bytes gauge`)
  metrics.push(`process_memory_heap_used_bytes ${memUsage.heapUsed}`)

  metrics.push(`# HELP process_memory_heap_total_bytes プロセスの合計ヒープメモリ`)
  metrics.push(`# TYPE process_memory_heap_total_bytes gauge`)
  metrics.push(`process_memory_heap_total_bytes ${memUsage.heapTotal}`)

  metrics.push(`# HELP process_uptime_seconds プロセスの稼働時間 (秒)`)
  metrics.push(`# TYPE process_uptime_seconds counter`)
  metrics.push(`process_uptime_seconds ${process.uptime()}`)

  // システムメトリクス
  const loadAvg = os.loadavg()
  metrics.push(`# HELP system_load_average_1m システムの1分間の平均負荷`)
  metrics.push(`# TYPE system_load_average_1m gauge`)
  metrics.push(`system_load_average_1m ${loadAvg[0]}`)

  metrics.push(`# HELP system_cpu_cores CPUコアの総数`)
  metrics.push(`# TYPE system_cpu_cores gauge`)
  metrics.push(`system_cpu_cores ${os.cpus().length}`)

  res.set('Content-Type', 'text/plain')
  res.send(metrics.join('\n'))
})

export default router
