import type { LogLevel, LogContext, LogCategory, StructuredLogEntry } from '@trading-viewer/shared'

export type BrowserLogEntry = StructuredLogEntry & {
  url?: string
  userAgent?: string
  stack?: string
}

export type LoggerTransport = {
  name: string
  log: (entry: BrowserLogEntry) => void
}

class ConsoleTransport implements LoggerTransport {
  name = 'console'

  log(entry: BrowserLogEntry): void {
    const { level, message, context, error } = entry

    // コンソールの色付け
    const colors = {
      trace: '#9CA3AF', // Gray
      debug: '#6B7280', // Gray
      info: '#3B82F6', // Blue
      warn: '#F59E0B', // Amber
      error: '#EF4444', // Red
      fatal: '#7C2D12', // Dark red
    }

    const color = colors[level] || colors.info
    const prefix = `%c[${level.toUpperCase()}] ${new Date().toISOString()}`

    if (error) {
      console.groupCollapsed(`${prefix} ${message}`, `color: ${color}; font-weight: bold`)
      console.log('Context:', context)
      console.error('Error:', error)
      if (error instanceof Error && error.stack) {
        console.log('Stack:', error.stack)
      }
      console.groupEnd()
    } else if (context && Object.keys(context).length > 0) {
      console.groupCollapsed(`${prefix} ${message}`, `color: ${color}; font-weight: bold`)
      console.log('Context:', context)
      console.groupEnd()
    } else {
      console.log(`${prefix} ${message}`, `color: ${color}; font-weight: bold`)
    }
  }
}

class RemoteTransport implements LoggerTransport {
  name = 'remote'
  private buffer: BrowserLogEntry[] = []
  private flushTimer: number | null = null
  private readonly bufferSize = 10
  private readonly flushInterval = 5000 // 5秒

  log(entry: BrowserLogEntry): void {
    // エラーレベル以上は即座に送信
    if (entry.level === 'error' || entry.level === 'fatal') {
      this.sendLog(entry)
      return
    }

    // その他はバッファに蓄積
    this.buffer.push(entry)

    if (this.buffer.length >= this.bufferSize) {
      this.flush()
    } else if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(() => this.flush(), this.flushInterval)
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return

    const logs = [...this.buffer]
    this.buffer = []

    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    this.sendBatchLogs(logs)
  }

  private async sendLog(entry: BrowserLogEntry): Promise<void> {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      // リモートログ送信失敗時はコンソールにフォールバック
      console.error('Failed to send log to server:', error)
    }
  }

  private async sendBatchLogs(entries: BrowserLogEntry[]): Promise<void> {
    try {
      await fetch('/api/logs/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: entries }),
      })
    } catch (error) {
      // リモートログ送信失敗時はコンソールにフォールバック
      console.error('Failed to send batch logs to server:', error)
    }
  }
}

export class ClientLoggerService {
  private static instance: ClientLoggerService
  private transports: LoggerTransport[] = []
  private level: LogLevel = 'info'
  private context: LogContext = {}
  private userId?: string
  private sessionId?: string

  private constructor() {
    // デフォルトでコンソールトランスポートを追加
    this.addTransport(new ConsoleTransport())

    // 本番環境ではリモートトランスポートも追加
    if (import.meta.env.PROD) {
      this.addTransport(new RemoteTransport())
    }

    // ページ離脱時にバッファをフラッシュ
    window.addEventListener('beforeunload', () => {
      this.flush()
    })

    // エラーキャッチ
    window.addEventListener('error', event => {
      this.error('Uncaught error', event.error, {
        operation: 'window_error',
        url: event.filename,
        line: event.lineno,
        column: event.colno,
      })
    })

    // Promise拒否キャッチ
    window.addEventListener('unhandledrejection', event => {
      this.error('Unhandled promise rejection', event.reason, {
        operation: 'promise_rejection',
      })
    })
  }

  static getInstance(): ClientLoggerService {
    if (!ClientLoggerService.instance) {
      ClientLoggerService.instance = new ClientLoggerService()
    }
    return ClientLoggerService.instance
  }

  // 設定メソッド
  setLevel(level: LogLevel): void {
    this.level = level
  }

  setUserId(userId: string): void {
    this.userId = userId
    this.context.userId = userId
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId
    this.context.sessionId = sessionId
  }

  addTransport(transport: LoggerTransport): void {
    this.transports.push(transport)
  }

  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name)
  }

  // ログレベル判定
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
      fatal: 5,
    }
    return levels[level] >= levels[this.level]
  }

  // ベースログメソッド
  private log(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: LogContext,
    category: LogCategory = 'system'
  ): void {
    if (!this.shouldLog(level)) return

    const entry: BrowserLogEntry = {
      level,
      message,
      category,
      component: 'client',
      context: {
        ...this.context,
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
      error: error instanceof Error ? error : undefined,
      timestamp: new Date(),
      environment: import.meta.env.MODE,
      stack: error instanceof Error ? error.stack : undefined,
    }

    // すべてのトランスポートにログを送信
    this.transports.forEach(transport => {
      try {
        transport.log(entry)
      } catch (transportError) {
        console.error(`Transport ${transport.name} failed:`, transportError)
      }
    })
  }

  // ログレベル別メソッド
  trace(message: string, context?: LogContext): void {
    this.log('trace', message, undefined, context)
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, undefined, context)
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, undefined, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, undefined, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.log('error', message, error, context)
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    this.log('fatal', message, error, context)
  }

  // カテゴリ別のログメソッド
  auth = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, context, 'auth'),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, context, 'auth'),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, context, 'auth'),
    warn: (message: string, context?: LogContext) =>
      this.log('warn', message, undefined, context, 'auth'),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.log('error', message, error, context, 'auth'),
    fatal: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.log('fatal', message, error, context, 'auth'),
  }

  api = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, context, 'api'),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, context, 'api'),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, context, 'api'),
    warn: (message: string, context?: LogContext) =>
      this.log('warn', message, undefined, context, 'api'),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.log('error', message, error, context, 'api'),
    fatal: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.log('fatal', message, error, context, 'api'),
  }

  performance = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, context, 'performance'),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, context, 'performance'),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, context, 'performance'),
    warn: (message: string, context?: LogContext) =>
      this.log('warn', message, undefined, context, 'performance'),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.log('error', message, error, context, 'performance'),
    fatal: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.log('fatal', message, error, context, 'performance'),
  }

  business = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, context, 'business'),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, context, 'business'),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, context, 'business'),
    warn: (message: string, context?: LogContext) =>
      this.log('warn', message, undefined, context, 'business'),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.log('error', message, error, context, 'business'),
    fatal: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.log('fatal', message, error, context, 'business'),
  }

  system = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, context, 'system'),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, context, 'system'),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, context, 'system'),
    warn: (message: string, context?: LogContext) =>
      this.log('warn', message, undefined, context, 'system'),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.log('error', message, error, context, 'system'),
    fatal: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.log('fatal', message, error, context, 'system'),
  }

  // ユーティリティメソッド
  time(label: string): void {
    console.time(label)
  }

  timeEnd(label: string, context?: LogContext): void {
    console.timeEnd(label)
    // 実装時間測定も記録
    this.performance.info(`Timer ${label} completed`, {
      ...context,
      operation: 'timer',
      label,
    })
  }

  // APIリクエストのログ
  logApiCall(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    this.api[level](`${method} ${url} ${statusCode} - ${duration}ms`, {
      ...context,
      operation: 'api_call',
      httpStatus: statusCode,
      duration,
    })
  }

  // ユーザーアクションのログ
  logUserAction(action: string, context?: LogContext): void {
    this.business.info(`User action: ${action}`, {
      ...context,
      operation: 'user_action',
    })
  }

  // バッファのフラッシュ
  flush(): void {
    this.transports.forEach(transport => {
      if (transport instanceof RemoteTransport) {
        transport['flush']?.()
      }
    })
  }
}

// デフォルトエクスポート
export const log = ClientLoggerService.getInstance()

// 開発環境でのデバッグ用にグローバルに露出
if (import.meta.env.DEV) {
  ;(window as any).logger = log
}
