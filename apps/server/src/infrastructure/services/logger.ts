import pino from 'pino'
import type { LogLevel, LogContext, LogCategory, StructuredLogEntry } from '@trading-viewer/shared'
// import { Environment } from '../config/environment'

export type PinoLogger = pino.Logger

// ログ設定の作成
function createLoggerConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const logLevel = (process.env.LOG_LEVEL || 'info') as LogLevel

  return {
    level: logLevel,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: [
      'password',
      'token',
      'authorization',
      'cookie',
      'csrf_token',
      'access_token',
      'refresh_token',
      'api_key',
      'secret',
      'private_key',
    ],
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  }
}

// グローバルロガーのインスタンス
const logger = pino(createLoggerConfig())

export class LoggerService {
  private static instance: LoggerService
  private pinoLogger: PinoLogger
  private requestId: string | null = null
  private userId: string | null = null

  private constructor() {
    this.pinoLogger = logger
  }

  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService()
    }
    return LoggerService.instance
  }

  // リクエスト・ユーザーコンテキストの設定
  setRequestContext(requestId: string, userId?: string): void {
    this.requestId = requestId
    this.userId = userId || null
  }

  clearContext(): void {
    this.requestId = null
    this.userId = null
  }

  // ベースコンテキストの構築
  private buildContext(context?: LogContext): LogContext {
    return {
      ...context,
      requestId: context?.requestId || this.requestId || undefined,
      userId: context?.userId || this.userId || undefined,
      pid: process.pid,
      hostname: process.env.HOSTNAME || 'unknown',
      environment: process.env.NODE_ENV || 'development',
    }
  }

  // 構造化ログのエントリ作成
  private createStructuredEntry(
    level: LogLevel,
    message: string,
    category: LogCategory,
    component: string,
    context?: LogContext,
    error?: Error
  ): StructuredLogEntry {
    return {
      level,
      message,
      category,
      component,
      context: this.buildContext(context),
      error,
      timestamp: new Date(),
      version: process.env.npm_package_version,
      environment: process.env.NODE_ENV,
      hostname: process.env.HOSTNAME,
      pid: process.pid,
    }
  }

  // ログレベル別のメソッド
  trace(message: string, context?: LogContext): void {
    this.pinoLogger.trace(this.buildContext(context), message)
  }

  debug(message: string, context?: LogContext): void {
    this.pinoLogger.debug(this.buildContext(context), message)
  }

  info(message: string, context?: LogContext): void {
    this.pinoLogger.info(this.buildContext(context), message)
  }

  warn(message: string, context?: LogContext): void {
    this.pinoLogger.warn(this.buildContext(context), message)
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (error instanceof Error) {
      this.pinoLogger.error({ ...this.buildContext(context), err: error }, message)
    } else if (error) {
      this.pinoLogger.error({ ...this.buildContext(context), error: String(error) }, message)
    } else {
      this.pinoLogger.error(this.buildContext(context), message)
    }
  }

  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    if (error instanceof Error) {
      this.pinoLogger.fatal({ ...this.buildContext(context), err: error }, message)
    } else if (error) {
      this.pinoLogger.fatal({ ...this.buildContext(context), error: String(error) }, message)
    } else {
      this.pinoLogger.fatal(this.buildContext(context), message)
    }
  }

  // カテゴリ別の構造化ログメソッド
  auth = {
    debug: (message: string, context?: LogContext) =>
      this.debug(message, { ...context, category: 'auth' }),
    info: (message: string, context?: LogContext) =>
      this.info(message, { ...context, category: 'auth' }),
    warn: (message: string, context?: LogContext) =>
      this.warn(message, { ...context, category: 'auth' }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.error(message, error, { ...context, category: 'auth' }),
  }

  api = {
    info: (message: string, context?: LogContext) =>
      this.info(message, { ...context, category: 'api' }),
    warn: (message: string, context?: LogContext) =>
      this.warn(message, { ...context, category: 'api' }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.error(message, error, { ...context, category: 'api' }),
  }

  database = {
    info: (message: string, context?: LogContext) =>
      this.info(message, { ...context, category: 'database' }),
    warn: (message: string, context?: LogContext) =>
      this.warn(message, { ...context, category: 'database' }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.error(message, error, { ...context, category: 'database' }),
  }

  marketData = {
    info: (message: string, context?: LogContext) =>
      this.info(message, { ...context, category: 'market-data' }),
    warn: (message: string, context?: LogContext) =>
      this.warn(message, { ...context, category: 'market-data' }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.error(message, error, { ...context, category: 'market-data' }),
  }

  websocket = {
    info: (message: string, context?: LogContext) =>
      this.info(message, { ...context, category: 'websocket' }),
    warn: (message: string, context?: LogContext) =>
      this.warn(message, { ...context, category: 'websocket' }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.error(message, error, { ...context, category: 'websocket' }),
  }

  security = {
    info: (message: string, context?: LogContext) =>
      this.info(message, { ...context, category: 'security' }),
    warn: (message: string, context?: LogContext) =>
      this.warn(message, { ...context, category: 'security' }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.error(message, error, { ...context, category: 'security' }),
  }

  performance = {
    info: (message: string, context?: LogContext) =>
      this.info(message, { ...context, category: 'performance' }),
    warn: (message: string, context?: LogContext) =>
      this.warn(message, { ...context, category: 'performance' }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.error(message, error, { ...context, category: 'performance' }),
  }

  business = {
    info: (message: string, context?: LogContext) =>
      this.info(message, { ...context, category: 'business' }),
    warn: (message: string, context?: LogContext) =>
      this.warn(message, { ...context, category: 'business' }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.error(message, error, { ...context, category: 'business' }),
  }

  system = {
    info: (message: string, context?: LogContext) =>
      this.info(message, { ...context, category: 'system' }),
    warn: (message: string, context?: LogContext) =>
      this.warn(message, { ...context, category: 'system' }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.error(message, error, { ...context, category: 'system' }),
  }

  audit = {
    info: (message: string, context?: LogContext) =>
      this.info(message, { ...context, category: 'audit' }),
    warn: (message: string, context?: LogContext) =>
      this.warn(message, { ...context, category: 'audit' }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      this.error(message, error, { ...context, category: 'audit' }),
  }

  // リクエストログのヘルパーメソッド
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    const message = `${method} ${url} ${statusCode} - ${duration}ms`

    this[level](message, {
      ...context,
      operation: 'http_request',
      httpStatus: statusCode,
      duration,
    })
  }

  // パフォーマンスログのヘルパーメソッド
  logPerformance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 5000 ? 'warn' : 'info'
    const message = `${operation} completed in ${duration}ms`

    this[level](message, {
      ...context,
      operation,
      duration,
    })
  }

  // 子ロガーの作成（特定のコンポーネント用）
  child(component: string, context?: LogContext): LoggerService {
    const childLogger = new LoggerService()
    childLogger.pinoLogger = this.pinoLogger.child({
      component,
      ...this.buildContext(context),
    })
    return childLogger
  }

  // Raw Pinoロガーにアクセス（必要時のみ）
  getRawLogger(): PinoLogger {
    return this.pinoLogger
  }
}

// デフォルトエクスポート
export const log = LoggerService.getInstance()
