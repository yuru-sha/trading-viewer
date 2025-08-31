import { Request, Response, NextFunction } from 'express'
import { randomBytes } from 'crypto'
import { log } from '../infrastructure/services/logger'

// リクエストIDをリクエストオブジェクトに追加する型拡張
declare global {
  namespace Express {
    interface Request {
      id: string
      startTime: number
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // リクエストIDの生成（既存のヘッダーがあれば使用）
  const requestId =
    (req.headers['x-request-id'] as string) || `req_${randomBytes(8).toString('hex')}`

  // リクエストオブジェクトに追加
  req.id = requestId
  req.startTime = Date.now()

  // レスポンスヘッダーに追加
  res.setHeader('X-Request-ID', requestId)

  // ログサービスにコンテキストを設定
  const userId = (req as any).user?.id
  log.setRequestContext(requestId, userId)

  // リクエスト開始をログに記録
  log.api.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
  })

  // レスポンス終了時のログ
  const originalEnd = res.end
  res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
    const duration = Date.now() - req.startTime

    log.logRequest(req.method, req.url, res.statusCode, duration, {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
    })

    // コンテキストをクリア
    log.clearContext()

    // 元のend関数を呼び出し
    return originalEnd.call(this, chunk, encoding, cb)
  }

  next()
}
