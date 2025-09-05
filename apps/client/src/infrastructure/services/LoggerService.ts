import type { LogLevel, LogContext, StructuredLogEntry } from '@trading-viewer/shared'

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

    const style = `color: ${color}; font-weight: bold;`
    const contextStr = context ? ` [${JSON.stringify(context)}]` : ''

    if (error) {
      // eslint-disable-next-line no-console
      console.group(`%c[${level.toUpperCase()}] ${message}${contextStr}`, style)
      // eslint-disable-next-line no-console
      console.error(error)
      if (error.stack) {
        // eslint-disable-next-line no-console
        console.trace('Stack trace:')
      }
      // eslint-disable-next-line no-console
      console.groupEnd()
    } else {
      // eslint-disable-next-line no-console
      console.log(`%c[${level.toUpperCase()}] ${message}${contextStr}`, style)
    }
  }
}

class StructuredLogger {
  private transports: LoggerTransport[] = []

  constructor() {
    this.addTransport(new ConsoleTransport())
  }

  addTransport(transport: LoggerTransport): void {
    this.transports.push(transport)
  }

  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name)
  }

  private log(level: LogLevel, message: string, error?: unknown, context?: LogContext): void {
    const entry: BrowserLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
      url: window?.location?.href,
      userAgent: navigator?.userAgent,
    }

    // エラーオブジェクトの処理
    if (error) {
      if (error instanceof Error) {
        entry.error = error.message
        entry.stack = error.stack
      } else {
        entry.error = String(error)
      }
    }

    // 各transportに送信
    this.transports.forEach(transport => {
      try {
        transport.log(entry)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Logger transport error:', e)
      }
    })
  }

  // カテゴリ別ログメソッド
  auth = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, { ...context, category: 'auth' }),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, { ...context, category: 'auth' }),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, { ...context, category: 'auth' }),
    warn: (message: string, error?: unknown, context?: LogContext) =>
      this.log('warn', message, error, { ...context, category: 'auth' }),
    error: (message: string, error?: unknown, context?: LogContext) =>
      this.log('error', message, error, { ...context, category: 'auth' }),
    fatal: (message: string, error?: unknown, context?: LogContext) =>
      this.log('fatal', message, error, { ...context, category: 'auth' }),
  }

  api = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, { ...context, category: 'api' }),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, { ...context, category: 'api' }),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, { ...context, category: 'api' }),
    warn: (message: string, error?: unknown, context?: LogContext) =>
      this.log('warn', message, error, { ...context, category: 'api' }),
    error: (message: string, error?: unknown, context?: LogContext) =>
      this.log('error', message, error, { ...context, category: 'api' }),
    fatal: (message: string, error?: unknown, context?: LogContext) =>
      this.log('fatal', message, error, { ...context, category: 'api' }),
  }

  database = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, { ...context, category: 'database' }),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, { ...context, category: 'database' }),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, { ...context, category: 'database' }),
    warn: (message: string, error?: unknown, context?: LogContext) =>
      this.log('warn', message, error, { ...context, category: 'database' }),
    error: (message: string, error?: unknown, context?: LogContext) =>
      this.log('error', message, error, { ...context, category: 'database' }),
    fatal: (message: string, error?: unknown, context?: LogContext) =>
      this.log('fatal', message, error, { ...context, category: 'database' }),
  }

  'market-data' = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, { ...context, category: 'market-data' }),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, { ...context, category: 'market-data' }),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, { ...context, category: 'market-data' }),
    warn: (message: string, error?: unknown, context?: LogContext) =>
      this.log('warn', message, error, { ...context, category: 'market-data' }),
    error: (message: string, error?: unknown, context?: LogContext) =>
      this.log('error', message, error, { ...context, category: 'market-data' }),
    fatal: (message: string, error?: unknown, context?: LogContext) =>
      this.log('fatal', message, error, { ...context, category: 'market-data' }),
  }

  websocket = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, { ...context, category: 'websocket' }),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, { ...context, category: 'websocket' }),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, { ...context, category: 'websocket' }),
    warn: (message: string, error?: unknown, context?: LogContext) =>
      this.log('warn', message, error, { ...context, category: 'websocket' }),
    error: (message: string, error?: unknown, context?: LogContext) =>
      this.log('error', message, error, { ...context, category: 'websocket' }),
    fatal: (message: string, error?: unknown, context?: LogContext) =>
      this.log('fatal', message, error, { ...context, category: 'websocket' }),
  }

  security = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, { ...context, category: 'security' }),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, { ...context, category: 'security' }),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, { ...context, category: 'security' }),
    warn: (message: string, error?: unknown, context?: LogContext) =>
      this.log('warn', message, error, { ...context, category: 'security' }),
    error: (message: string, error?: unknown, context?: LogContext) =>
      this.log('error', message, error, { ...context, category: 'security' }),
    fatal: (message: string, error?: unknown, context?: LogContext) =>
      this.log('fatal', message, error, { ...context, category: 'security' }),
  }

  performance = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, { ...context, category: 'performance' }),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, { ...context, category: 'performance' }),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, { ...context, category: 'performance' }),
    warn: (message: string, error?: unknown, context?: LogContext) =>
      this.log('warn', message, error, { ...context, category: 'performance' }),
    error: (message: string, error?: unknown, context?: LogContext) =>
      this.log('error', message, error, { ...context, category: 'performance' }),
    fatal: (message: string, error?: unknown, context?: LogContext) =>
      this.log('fatal', message, error, { ...context, category: 'performance' }),
  }

  business = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, { ...context, category: 'business' }),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, { ...context, category: 'business' }),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, { ...context, category: 'business' }),
    warn: (message: string, error?: unknown, context?: LogContext) =>
      this.log('warn', message, error, { ...context, category: 'business' }),
    error: (message: string, error?: unknown, context?: LogContext) =>
      this.log('error', message, error, { ...context, category: 'business' }),
    fatal: (message: string, error?: unknown, context?: LogContext) =>
      this.log('fatal', message, error, { ...context, category: 'business' }),
  }

  system = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, { ...context, category: 'system' }),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, { ...context, category: 'system' }),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, { ...context, category: 'system' }),
    warn: (message: string, error?: unknown, context?: LogContext) =>
      this.log('warn', message, error, { ...context, category: 'system' }),
    error: (message: string, error?: unknown, context?: LogContext) =>
      this.log('error', message, error, { ...context, category: 'system' }),
    fatal: (message: string, error?: unknown, context?: LogContext) =>
      this.log('fatal', message, error, { ...context, category: 'system' }),
  }

  audit = {
    trace: (message: string, context?: LogContext) =>
      this.log('trace', message, undefined, { ...context, category: 'audit' }),
    debug: (message: string, context?: LogContext) =>
      this.log('debug', message, undefined, { ...context, category: 'audit' }),
    info: (message: string, context?: LogContext) =>
      this.log('info', message, undefined, { ...context, category: 'audit' }),
    warn: (message: string, error?: unknown, context?: LogContext) =>
      this.log('warn', message, error, { ...context, category: 'audit' }),
    error: (message: string, error?: unknown, context?: LogContext) =>
      this.log('error', message, error, { ...context, category: 'audit' }),
    fatal: (message: string, error?: unknown, context?: LogContext) =>
      this.log('fatal', message, error, { ...context, category: 'audit' }),
  }

  // レガシーメソッド（後方互換性）
  trace = (message: string, context?: LogContext) => this.log('trace', message, undefined, context)
  debug = (message: string, context?: LogContext) => this.log('debug', message, undefined, context)
  info = (message: string, context?: LogContext) => this.log('info', message, undefined, context)
  warn = (message: string, error?: unknown, context?: LogContext) =>
    this.log('warn', message, error, context)
  error = (message: string, error?: unknown, context?: LogContext) =>
    this.log('error', message, error, context)
  fatal = (message: string, error?: unknown, context?: LogContext) =>
    this.log('fatal', message, error, context)
}

// シングルトンインスタンス
export const log = new StructuredLogger()
