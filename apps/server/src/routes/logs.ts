import { Router, Request, Response } from 'express'
import { log } from '../infrastructure/services/logger'
import type { StructuredLogEntry, LogLevel } from '@trading-viewer/shared'
import { optionalAuth } from '../middleware/auth'
import { validateRequest } from '../middleware/inputValidation'
import { z } from 'zod'

const router: Router = Router()

// バリデーションスキーマ
const LogEntrySchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
  message: z.string().min(1).max(1000),
  category: z.enum([
    'auth',
    'api',
    'database',
    'market-data',
    'websocket',
    'security',
    'performance',
    'business',
    'system',
    'audit',
  ]),
  component: z.string().min(1).max(100),
  context: z.record(z.unknown()).optional(),
  error: z
    .object({
      name: z.string(),
      message: z.string(),
      stack: z.string().optional(),
    })
    .optional(),
  timestamp: z.string().datetime().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
})

const BatchLogSchema = z.object({
  logs: z.array(LogEntrySchema).min(1).max(50),
})

// 単一ログエントリの受信
router.post(
  '/',
  optionalAuth,
  validateRequest({
    body: LogEntrySchema,
  }),
  async (req: Request, res: Response) => {
    try {
      const logEntry = req.body as z.infer<typeof LogEntrySchema>

      // クライアントからのログをサーバーログに記録
      const context = {
        ...logEntry.context,
        clientLog: true,
        userAgent: logEntry.userAgent || req.headers['user-agent'],
        ip: req.ip,
        url: logEntry.url,
      }

      // ログレベルに応じて適切なメソッドを呼び出し
      switch (logEntry.level) {
        case 'trace':
          log.trace(`[CLIENT] ${logEntry.message}`, context)
          break
        case 'debug':
          log.debug(`[CLIENT] ${logEntry.message}`, context)
          break
        case 'info':
          log.info(`[CLIENT] ${logEntry.message}`, context)
          break
        case 'warn':
          log.warn(`[CLIENT] ${logEntry.message}`, context)
          break
        case 'error':
          log.error(
            `[CLIENT] ${logEntry.message}`,
            logEntry.error ? new Error(logEntry.error.message) : undefined,
            context
          )
          break
        case 'fatal':
          log.fatal(
            `[CLIENT] ${logEntry.message}`,
            logEntry.error ? new Error(logEntry.error.message) : undefined,
            context
          )
          break
      }

      res.status(204).send()
    } catch (error) {
      log.error('Failed to process client log', error as Error)
      res.status(500).json({
        success: false,
        error: 'Failed to process log entry',
      })
    }
  }
)

// バッチログエントリの受信
router.post(
  '/batch',
  optionalAuth,
  validateRequest({
    body: BatchLogSchema,
  }),
  async (req: Request, res: Response) => {
    try {
      const { logs } = req.body as z.infer<typeof BatchLogSchema>

      // 各ログエントリを処理
      logs.forEach(logEntry => {
        const context = {
          ...logEntry.context,
          clientLog: true,
          userAgent: logEntry.userAgent || req.headers['user-agent'],
          ip: req.ip,
          url: logEntry.url,
        }

        // ログレベルに応じて適切なメソッドを呼び出し
        switch (logEntry.level) {
          case 'trace':
            log.trace(`[CLIENT] ${logEntry.message}`, context)
            break
          case 'debug':
            log.debug(`[CLIENT] ${logEntry.message}`, context)
            break
          case 'info':
            log.info(`[CLIENT] ${logEntry.message}`, context)
            break
          case 'warn':
            log.warn(`[CLIENT] ${logEntry.message}`, context)
            break
          case 'error':
            log.error(
              `[CLIENT] ${logEntry.message}`,
              logEntry.error ? new Error(logEntry.error.message) : undefined,
              context
            )
            break
          case 'fatal':
            log.fatal(
              `[CLIENT] ${logEntry.message}`,
              logEntry.error ? new Error(logEntry.error.message) : undefined,
              context
            )
            break
        }
      })

      log.info(`Processed ${logs.length} client log entries`)
      res.status(204).send()
    } catch (error) {
      log.error('Failed to process client log batch', error as Error)
      res.status(500).json({
        success: false,
        error: 'Failed to process log batch',
      })
    }
  }
)

// ログレベルの取得・設定エンドポイント（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  router.get('/level', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        level: process.env.LOG_LEVEL || 'info',
      },
    })
  })

  router.put(
    '/level',
    validateRequest({
      body: z.object({
        level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
      }),
    }),
    (req: Request, res: Response) => {
      const { level } = req.body
      process.env.LOG_LEVEL = level

      log.info(`Log level changed to ${level}`)
      res.json({
        success: true,
        data: { level },
      })
    }
  )
}

export default router
